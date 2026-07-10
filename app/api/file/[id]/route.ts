import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { getPlanLimits, isExpired, type EffectivePlan } from "@/lib/plans";
import { getSiteUrl } from "@/lib/utils";

export const runtime = "nodejs";

function expiredHtml(): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>Page expired</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#18181c;">
  <div style="text-align:center;">
    <p style="font-size:18px;font-weight:700;margin:0 0 8px;">This page has expired</p>
    <p style="font-size:14px;color:#6b6b76;margin:0;">The author's plan limits how long this page stays live.</p>
  </div>
</body></html>`;
}

// Injeta um selo discreto "made with Leme" antes de </body> (ou no final
// do arquivo, se não houver esse fechamento). Só é aplicado a páginas de
// planos com marca d'água habilitada (ver lib/plans.ts).
function injectWatermark(html: string): string {
  const siteUrl = getSiteUrl();
  const badge = `
<div style="position:fixed;bottom:12px;right:12px;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <a href="${siteUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:6px;background:#111827;color:#fff;padding:6px 12px;border-radius:9999px;font-size:12px;font-weight:600;text-decoration:none;box-shadow:0 4px 12px rgba(0,0,0,.18);">
    <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#ff6a00;border-radius:9999px;">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" stroke="#fff" stroke-width="2.4"/>
        <circle cx="12" cy="12" r="2.5" stroke="#fff" stroke-width="2.4"/>
        <line x1="12" y1="4" x2="12" y2="20" stroke="#fff" stroke-width="2.4"/>
        <line x1="4" y1="12" x2="20" y2="12" stroke="#fff" stroke-width="2.4"/>
      </svg>
    </span>
    made with Leme
  </a>
</div>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${badge}\n</body>`);
  }
  return `${html}\n${badge}`;
}

// GET /api/file/[id]
// Serve o conteúdo HTML de uma html_page com Content-Type "text/html"
// garantido (evita depender do MIME type devolvido pelo Supabase Storage).
// Também aplica as regras do plano do dono: bloqueia páginas expiradas e
// injeta a marca d'água quando o plano não é "pro".
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const admin = createSupabaseAdminClient();

  const { data: page, error: pageError } = await admin
    .from("html_pages")
    .select("file_path, user_id, anon_id, expires_at")
    .eq("id", params.id)
    .single();

  if (pageError || !page) {
    return new NextResponse("Page not found.", { status: 404 });
  }

  if (isExpired(page.expires_at)) {
    return new NextResponse(expiredHtml(), {
      status: 410,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const { data: file, error: downloadError } = await admin.storage
    .from("html-files")
    .download(page.file_path);

  if (downloadError || !file) {
    return new NextResponse("File not found.", { status: 404 });
  }

  // Descobre o plano do dono da página pra saber se aplica marca d'água.
  let plan: EffectivePlan = "anonymous";
  if (page.user_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", page.user_id)
      .single();
    plan = profile?.plan ?? "free";
  }

  let html = await file.text();
  if (getPlanLimits(plan).watermark) {
    html = injectWatermark(html);
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
