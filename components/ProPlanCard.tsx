"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MONTHLY_PRICE = 9;
const YEARLY_PRICE = 90; // ~2 months free compared to paying monthly

type Interval = "month" | "year";

// Card do plano Pro com toggle mensal/anual e checkout de verdade via
// Stripe. Fica de fora do server component da página porque precisa de
// estado (toggle) e de chamar a API de checkout no clique.
export default function ProPlanCard() {
  const router = useRouter();
  const [interval, setInterval] = useState<Interval>("month");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Failed to start checkout.");
        setLoading(false);
        return;
      }

      // Redireciona pro Stripe Checkout (fora do app, precisa ser navegação
      // completa, não client-side routing).
      window.location.href = data.url;
    } catch {
      setError("Connection error while starting checkout.");
      setLoading(false);
    }
  }

  const price = interval === "month" ? MONTHLY_PRICE : YEARLY_PRICE;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ink-900 bg-ink-900 p-6 text-white shadow-card">
      <div>
        <h2 className="text-lg font-bold">Pro</h2>
        <p className="mt-1 text-sm text-ink-300">
          For those who want to keep pages live with no limit.
        </p>
      </div>

      <div className="flex items-center gap-1 rounded-full bg-white/10 p-1 text-xs">
        <button
          type="button"
          onClick={() => setInterval("month")}
          className={`flex-1 rounded-full py-1.5 font-semibold transition-colors ${
            interval === "month" ? "bg-white text-ink-900" : "text-ink-200"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setInterval("year")}
          className={`flex-1 rounded-full py-1.5 font-semibold transition-colors ${
            interval === "year" ? "bg-white text-ink-900" : "text-ink-200"
          }`}
        >
          Yearly
        </button>
      </div>

      <div>
        <p className="text-2xl font-bold">
          ${price}
          <span className="text-sm font-medium text-ink-300">
            /{interval === "month" ? "month" : "year"}
          </span>
        </p>
        {interval === "year" && (
          <p className="text-xs text-brand-300">2 months free vs. paying monthly</p>
        )}
      </div>

      <ul className="flex flex-1 flex-col gap-2 text-sm text-ink-200">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-brand-400">✓</span>
          Unlimited active pages
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-brand-400">✓</span>
          Never expires
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-brand-400">✓</span>
          No watermark
        </li>
      </ul>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <button
        type="button"
        onClick={handleUpgrade}
        disabled={loading}
        className="w-full rounded-full bg-brand-500 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
      >
        {loading ? "Redirecting..." : "Upgrade to Pro"}
      </button>
    </div>
  );
}
