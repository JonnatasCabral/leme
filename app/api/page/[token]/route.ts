import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { isExpired } from "@/lib/plans";

export const runtime = "nodejs";

// GET /api/page/[token]
// Resolve um token de compartilhamento, retorna os dados da página
// (título, descrição, file_path etc.) e incrementa views_count.
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: shareLink, error: shareLinkError } = await admin
    .from("share_links")
    .select("id, token, expires_at, page_id")
    .eq("token", token)
    .single();

  if (shareLinkError || !shareLink) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });
  }

  const { data: page, error: pageError } = await admin
    .from("html_pages")
    .select("id, title, description, file_path, views_count, created_at, expires_at")
    .eq("id", shareLink.page_id)
    .single();

  if (pageError || !page) {
    return NextResponse.json({ error: "Page not found." }, { status: 404 });
  }

  if (isExpired(page.expires_at)) {
    return NextResponse.json({ error: "This page has expired." }, { status: 410 });
  }

  // Incrementa views_count de forma atômica via função SQL.
  await admin.rpc("increment_views", { page_id: page.id });

  return NextResponse.json({
    page: { ...page, views_count: page.views_count + 1 },
    shareLink: {
      id: shareLink.id,
      token: shareLink.token,
      expires_at: shareLink.expires_at,
    },
  });
}
