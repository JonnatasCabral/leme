import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { getStripeClient } from "@/lib/stripe";
import { getPlanLimits } from "@/lib/plans";

export const runtime = "nodejs";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

function isActiveStatus(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing";
}

// Suspende o expires_at das páginas que o usuário já tinha (guardando o
// valor original em expires_at_before_pro) — ver apply_pro_upgrade no
// schema.sql. Idempotente: reentregas do webhook não sobrescrevem o backup.
async function applyProUpgrade(admin: SupabaseAdmin, userId: string) {
  const { error } = await admin.rpc("apply_pro_upgrade", { target_user_id: userId });
  if (error) console.error("apply_pro_upgrade failed:", error);
}

// Restaura o expires_at original de quem tinha (ou aplica o prazo padrão do
// Free, a partir de agora, pra páginas enviadas durante o período Pro que
// nunca tiveram uma expiração prévia) — ver apply_pro_downgrade no schema.sql.
async function applyProDowngrade(admin: SupabaseAdmin, userId: string) {
  const { retentionDays } = getPlanLimits("free");
  const { error } = await admin.rpc("apply_pro_downgrade", {
    target_user_id: userId,
    fallback_days: retentionDays ?? 30,
  });
  if (error) console.error("apply_pro_downgrade failed:", error);
}

async function getUserIdByCustomerId(
  admin: SupabaseAdmin,
  customerId: string
): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data?.id ?? null;
}

// POST /api/billing/webhook
// Endpoint que o Stripe chama quando algo muda numa assinatura. Precisa do
// corpo bruto (não JSON parseado) pra verificar a assinatura HMAC — ver
// STRIPE_WEBHOOK_SECRET no SETUP.md. Mantém profiles.plan sincronizado com
// o status real da assinatura no Stripe, e também aplica/reverte a
// suspensão de expiração das páginas existentes (applyProUpgrade/Downgrade)
// sempre que o plano efetivo muda de/para "pro".
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

          await applyProUpgrade(admin, userId);
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
        const active = isActiveStatus(subscription.status);

        await admin
          .from("profiles")
          .update({
            plan: active ? "pro" : "free",
            stripe_subscription_id: subscription.id,
            stripe_price_id: item?.price.id ?? null,
            current_period_end: item
              ? new Date(item.current_period_end * 1000).toISOString()
              : null,
          })
          .eq("stripe_customer_id", customerId);

        const userId = await getUserIdByCustomerId(admin, customerId);
        if (userId) {
          if (active) await applyProUpgrade(admin, userId);
          else await applyProDowngrade(admin, userId);
        }
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

        const userId = await getUserIdByCustomerId(admin, customerId);

        await admin
          .from("profiles")
          .update({
            plan: "free",
            stripe_subscription_id: null,
            stripe_price_id: null,
            current_period_end: null,
          })
          .eq("stripe_customer_id", customerId);

        if (userId) await applyProDowngrade(admin, userId);
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
