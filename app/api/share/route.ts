import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase";
import { getSiteUrl } from "@/lib/utils";

export const runtime = "nodejs";

// POST /api/share
// Body: { pageId: string, expiresAt?: string | null }
// Se a página já tiver um link de compartilhamento, devolve o existente em
// vez de criar um novo — cada página tem um único link "canônico".
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const pageId = body?.pageId as string | undefined;
    const expiresAt = (body?.expiresAt as string | null | undefined) ?? null;

    if (!pageId) {
      return NextResponse.json({ error: "pageId is required." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    const { data: page, error: pageError } = await admin
      .from("html_pages")
      .select("id")
      .eq("id", pageId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Page not found." }, { status: 404 });
    }

    // Já existe um link pra essa página? Reaproveita em vez de gerar outro.
    const { data: existingLink } = await admin
      .from("share_links")
      .select("*")
      .eq("page_id", pageId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingLink) {
      const url = `${getSiteUrl()}/s/${existingLink.token}`;
      return NextResponse.json({ shareLink: existingLink, url }, { status: 200 });
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const token = nanoid(10);

    const { data: shareLink, error: insertError } = await admin
      .from("share_links")
      .insert({
        page_id: pageId,
        token,
        created_by: user?.id ?? null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError || !shareLink) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create link." },
        { status: 500 }
      );
    }

    const url = `${getSiteUrl()}/s/${shareLink.token}`;

    return NextResponse.json({ shareLink, url }, { status: 201 });
  } catch (err) {
    console.error("Error in /api/share:", err);
    return NextResponse.json(
      { error: "Unexpected error while generating the link." },
      { status: 500 }
    );
  }
}
