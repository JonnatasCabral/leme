import { NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase";
import { getStripeClient } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/utils";

export const runtime = "nodejs";

// POST /api/billing/portal
// Cria uma sessão do Stripe Billing Portal pra quem já é assinante gerenciar
// método de pagamento, trocar de plano (mensal/anual) ou cancelar.
export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found yet. Upgrade to Pro first." },
        { status: 404 }
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getSiteUrl()}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Error in /api/billing/portal:", err);
    return NextResponse.json(
      { error: "Unexpected error while opening the billing portal." },
      { status: 500 }
    );
  }
}
