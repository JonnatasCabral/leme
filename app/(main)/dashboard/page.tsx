import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";
import { formatDate, formatExpiration, getSiteUrl } from "@/lib/utils";
import { getPlanLimits, isExpired } from "@/lib/plans";
import ShareButton from "@/components/ShareButton";
import ManageBillingButton from "@/components/ManageBillingButton";
import type { HtmlPage, ShareLink } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, current_period_end")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? "free";
  const limits = getPlanLimits(plan);

  const { data: pages } = await supabase
    .from("html_pages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const activePagesCount = (pages ?? []).filter((p: HtmlPage) => !isExpired(p.expires_at)).length;
  const atLimit = limits.maxActivePages !== null && activePagesCount >= limits.maxActivePages;

  const pageIds = (pages ?? []).map((p: HtmlPage) => p.id);

  const { data: shareLinks } = pageIds.length
    ? await supabase
        .from("share_links")
        .select("*")
        .in("page_id", pageIds)
        .order("created_at", { ascending: false })
    : { data: [] as ShareLink[] };

  const latestShareByPage = new Map<string, string>();
  for (const link of shareLinks ?? []) {
    if (!latestShareByPage.has(link.page_id)) {
      latestShareByPage.set(link.page_id, `${getSiteUrl()}/s/${link.token}`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">My dashboard</h1>
        <Link
          href="/new"
          className="rounded-full bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
        >
          + New upload
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-ink-100 bg-ink-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-ink-700 shadow-sm">
            {limits.label}
          </span>
          <span className="text-ink-600">
            {limits.maxActivePages === null
              ? `${activePagesCount} active page(s) · no limit`
              : `${activePagesCount}/${limits.maxActivePages} active pages`}
          </span>
          {plan === "pro" && profile?.current_period_end && (
            <span className="text-xs text-ink-400">
              Renews on {formatDate(profile.current_period_end)}
            </span>
          )}
        </div>
        {plan === "free" ? (
          <Link
            href="/pricing"
            className={`w-fit rounded-full px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
              atLimit
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "bg-white text-ink-700 hover:bg-ink-100"
            }`}
          >
            {atLimit ? "Limit reached — upgrade" : "View Pro plan"}
          </Link>
        ) : (
          <ManageBillingButton />
        )}
      </div>

      {!pages || pages.length === 0 ? (
        <p className="text-sm text-ink-500">
          You haven&apos;t uploaded any HTML yet.{" "}
          <Link href="/" className="font-medium text-brand-600 hover:underline">
            Make your first upload
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pages.map((page: HtmlPage) => {
            const expirationLabel = formatExpiration(page.expires_at);
            const expired = isExpired(page.expires_at);

            return (
              <li
                key={page.id}
                className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/p/${page.id}`}
                    className="font-semibold text-ink-900 hover:text-brand-600"
                  >
                    {page.title}
                  </Link>
                  {page.description && (
                    <p className="mt-0.5 truncate text-sm text-ink-500">
                      {page.description}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-400">
                    <span>
                      {page.views_count} views · uploaded on {formatDate(page.created_at)}
                    </span>
                    {expirationLabel && (
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          expired ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {expirationLabel}
                      </span>
                    )}
                  </p>
                </div>

                <ShareButton pageId={page.id} initialUrl={latestShareByPage.get(page.id)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
