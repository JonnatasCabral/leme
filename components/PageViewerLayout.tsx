import type { ReactNode } from "react";
import HtmlViewer from "@/components/HtmlViewer";
import CopyLink from "@/components/CopyLink";
import CollapsibleSidebar from "@/components/CollapsibleSidebar";
import { formatDate } from "@/lib/utils";

interface ViewerPage {
  id: string;
  title: string;
  description: string | null;
  views_count: number;
  created_at: string;
}

// Layout usado em /s/[token]: o HTML ocupa todo o espaço à esquerda, e uma
// sidebar traz título/ações à direita (pode ser escondida via
// CollapsibleSidebar). O conteúdo da sidebar (comentários etc.) é passado
// por quem usa o layout, via a prop "sidebar". Como esta página já É o
// link compartilhado, mostramos ele pronto pra copiar — nunca um botão que
// gera um link novo.
export default function PageViewerLayout({
  page,
  sourceNote,
  shareUrl,
  sidebar,
}: {
  page: ViewerPage;
  sourceNote: string;
  shareUrl: string;
  sidebar: ReactNode;
}) {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden sm:flex-row">
      <div className="min-h-0 flex-1 bg-white">
        <HtmlViewer src={`/api/file/${page.id}`} title={page.title} fill />
      </div>

      <CollapsibleSidebar
        reopenLabel="Collaborate"
        defaultOpen={false}
        className="flex h-[45vh] w-full flex-col border-t border-ink-100 bg-white sm:h-full sm:w-[380px] sm:shrink-0 sm:border-t-0 sm:border-l"
      >
        <div className="border-b border-ink-100 px-4 py-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Page link
          </p>
          <CopyLink url={shareUrl} />
        </div>

        <div className="border-b border-ink-100 px-4 py-3">
          <h1 className="truncate text-base font-bold text-ink-900">{page.title}</h1>
          {page.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{page.description}</p>
          )}
          <p className="mt-1 text-xs text-ink-400">
            {page.views_count} views · {formatDate(page.created_at)} · {sourceNote}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{sidebar}</div>
      </CollapsibleSidebar>
    </div>
  );
}
