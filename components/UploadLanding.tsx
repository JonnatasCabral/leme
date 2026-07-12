import UploadForm from "@/components/UploadForm";
import Link from "next/link";
import PlanUpsellCard from "@/components/PlanUpsellCard";
import { formatDate } from "@/lib/utils";
import type { EffectivePlan } from "@/lib/plans";
import type { HtmlPage } from "@/lib/types";

// Tela enxuta, sem discurso de venda — quem chegou aqui já decidiu que
// quer subir um arquivo. O foco é só o formulário. Se o usuário já tiver
// arquivos salvos (savedPages), mostramos eles acima do formulário, pra
// não parecer que a tela está vazia quando na verdade ele já tem algo.
// Pra quem não é Pro, mostramos o mesmo CTA de upgrade usado em /p/[id].
export default function UploadLanding({
  savedPages = [],
  plan = "anonymous",
}: {
  savedPages?: HtmlPage[];
  plan?: EffectivePlan;
}) {
  return (
    <div className="bg-white">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
        <h1 className="text-center text-2xl font-bold tracking-tight text-ink-900">
          Upload your HTML
        </h1>

        {savedPages.length > 0 && (
          <div className="flex flex-col gap-2 rounded-2xl border border-ink-100 bg-ink-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              Your saved file{savedPages.length > 1 ? "s" : ""}
            </p>
            <ul className="flex flex-col gap-1">
              {savedPages.map((page) => (
                <li key={page.id}>
                  <Link
                    href={`/p/${page.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-sm transition-colors hover:bg-ink-50"
                  >
                    <span className="truncate font-medium text-ink-900">{page.title}</span>
                    <span className="shrink-0 text-xs text-ink-400">
                      {formatDate(page.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <PlanUpsellCard plan={plan} activePagesCount={savedPages.length} />

        <UploadForm />

        <p className="text-center text-xs text-ink-400">
          No account? No problem — your upload stays saved in this browser,
          access it later at{" "}
          <Link href="/mine" className="font-medium text-brand-600 hover:underline">
            My uploads
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
