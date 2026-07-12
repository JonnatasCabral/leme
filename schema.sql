-- ============================================================================
-- Leme — schema do banco (Postgres via Supabase)
-- Rode este arquivo inteiro no SQL Editor do Supabase (Dashboard > SQL Editor)
-- ============================================================================

-- Extensão necessária para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================================
-- TABELA: html_pages
-- Cada linha representa um arquivo HTML enviado por um usuário (ou anônimo)
-- ============================================================================
create table if not exists public.html_pages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete set null,
  title        text not null,
  description  text,
  file_path    text not null,
  views_count  integer not null default 0,
  created_at   timestamptz not null default now(),
  -- Plano free/pro: colunas abaixo controlam expiração e identidade anônima.
  expires_at   timestamptz,
  anon_id      text
);

-- Colunas adicionadas depois do lançamento inicial — "add column if not
-- exists" garante que rodar este arquivo de novo em um banco já existente
-- não quebre nada.
alter table public.html_pages add column if not exists expires_at timestamptz;
alter table public.html_pages add column if not exists anon_id text;
alter table public.html_pages add column if not exists expires_at_before_pro timestamptz;

comment on table public.html_pages is 'Arquivos HTML enviados pelos usuários (upload).';
comment on column public.html_pages.file_path is 'Caminho do arquivo no bucket html-files do Supabase Storage.';
comment on column public.html_pages.expires_at is 'Data de expiração da página (null = nunca expira, típico do plano pro).';
comment on column public.html_pages.anon_id is 'Identificador do cookie anônimo, usado para contar uploads de quem não tem conta.';
comment on column public.html_pages.expires_at_before_pro is 'Backup do expires_at que existia antes do usuário virar Pro (ver apply_pro_upgrade/apply_pro_downgrade). Null = página nunca teve expiração suspensa por upgrade, ou já foi restaurada.';

-- ============================================================================
-- TABELA: profiles
-- Um perfil por usuário autenticado, guarda o plano (free/pro).
-- Criado automaticamente via trigger quando um usuário se cadastra.
-- ============================================================================
create table if not exists public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  plan                   text not null default 'free' check (plan in ('free', 'pro')),
  created_at             timestamptz not null default now(),
  -- Assinatura Stripe (plano Pro). Ver lib/stripe.ts e app/api/billing/**.
  stripe_customer_id     text,
  stripe_subscription_id text,
  stripe_price_id        text,
  current_period_end     timestamptz
);

-- Colunas de billing adicionadas depois do lançamento inicial.
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists stripe_price_id text;
alter table public.profiles add column if not exists current_period_end timestamptz;

create unique index if not exists idx_profiles_stripe_customer_id
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

comment on table public.profiles is 'Plano (free/pro) e dados de assinatura Stripe de cada usuário autenticado.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: garante um profile pra quem já tinha conta antes dessa migração.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ============================================================================
-- TABELA: share_links
-- Tokens de compartilhamento vinculados a uma html_page
-- ============================================================================
create table if not exists public.share_links (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.html_pages (id) on delete cascade,
  token       text not null unique,
  created_by  uuid references auth.users (id) on delete set null,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

comment on table public.share_links is 'Links de compartilhamento (token) para uma html_page.';

-- ============================================================================
-- TABELA: contributions
-- Comentários, sugestões ou forks feitos em uma html_page
-- ============================================================================
create table if not exists public.contributions (
  id            uuid primary key default gen_random_uuid(),
  page_id       uuid not null references public.html_pages (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  author_name   text not null default 'Anonymous',
  content       text not null,
  type          text not null default 'comment'
                check (type in ('comment', 'suggestion', 'fork')),
  fork_page_id  uuid references public.html_pages (id) on delete set null,
  created_at    timestamptz not null default now()
);

comment on table public.contributions is 'Contribuições (comentário, sugestão ou fork) em uma html_page.';

-- Mantém o default em sincronia pra quem já rodou este arquivo antes da
-- tradução do app para inglês.
alter table public.contributions alter column author_name set default 'Anonymous';

-- Índices úteis para as queries mais comuns
create index if not exists idx_html_pages_user_id on public.html_pages (user_id);
create index if not exists idx_html_pages_anon_id on public.html_pages (anon_id);
create index if not exists idx_html_pages_expires_at on public.html_pages (expires_at);
create index if not exists idx_share_links_page_id on public.share_links (page_id);
create index if not exists idx_share_links_token on public.share_links (token);
create index if not exists idx_contributions_page_id on public.contributions (page_id);

-- ============================================================================
-- FUNÇÃO: increment_views
-- Incrementa views_count de forma atômica (evita race condition de leitura+escrita)
-- ============================================================================
create or replace function public.increment_views(page_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.html_pages
  set views_count = views_count + 1
  where id = page_id;
end;
$$;

-- ============================================================================
-- FUNÇÕES: apply_pro_upgrade / apply_pro_downgrade
-- Chamadas pelo webhook do Stripe (app/api/billing/webhook) quando o plano
-- de um usuário muda. O plano Pro não tem limite de expiração, mas as
-- páginas que ele já tinha antes de virar Pro tinham um expires_at real —
-- essas funções suspendem/restauram esse valor em vez de perdê-lo.
-- ============================================================================
create or replace function public.apply_pro_upgrade(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Guarda o expires_at atual em expires_at_before_pro e libera a página
  -- (null = nunca expira). Só mexe em páginas que ainda não tinham passado
  -- por isso (expires_at_before_pro is null), pra não sobrescrever o backup
  -- em re-entregas do webhook ou renovações.
  update public.html_pages
  set expires_at_before_pro = expires_at,
      expires_at = null
  where user_id = target_user_id
    and expires_at is not null
    and expires_at_before_pro is null;
end;
$$;

create or replace function public.apply_pro_downgrade(target_user_id uuid, fallback_days integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Restaura o expires_at original de quem já tinha um antes do upgrade.
  update public.html_pages
  set expires_at = expires_at_before_pro,
      expires_at_before_pro = null
  where user_id = target_user_id
    and expires_at_before_pro is not null;

  -- Páginas enviadas *durante* o período Pro nunca tiveram um expires_at
  -- prévio pra restaurar — aplica o prazo padrão do Free a partir de agora.
  update public.html_pages
  set expires_at = now() + (fallback_days || ' days')::interval
  where user_id = target_user_id
    and expires_at_before_pro is null
    and expires_at is null;
end;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.html_pages enable row level security;
alter table public.share_links enable row level security;
alter table public.contributions enable row level security;
alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- html_pages: leitura pública, insert livre (dono ou anônimo),
-- update/delete só pelo dono
-- ---------------------------------------------------------------------------
drop policy if exists "html_pages_select_public" on public.html_pages;
create policy "html_pages_select_public"
  on public.html_pages for select
  using (true);

drop policy if exists "html_pages_insert_any" on public.html_pages;
create policy "html_pages_insert_any"
  on public.html_pages for insert
  with check (
    user_id is null or user_id = auth.uid()
  );

drop policy if exists "html_pages_update_owner" on public.html_pages;
create policy "html_pages_update_owner"
  on public.html_pages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "html_pages_delete_owner" on public.html_pages;
create policy "html_pages_delete_owner"
  on public.html_pages for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- share_links: leitura pública, insert livre
-- ---------------------------------------------------------------------------
drop policy if exists "share_links_select_public" on public.share_links;
create policy "share_links_select_public"
  on public.share_links for select
  using (true);

drop policy if exists "share_links_insert_any" on public.share_links;
create policy "share_links_insert_any"
  on public.share_links for insert
  with check (
    created_by is null or created_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- contributions: leitura pública, insert livre (qualquer um, mesmo anônimo)
-- ---------------------------------------------------------------------------
drop policy if exists "contributions_select_public" on public.contributions;
create policy "contributions_select_public"
  on public.contributions for select
  using (true);

drop policy if exists "contributions_insert_any" on public.contributions;
create policy "contributions_insert_any"
  on public.contributions for insert
  with check (
    user_id is null or user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- profiles: cada usuário só lê o próprio plano. Insert/update ficam a cargo
-- do trigger (security definer) e da service_role key — por enquanto o
-- upgrade pra "pro" é manual (ver SETUP.md), sem cobrança automatizada.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- ============================================================================
-- STORAGE: bucket "html-files"
-- Leitura pública, upload livre, limite de 2MB, mime types text/html e
-- application/octet-stream (necessário pois alguns navegadores/SOs enviam
-- arquivos .html com esse mime type genérico).
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'html-files',
  'html-files',
  true,
  2097152, -- 2MB em bytes
  array['text/html', 'application/octet-stream']
)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['text/html', 'application/octet-stream'];

drop policy if exists "html_files_select_public" on storage.objects;
create policy "html_files_select_public"
  on storage.objects for select
  using (bucket_id = 'html-files');

drop policy if exists "html_files_insert_any" on storage.objects;
create policy "html_files_insert_any"
  on storage.objects for insert
  with check (bucket_id = 'html-files');

drop policy if exists "html_files_update_any" on storage.objects;
create policy "html_files_update_any"
  on storage.objects for update
  using (bucket_id = 'html-files');

drop policy if exists "html_files_delete_any" on storage.objects;
create policy "html_files_delete_any"
  on storage.objects for delete
  using (bucket_id = 'html-files');
