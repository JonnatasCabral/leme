# SETUP — Leme

Guia para configurar o Supabase, as variáveis de ambiente e o deploy na Vercel.

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com), crie uma conta e clique em **New Project**.
2. Escolha nome, senha do banco e região (de preferência próxima dos seus usuários).
3. Aguarde a criação do projeto (leva cerca de 2 minutos).

## 2. Rodar o schema.sql

1. No painel do Supabase, abra **SQL Editor**.
2. Clique em **New query**, cole todo o conteúdo do arquivo `schema.sql` deste repositório e clique em **Run**.
3. Isso cria:
   - As tabelas `html_pages`, `share_links`, `contributions` e `profiles`.
   - Um trigger que cria automaticamente uma linha em `profiles` (plano `free`) sempre que alguém se cadastra.
   - A função `increment_views(page_id uuid)`.
   - Todas as políticas de Row Level Security (RLS).
   - O bucket de Storage `html-files` (público, limite de 2MB, aceitando `text/html` e `application/octet-stream`) e suas políticas.
4. Confirme em **Table Editor** que as 4 tabelas foram criadas, e em **Storage** que o bucket `html-files` existe e está marcado como público.

Se preferir criar o bucket manualmente pela UI em vez de via SQL: vá em **Storage > New bucket**, nome `html-files`, marque **Public bucket**, defina o limite de tamanho para 2MB e restrinja os MIME types a `text/html` e `application/octet-stream`.

## 3. Configurar autenticação

1. Vá em **Authentication > Providers** e confirme que **Email** está habilitado.
2. Em **Authentication > URL Configuration**:
   - **Site URL**: `http://localhost:3000` em desenvolvimento, e a URL da Vercel em produção (ex: `https://leme.vercel.app`).
   - **Redirect URLs**: adicione `http://localhost:3000/auth/callback` e, depois do deploy, `https://SEU-DOMINIO.vercel.app/auth/callback`.
3. Em **Authentication > Email Templates**, os templates padrão já funcionam com o fluxo de callback deste projeto (magic link e confirmação de cadastro apontam para `/auth/callback`).
4. Se quiser testar rapidamente sem configurar SMTP, o Supabase envia emails de teste automaticamente (com limite de envios/hora no plano gratuito).

## 4. Obter as chaves da API

Em **Settings > API**, copie:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponha essa chave no client; ela é usada apenas nas rotas de API do servidor)

## 5. Variáveis de ambiente locais

Copie `.env.local.example` para `.env.local`:

```bash
cp .env.local.example .env.local
```

Preencha com os valores obtidos no passo anterior:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 6. Rodar localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`. Teste o fluxo completo:

1. Envie um `.html` na página inicial — você já é redirecionado direto pra `/p/{id}` com o HTML renderizado em tela cheia.
2. No painel lateral, gere um link de compartilhamento e abra `/s/{token}` em outra aba (ou navegador anônimo).
3. Confirme que dá pra comentar, sugerir e fazer fork por ali.
4. Crie uma conta em `/login`, envie um HTML logado e confira o uso do plano em `/dashboard`.
5. Veja `/pricing` pra comparar os planos.

## 7. Planos (free/pro)

O projeto tem a lógica de limites em `lib/plans.ts`:

- **Sem conta**: 1 página ativa por vez, expira em 2 dias, com marca d'água.
- **Free** (conta criada): 3 páginas ativas ao mesmo tempo, expiram em 30 dias, com marca d'água.
- **Pro**: sem limite de páginas, nunca expira, sem marca d'água. US$ 9/mês ou US$ 90/ano.

A cobrança do Pro é feita via Stripe (assinatura recorrente) — configure na seção 8 abaixo.
Enquanto não configurar o Stripe, dá pra promover alguém pra Pro manualmente
direto no banco, pelo **SQL Editor** do Supabase:

```sql
update public.profiles
set plan = 'pro'
where id = (select id from auth.users where email = 'pessoa@email.com');
```

## 8. Billing (assinatura Pro via Stripe)

### 8.1. Criar a conta Stripe

1. Acesse [dashboard.stripe.com/register](https://dashboard.stripe.com/register) e crie uma conta.
2. Você pode testar tudo em **modo de teste** (toggle "Test mode" no canto superior do Dashboard) antes de ativar pagamentos de verdade — não precisa preencher dados bancários/fiscais só pra testar.

### 8.2. Criar o produto e os preços

1. No Dashboard, vá em **Product catalog > Add product**.
2. Nome: `Leme Pro` (ou o que preferir).
3. Adicione dois preços recorrentes:
   - **Monthly**: US$ 9,00, recorrência mensal.
   - **Yearly**: US$ 90,00, recorrência anual (equivale a ~2 meses grátis frente ao mensal).
4. Salve o produto. Clique em cada preço criado e copie o **Price ID** (começa com `price_...`) — você vai usar os dois em `STRIPE_PRICE_ID_MONTHLY` e `STRIPE_PRICE_ID_YEARLY`.

Se decidir mudar o valor depois, crie um novo Price no Stripe (preços existentes não podem ser editados) e atualize a variável de ambiente correspondente.

### 8.3. Pegar a chave secreta

1. Vá em **Developers > API keys**.
2. Copie a **Secret key** (em modo de teste, começa com `sk_test_...`) → `STRIPE_SECRET_KEY`.
3. Nunca exponha essa chave no client — ela só é usada nas rotas `app/api/billing/**`.

### 8.4. Configurar o webhook

O app escuta eventos de assinatura em `POST /api/billing/webhook` pra manter `profiles.plan` sincronizado com o status real no Stripe.

**Em desenvolvimento**, use a [Stripe CLI](https://docs.stripe.com/stripe-cli):

```bash
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
```

O comando `stripe listen` imprime um `whsec_...` — copie pra `STRIPE_WEBHOOK_SECRET` no `.env.local`.

**Em produção** (depois do deploy na Vercel):

1. Vá em **Developers > Webhooks > Add endpoint**.
2. URL: `https://SEU-DOMINIO.vercel.app/api/billing/webhook`.
3. Eventos a escutar: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
4. Depois de criar, copie o **Signing secret** do endpoint → `STRIPE_WEBHOOK_SECRET` nas variáveis de ambiente da Vercel.

### 8.5. Variáveis de ambiente

Adicione ao `.env.local` (e depois nas Environment Variables da Vercel):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
```

### 8.6. Testar

1. Rode `stripe listen --forward-to localhost:3000/api/billing/webhook` numa aba do terminal.
2. Em outra aba, `npm run dev`.
3. Crie uma conta, vá em `/pricing`, clique em **Upgrade to Pro**.
4. No Checkout do Stripe (modo de teste), use o cartão `4242 4242 4242 4242`, qualquer data futura e CVC.
5. Depois de pagar, você volta pro `/dashboard` já como Pro (o webhook `checkout.session.completed` faz essa atualização).
6. Teste também **Manage billing** no dashboard — abre o Billing Portal do Stripe, onde dá pra cancelar/trocar de plano. Cancele e confirme que `profiles.plan` volta pra `free` (via evento `customer.subscription.deleted` ou `updated`).

## 9. Deploy na Vercel e domínio próprio

O repositório Git local já está inicializado (`git init` + primeiro commit em `master`).
Falta: subir pro GitHub, importar na Vercel, e depois comprar/conectar o domínio.

### 9.1. Subir o código pro GitHub

1. Crie um repositório vazio em [github.com/new](https://github.com/new) (não marque "Add a README" — o repositório local já tem arquivos).
2. No terminal, dentro da pasta do projeto:

```bash
git remote add origin https://github.com/SEU-USUARIO/leme.git
git push -u origin master
```

(Se preferir o nome `main` em vez de `master`, rode `git branch -m main` antes do push.)

### 9.2. Importar na Vercel

1. Em [vercel.com/new](https://vercel.com/new), conecte sua conta do GitHub e importe o repositório `leme`.
2. Em **Environment Variables**, adicione todas as variáveis do `.env.local` (Supabase + Stripe). Deixe `NEXT_PUBLIC_SITE_URL` como `https://leme.vercel.app` por enquanto — ajusta depois que o domínio próprio estiver ativo.
3. Clique em **Deploy**. Em ~1 minuto o site fica no ar em `https://SEU-PROJETO.vercel.app`.
4. Volte no Supabase (**Authentication > URL Configuration**) e adicione essa URL em **Site URL** e **Redirect URLs** (`.../auth/callback`).

### 9.3. Comprar o domínio

Duas opções:

- **Comprar direto pela Vercel** (mais simples): no projeto, vá em **Settings > Domains**, digite o nome desejado e, se estiver disponível, a Vercel oferece comprar ali mesmo — o DNS já vem configurado automaticamente, sem passo manual.
- **Comprar num registrador** (Registro.br, Namecheap, GoDaddy, Cloudflare Registrar, etc.) e depois apontar pra Vercel manualmente (passo 9.4). Costuma ser mais barato pra domínios `.com.br`.

Algumas sugestões de nome pra variar, já que "Leme" é curto — verifique disponibilidade na hora de comprar: `useleme.com`, `leme.app`, `getleme.com`, `leme.sh`, `leme.io`, `meuleme.com`. Domínios `.app` e `.dev` exigem HTTPS (o que a Vercel já garante de graça).

### 9.4. Conectar o domínio na Vercel

1. No projeto, **Settings > Domains > Add**, digite o domínio comprado.
2. Se comprou fora da Vercel, ela mostra os registros DNS pra criar no painel do seu registrador:
   - Domínio raiz (`leme.com`): registro **A** apontando pro IP que a Vercel mostrar.
   - Subdomínio `www`: registro **CNAME** apontando pra `cname.vercel-dns.com`.
3. Espera propagar (de minutos a algumas horas). A Vercel confirma automaticamente quando detectar o DNS certo, e já emite o certificado HTTPS.

### 9.5. Depois que o domínio estiver ativo

1. Na Vercel, atualize `NEXT_PUBLIC_SITE_URL` pra `https://SEU-DOMINIO.com` e faça um redeploy (Settings > Environment Variables, depois Deployments > ... > Redeploy).
2. No Supabase (**Authentication > URL Configuration**), troque **Site URL** e adicione o novo **Redirect URL** (`https://SEU-DOMINIO.com/auth/callback`).
3. No Stripe (seção 8.4), configure o webhook de produção apontando pro domínio final (não o `.vercel.app`) e atualize `STRIPE_WEBHOOK_SECRET` na Vercel com o signing secret desse endpoint.
4. Redeploy mais uma vez depois de ajustar essas variáveis.

## Estrutura de pastas

```
app/
  layout.tsx                     -> layout raiz, sem Navbar (usado por /s e /p)
  (main)/                        -> grupo de rotas com Navbar (URLs não mudam)
    layout.tsx                   -> injeta o Navbar
    page.tsx                     -> landing page com upload
    pricing/page.tsx             -> comparação Free vs Pro
    login/page.tsx               -> autenticação (magic link ou email/senha)
    dashboard/page.tsx           -> uploads do usuário, uso do plano
    auth/callback/route.ts       -> troca code por sessão
    auth/signout/route.ts        -> logout
    auth/auth-code-error/page.tsx -> erro de confirmação
  s/[token]/page.tsx             -> visualização fullscreen via link compartilhado
  p/[id]/page.tsx                -> página pública fullscreen, direto pelo id
  api/upload/route.ts            -> POST upload de HTML (aplica limite do plano)
  api/share/route.ts             -> POST gera link de compartilhamento
  api/page/[token]/route.ts      -> GET resolve token + incrementa views
  api/file/[id]/route.ts         -> GET serve o HTML (marca d'água + expiração)
  api/contribute/route.ts        -> POST comentário/sugestão/fork
  api/billing/checkout/route.ts  -> POST cria Stripe Checkout Session
  api/billing/portal/route.ts    -> POST cria sessão do Billing Portal
  api/billing/webhook/route.ts   -> POST recebe eventos do Stripe
components/
  Navbar.tsx
  UploadForm.tsx
  ShareButton.tsx
  CopyLink.tsx                   -> input + botão de copiar (reaproveitado)
  HtmlViewer.tsx                 -> iframe sandbox (modo fullscreen opcional)
  ContributionsPanel.tsx
  PageViewerLayout.tsx           -> layout split-screen de /s
  ExpiredNotice.tsx
  UploadsMenu.tsx                -> lista de uploads na sidebar de /p
  ProPlanCard.tsx                 -> card do plano Pro com toggle mensal/anual + checkout
  ManageBillingButton.tsx        -> abre o Billing Portal do Stripe
lib/
  supabase.ts                    -> clients server/admin
  supabase-browser.ts            -> client de browser (client components)
  stripe.ts                      -> client Stripe + Price IDs por periodicidade
  types.ts                       -> interfaces das 4 tabelas
  plans.ts                       -> limites de cada plano (anonymous/free/pro)
  anon.ts                        -> identidade anônima (cookie) pra contar uploads sem login
  utils.ts
middleware.ts                    -> refresh de sessão Supabase
schema.sql                       -> tabelas, RLS, função, trigger de profiles e bucket
```

## Notas de segurança

- O iframe em `HtmlViewer` usa `sandbox="allow-scripts allow-forms allow-popups allow-modals"` — sem `allow-same-origin`, o que impede o HTML de terceiros de acessar cookies/localStorage do seu domínio.
- A `service_role key` só é usada em Route Handlers (`app/api/**`), nunca em código que roda no browser. O mesmo vale pra `STRIPE_SECRET_KEY`.
- As políticas de RLS permitem leitura e escrita públicas nas tabelas (por design, já que qualquer um pode contribuir sem login), mas `update`/`delete` de `html_pages` são restritos ao dono (`user_id = auth.uid()`), e `profiles` só pode ser lida pelo próprio usuário.
- O cookie `ai_html_anon_id` (setado por `/api/upload`) é só um identificador técnico opaco pra contar uploads de quem não tem conta — não guarda nenhum dado pessoal.
- `/api/billing/webhook` verifica a assinatura HMAC de cada request (`stripe-signature` + `STRIPE_WEBHOOK_SECRET`) antes de processar qualquer evento — sem isso, qualquer um poderia forjar um "pagamento confirmado".
