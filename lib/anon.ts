import { nanoid } from "nanoid";

export const ANON_COOKIE_NAME = "ai_html_anon_id";
export const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

/**
 * Identidade anônima usada só para contar quantas páginas ativas alguém sem
 * conta já tem (limite do plano "anonymous" em lib/plans.ts). Não tem
 * nenhuma relação com autenticação — é só um cookie técnico opaco.
 */
export function generateAnonId(): string {
  return nanoid(21);
}
