import Stripe from "stripe";

/**
 * Client do Stripe, criado sob demanda (não no topo do módulo) pra não
 * quebrar o build/outras rotas quando STRIPE_SECRET_KEY ainda não estiver
 * configurada (ex: antes de terminar o setup em SETUP.md).
 */
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurada. Veja a seção de Billing no SETUP.md."
    );
  }

  return new Stripe(secretKey);
}

export type BillingInterval = "month" | "year";

/** IDs de Price configurados no Dashboard do Stripe (ver SETUP.md). */
export function getStripePriceId(interval: BillingInterval): string {
  const priceId =
    interval === "year"
      ? process.env.STRIPE_PRICE_ID_YEARLY
      : process.env.STRIPE_PRICE_ID_MONTHLY;

  if (!priceId) {
    throw new Error(
      `STRIPE_PRICE_ID_${interval === "year" ? "YEARLY" : "MONTHLY"} não configurada.`
    );
  }

  return priceId;
}
