import { cookies } from "next/headers";
import UploadLanding from "@/components/UploadLanding";
import { createSupabaseServerClient } from "@/lib/supabase";
import { isExpired, type EffectivePlan } from "@/lib/plans";
import { ANON_COOKIE_NAME } from "@/lib/anon";
import type { HtmlPage } from "@/lib/types";

// Mesma tela da home, mas sem o redirect automático pro upload mais
// recente — é o destino do botão "+ Novo upload" pra quem já tem uploads.
// Se o usuário (logado ou anônimo) já tiver arquivos salvos e ativos,
// mostramos eles acima do formulário, junto com o mesmo CTA de upgrade
// pra Pro usado em /p/[id] (PlanUpsellCard) quando ele não é Pro.
export default async function NewUploadPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let pages: HtmlPage[] = [];
  let effectivePlan: EffectivePlan = "anonymous";
  if (user) {
    const [{ data: pagesData }, { data: profile }] = await Promise.all([
      supabase
        .from("html_pages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("plan").eq("id", user.id).single(),
    ]);
    pages = pagesData ?? [];
    effectivePlan = profile?.plan ?? "free";
  } else {
    const anonId = cookies().get(ANON_COOKIE_NAME)?.value ?? null;
    if (anonId) {
      const { data } = await supabase
        .from("html_pages")
        .select("*")
        .eq("anon_id", anonId)
        .order("created_at", { ascending: false });
      pages = data ?? [];
    }
  }

  const savedPages = pages.filter((page) => !isExpired(page.expires_at));

  return <UploadLanding savedPages={savedPages} plan={effectivePlan} />;
}
