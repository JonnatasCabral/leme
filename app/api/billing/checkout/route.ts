import { NextResponse } from "next/server";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase";
import { getStripeClient, getStripePriceId, type BillingInterval } from "@/lib/stripe";
import { getSiteUrl } from "@/lib/utils";

export const runtime = "nodejs";

// POST /api/billing/checkout
// Body: { interval: "month" | "year" }
// Cria (ou reaproveita) o Stripe Customer do usuário logado e devolve a URL
// de uma Checkout Session de assinatura. Requer login — sem conta não dá
// pra amarrar uma assinatura de forma confiável.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const interval: BillingInterval = body?.interval === "year" ? "year" : "month";

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign in to upgrade to Pro." },
        { status: 401 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const stripe = getStripeClient();
    const siteUrl = getSiteUrl();

    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await admin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: getStripePriceId(interval), quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${siteUrl}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Error in /api/billing/checkout:", err);
    return NextResponse.json(
      { error: "Unexpected error while starting checkout." },
      { status: 500 }
    );
  }
}
