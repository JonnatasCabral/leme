import Link from "next/link";
import type { HtmlPage } from "@/lib/types";

// Lista de navegação entre os próprios uploads, usada na sidebar de /p/[id]
// — permite pular de um HTML pra outro sem sair da tela de visualização.
// O botão de "novo upload" fica fora deste componente (é um elemento
// próprio da sidebar).
export default function UploadsMenu({
  pages,
  currentPageId,
}: {
  pages: HtmlPage[];
  currentPageId: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
        Your uploads
      </p>

      {pages.length === 0 ? (
        <p className="px-1 text-sm text-ink-500">You don&apos;t have any other uploads yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {pages.map((page) => {
            const isCurrent = page.id === currentPageId;

            return (
              <li key={page.id}>
                <Link
                  href={`/p/${page.id}`}
                  className={`flex flex-col gap-0.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                    isCurrent
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-700 hover:bg-ink-50"
                  }`}
                >
                  <span className="truncate font-medium">{page.title}</span>
                  <span className="truncate text-xs text-ink-400">
                    {page.views_count} views
                    {isCurrent && " · viewing now"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
