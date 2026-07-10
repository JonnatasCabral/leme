"use client";

import { useState } from "react";

// Mostra uma URL somente-leitura com um botão de copiar. Usado sempre que
// já sabemos o link (não precisa gerar nada), como em /s/[token] — a
// própria página já É o link, então só faz sentido copiá-lo.
export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-ink-200 bg-ink-50 p-1 pl-3">
      <input
        readOnly
        value={url}
        className="w-40 truncate bg-transparent text-xs text-ink-700 outline-none sm:w-56"
      />
      <button
        onClick={copy}
        type="button"
        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm hover:bg-ink-100"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
