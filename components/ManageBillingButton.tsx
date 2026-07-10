"use client";

import { useState } from "react";

// Abre o Stripe Billing Portal, onde quem assina o Pro pode trocar cartão,
// mudar de mensal pra anual (ou vice-versa) ou cancelar a assinatura.
export default function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Failed to open billing portal.");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Connection error while opening billing portal.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={openPortal}
        disabled={loading}
        className="w-fit rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-ink-700 shadow-sm transition-colors hover:bg-ink-100 disabled:opacity-50"
      >
        {loading ? "Opening..." : "Manage billing"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
