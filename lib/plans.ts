import type { Plan } from "./types";

// "anonymous" não é um valor gravado no banco (profiles.plan só tem
// free/pro) — é o estado de quem usa o site sem criar conta. Tratamos como
// um plano ainda mais limitado que o free.
export type EffectivePlan = "anonymous" | Plan;

export interface PlanLimits {
  /** Quantidade de páginas ativas (não expiradas) permitidas ao mesmo tempo. null = sem limite. */
  maxActivePages: number | null;
  /** Depois de quantos dias a página expira. null = nunca expira. */
  retentionDays: number | null;
  /** Se true, injeta o rodapé "made with Leme" no HTML servido. */
  watermark: boolean;
  label: string;
}

export const PLAN_LIMITS: Record<EffectivePlan, PlanLimits> = {
  anonymous: {
    maxActivePages: 1,
    retentionDays: 2,
    watermark: true,
    label: "Anonymous",
  },
  free: {
    maxActivePages: 3,
    retentionDays: 30,
    watermark: true,
    label: "Free",
  },
  pro: {
    maxActivePages: null,
    retentionDays: null,
    watermark: false,
    label: "Pro",
  },
};

export function getPlanLimits(plan: EffectivePlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/** Calcula o expires_at (ISO string) a partir de hoje, ou null se o plano não expira. */
export function computeExpiresAt(plan: EffectivePlan): string | null {
  const { retentionDays } = getPlanLimits(plan);
  if (retentionDays === null) return null;

  const expires = new Date();
  expires.setDate(expires.getDate() + retentionDays);
  return expires.toISOString();
}

export function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}
