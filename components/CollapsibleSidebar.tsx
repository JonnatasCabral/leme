"use client";

import { useState, type ReactNode } from "react";

// Wrapper de <aside> com um botão pra esconder/mostrar a barra lateral.
// Usado em /p/[id] e /s/[token], que têm um viewer de HTML ocupando o
// espaço principal e uma sidebar fixa ao lado — esconder a sidebar dá
// mais espaço pro conteúdo. "reopenLabel" customiza o botão flutuante de
// reabrir (ex: "Collaborate" em /s, ícone genérico por padrão em /p).
export default function CollapsibleSidebar({
  children,
  className = "",
  reopenLabel,
  defaultOpen = true,
}: {
  children: ReactNode;
  className?: string;
  reopenLabel?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={reopenLabel ?? "Show sidebar"}
        className={
          reopenLabel
            ? "fixed bottom-4 right-4 z-20 flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-600"
            : "fixed bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500 shadow-md transition-colors hover:bg-ink-50"
        }
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path
            d="M4 10h12M10 4v12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {reopenLabel}
      </button>
    );
  }

  return (
    <aside className={className}>
      <div className="flex h-10 shrink-0 items-center justify-end border-b border-ink-100 px-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide sidebar"
          className="flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-600 shadow-sm transition-colors hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Hide
        </button>
      </div>
      {children}
    </aside>
  );
}
