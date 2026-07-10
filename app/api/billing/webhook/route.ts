import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

function isActiveStatus(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}

// POST /api/billing/webhook
// Endpoint que o Stripe chama quando algo muda numa assinatura. Precisa do
// corpo bruto (não JSON parseado) pra verificar a assinatura HMAC — ver
// STRIPE_WEBHOOK_SECRET no SETUP.md. Mantém profiles.plan sincronizado com
// o status real da assinatura no Stripe.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing webhook signature or secret." },
      { status: 400 }
    );
  }

  const payload = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Invalid Stripe webhook signature:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    switch (event.type) {
      // Primeiro pagamento concluído: liga o customer/subscription do
      // Stripe ao usuário do Supabase (via client_reference_id) e libera o Pro.
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const userId = session.client_reference_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (userId && customerId) {
          await admin
            .from("profiles")
            .update({
              plan: "pro",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId ?? null,
            })
            .eq("id", userId);
        }
        break;
      }

      // Qualquer mudança de status (renovou, atrasou pagamento, trocou de
      // preço) mantém profiles.plan em sincronia com o status real.
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const item = subscription.items.data[0];

        await admin
          .from("profiles")
          .update({
            plan: isActiveStatus(subscription.status) ? "pro" : "free",
            stripe_subscription_id: subscription.id,
            stripe_price_id: item?.price.id ?? null,
            current_period_end: item
              ? new Date(item.current_period_end * 1000).toISOString()
              : null,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      // Assinatura cancelada de vez (fim do período, ou cancelamento
      // imediato) — volta pro plano free.
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        await admin
          .from("profiles")
          .update({
            plan: "free",
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_end: null,
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling Stripe webhook event ${event.type}:`, err);
    return NextResponse.json({ error: "Failed to process event." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
