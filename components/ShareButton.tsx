"use client";

import { useState } from "react";
import CopyLink from "@/components/CopyLink";

export default function ShareButton({
  pageId,
  initialUrl,
}: {
  pageId: string;
  initialUrl?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);

    try {
      // A rota já devolve o link existente se a página tiver um — nunca
      // cria um segundo link pra mesma página.
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to generate link.");
        return;
      }

      setUrl(data.url);
    } catch {
      setError("Connection error while generating the link.");
    } finally {
      setLoading(false);
    }
  }

  if (url) {
    return <CopyLink url={url} />;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={generate}
        disabled={loading}
        type="button"
        className="rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Share"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
