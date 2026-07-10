import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import HtmlViewer from "@/components/HtmlViewer";
import ShareButton from "@/components/ShareButton";
import ExpiredNotice from "@/components/ExpiredNotice";
import UploadsMenu from "@/components/UploadsMenu";
import { createSupabaseServerClient } from "@/lib/supabase";
import { isExpired } from "@/lib/plans";
import { ANON_COOKIE_NAME } from "@/lib/anon";
import type { HtmlPage } from "@/lib/types";

// Acesso público direto pelo id, sem precisar de um token de compartilhamento.
// Diferente de /s/[token], esta página vive dentro do grupo (main) — ou
// seja, aparece com o Navbar normal do site. A sidebar aqui é enxuta:
// só compartilhar, a lista dos próprios uploads e um botão de novo upload.
export default async function PublicPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: page, error } = await supabase
    .from("html_pages")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !page) {
    notFound();
  }

  if (isExpired(page.expires_at)) {
    return <ExpiredNotice />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const anonId = cookies().get(ANON_COOKIE_NAME)?.value ?? null;

  let ownPages: HtmlPage[] = [];
  if (user) {
    const { data } = await supabase
      .from("html_pages")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    ownPages = data ?? [];
  } else if (anonId) {
    const { data } = await supabase
      .from("html_pages")
      .select("*")
      .eq("anon_id", anonId)
      .order("created_at", { ascending: false });
    ownPages = data ?? [];
  }

  const availablePages = ownPages.filter((p) => !isExpired(p.expires_at));

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden sm:flex-row">
      <div className="min-h-0 flex-1 bg-white">
        <HtmlViewer src={`/api/file/${page.id}`} title={page.title} fill />
      </div>

      <aside className="flex h-[45vh] w-full flex-col border-t border-ink-100 bg-white sm:h-full sm:w-[320px] sm:shrink-0 sm:border-t-0 sm:border-l">
        <div className="border-b border-ink-100 p-4">
          <ShareButton pageId={page.id} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <UploadsMenu pages={availablePages} currentPageId={page.id} />
        </div>

        <div className="border-t border-ink-100 p-4">
          <Link
            href="/new"
            className="flex w-full items-center justify-center rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            + New upload
          </Link>
        </div>
      </aside>
    </div>
  );
}
