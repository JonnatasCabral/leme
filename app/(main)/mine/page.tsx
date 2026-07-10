import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";
import { formatDate, formatExpiration, getSiteUrl } from "@/lib/utils";
import { getPlanLimits, isExpired } from "@/lib/plans";
import { ANON_COOKIE_NAME } from "@/lib/anon";
import ShareButton from "@/components/ShareButton";
import type { HtmlPage, ShareLink } from "@/lib/types";

// Uploads feitos sem conta não aparecem em lugar nenhum a não ser que a
// gente lembre deles pelo navegador: guardamos um cookie técnico
// (ai_html_anon_id, ver lib/anon.ts) em cada upload anônimo e usamos ele
// aqui pra listar só as páginas enviadas *neste* navegador.
export default async function MinePage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Quem já tem conta usa o /dashboard normal (que puxa do banco por user_id).
  if (user) {
    redirect("/dashboard");
  }

  const anonId = cookies().get(ANON_COOKIE_NAME)?.value ?? null;
  const limits = getPlanLimits("anonymous");

  const { data: pages } = anonId
    ? await supabase
        .from("html_pages")
        .select("*")
        .eq("anon_id", anonId)
        .order("created_at", { ascending: false })
    : { data: [] as HtmlPage[] };

  const activePagesCount = (pages ?? []).filter((p: HtmlPage) => !isExpired(p.expires_at)).length;

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
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">My uploads</h1>
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
            No account
          </span>
          <span className="text-ink-600">
            {activePagesCount}/{limits.maxActivePages} active page(s) in this browser
          </span>
        </div>
        <Link
          href="/login"
          className="w-fit rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-ink-700 shadow-sm transition-colors hover:bg-ink-100"
        >
          Create a free account for more space
        </Link>
      </div>

      {!anonId || !pages || pages.length === 0 ? (
        <p className="text-sm text-ink-500">
          No uploads saved in this browser yet.{" "}
          <Link href="/" className="font-medium text-brand-600 hover:underline">
            Upload your first HTML
          </Link>
          .
        </p>
      ) : (
        <>
          <p className="mb-4 text-xs text-ink-400">
            This list is saved in this browser&apos;s cookie — if you clear the
            site&apos;s data or switch devices, it&apos;s gone.{" "}
            <Link href="/login" className="text-brand-600 hover:underline">
              Create an account
            </Link>{" "}
            so you don&apos;t lose your uploads.
          </p>
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
        </>
      )}
    </div>
  );
}
