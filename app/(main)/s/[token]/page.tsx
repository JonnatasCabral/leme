import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PageViewerLayout from "@/components/PageViewerLayout";
import ExpiredNotice from "@/components/ExpiredNotice";
import ContributionsPanel from "@/components/ContributionsPanel";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getPublicFileUrl, getSiteUrl } from "@/lib/utils";
import type { Contribution, PageByTokenResponse } from "@/lib/types";

interface TokenLookupResult {
  status: "ok" | "expired" | "not_found";
  data: PageByTokenResponse | null;
}

async function getPageByToken(token: string): Promise<TokenLookupResult> {
  const h = headers();
  const host = h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");

  const res = await fetch(`${protocol}://${host}/api/page/${token}`, {
    cache: "no-store",
  });

  if (res.status === 410) return { status: "expired", data: null };
  if (!res.ok) return { status: "not_found", data: null };
  return { status: "ok", data: await res.json() };
}

export default async function SharedPage({ params }: { params: { token: string } }) {
  const result = await getPageByToken(params.token);

  if (result.status === "expired") {
    return <ExpiredNotice />;
  }
  if (result.status === "not_found" || !result.data) {
    notFound();
  }

  const { page } = result.data;
  const fileUrl = getPublicFileUrl(page.file_path);

  const supabase = createSupabaseServerClient();
  const { data: contributions } = await supabase
    .from("contributions")
    .select("*")
    .eq("page_id", page.id)
    .order("created_at", { ascending: false });

  let pageHtml = "";
  try {
    const htmlRes = await fetch(fileUrl, { cache: "no-store" });
    if (htmlRes.ok) pageHtml = await htmlRes.text();
  } catch {
    // Se falhar ao buscar o HTML original, o editor de fork começa vazio.
  }

  return (
    <PageViewerLayout
      page={page}
      sourceNote="via shared link"
      shareUrl={`${getSiteUrl()}/s/${params.token}`}
      sidebar={
        <ContributionsPanel
          pageId={page.id}
          pageTitle={page.title}
          pageHtml={pageHtml}
          initialContributions={(contributions ?? []) as Contribution[]}
        />
      }
    />
  );
}
