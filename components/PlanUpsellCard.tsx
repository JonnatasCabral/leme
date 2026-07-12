import Link from "next/link";
import { getPlanLimits, type EffectivePlan } from "@/lib/plans";

// CTA compacto pra sidebar de /p/[id]: sinaliza pra quem não é Pro que
// existe um limite de páginas ativas, puxando pra /pricing. Não renderiza
// nada pro plano Pro (sem limite, não faz sentido mostrar).
export default function PlanUpsellCard({
  plan,
  activePagesCount,
}: {
  plan: EffectivePlan;
  activePagesCount: number;
}) {
  const limits = getPlanLimits(plan);
  if (limits.maxActivePages === null) return null;

  const atLimit = activePagesCount >= limits.maxActivePages;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-ink-900 bg-ink-900 p-4 text-white shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">
        {limits.label} plan
      </p>
      <p className="text-sm text-ink-100">
        {atLimit
          ? `You've reached your limit of ${limits.maxActivePages} active page${
              limits.maxActivePages === 1 ? "" : "s"
            }.`
          : `${activePagesCount}/${limits.maxActivePages} active pages used.`}{" "}
        Pro removes the limit, drops the watermark, and pages never expire.
      </p>
      <Link
        href="/pricing"
        className="mt-1 w-full rounded-full bg-brand-500 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
