import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase";
import type { ContributionType } from "@/lib/types";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const VALID_TYPES: ContributionType[] = ["comment", "suggestion", "fork"];

// POST /api/contribute
// Body comum: { pageId, authorName?, content?, type }
// Body extra para type = "fork": { htmlContent, title? }
// Cria uma linha em contributions. Para forks, também cria uma nova
// html_page (cópia editável) e vincula via fork_page_id.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const pageId = body?.pageId as string | undefined;
    const type = (body?.type as ContributionType | undefined) ?? "comment";
    const authorName = ((body?.authorName as string | undefined) ?? "").trim() || "Anonymous";
    let content = ((body?.content as string | undefined) ?? "").trim();

    if (!pageId) {
      return NextResponse.json({ error: "pageId is required." }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid contribution type." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: originalPage, error: originalPageError } = await admin
      .from("html_pages")
      .select("id, title")
      .eq("id", pageId)
      .single();

    if (originalPageError || !originalPage) {
      return NextResponse.json({ error: "Original page not found." }, { status: 404 });
    }

    let forkPageId: string | null = null;

    if (type === "fork") {
      const htmlContent = body?.htmlContent as string | undefined;
      const forkTitle =
        ((body?.title as string | undefined) ?? "").trim() || `Fork of ${originalPage.title}`;

      if (!htmlContent || !htmlContent.trim()) {
        return NextResponse.json(
          { error: "htmlContent is required to create a fork." },
          { status: 400 }
        );
      }

      const byteSize = Buffer.byteLength(htmlContent, "utf-8");
      if (byteSize > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: "The fork content exceeds the 2MB limit." },
          { status: 400 }
        );
      }

      const uniqueId = nanoid(12);
      const filePath = `${user?.id ?? "anon"}/${uniqueId}.html`;

      const { error: uploadError } = await admin.storage
        .from("html-files")
        .upload(filePath, htmlContent, {
          contentType: "text/html",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }

      const { data: newPage, error: insertPageError } = await admin
        .from("html_pages")
        .insert({
          user_id: user?.id ?? null,
          title: forkTitle,
          description: `Fork of "${originalPage.title}"`,
          file_path: filePath,
        })
        .select()
        .single();

      if (insertPageError || !newPage) {
        await admin.storage.from("html-files").remove([filePath]);
        return NextResponse.json(
          { error: insertPageError?.message ?? "Failed to create the fork." },
          { status: 500 }
        );
      }

      forkPageId = newPage.id;
      if (!content) {
        content = `Fork created: "${forkTitle}"`;
      }
    }

    if (!content) {
      return NextResponse.json({ error: "Content is required." }, { status: 400 });
    }

    const { data: contribution, error: insertError } = await admin
      .from("contributions")
      .insert({
        page_id: pageId,
        user_id: user?.id ?? null,
        author_name: authorName,
        content,
        type,
        fork_page_id: forkPageId,
      })
      .select()
      .single();

    if (insertError || !contribution) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to record contribution." },
        { status: 500 }
      );
    }

    return NextResponse.json({ contribution }, { status: 201 });
  } catch (err) {
    console.error("Error in /api/contribute:", err);
    return NextResponse.json(
      { error: "Unexpected error while recording contribution." },
      { status: 500 }
    );
  }
}
