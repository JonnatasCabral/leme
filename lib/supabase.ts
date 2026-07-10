import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client para uso em Server Components, Route Handlers e Server Actions.
 * Lê/escreve cookies de sessão via next/headers, respeitando RLS.
 * Precisa ser chamado dentro de um contexto de request (não usar em módulo top-level).
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Chamado a partir de um Server Component (sem permissão de escrita).
          // Pode ser ignorado com segurança se o middleware já cuida do refresh de sessão.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Idem ao caso acima.
        }
      },
    },
  });
}

/**
 * Client "admin" com a service_role key — ignora RLS completamente.
 * NUNCA importe este arquivo em código que roda no browser.
 * Use apenas em Route Handlers (app/api/**) para operações privilegiadas
 * (ex: upload de arquivo, escrita administrativa).
 */
export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY not configured. Set this environment variable on the server."
    );
  }

  return createClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
