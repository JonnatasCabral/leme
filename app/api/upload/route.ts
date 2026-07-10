import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase";
import { ANON_COOKIE_MAX_AGE, ANON_COOKIE_NAME, generateAnonId } from "@/lib/anon";
import { computeExpiresAt, getPlanLimits, type EffectivePlan } from "@/lib/plans";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = new Set(["text/html", "application/octet-stream"]);

// POST /api/upload
// Recebe multipart/form-data com: file (obrigatório), title (obrigatório),
// description (opcional). Salva o arquivo no bucket "html-files" e cria
// o registro correspondente em html_pages, respeitando o limite de
// páginas ativas e a expiração do plano do usuário (ver lib/plans.ts).
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const title = (formData.get("title") as string | null)?.trim();
    const description = ((formData.get("description") as string | null) ?? "").trim() || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was sent." }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file." }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File exceeds the 2MB limit." },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const looksLikeHtml = file.name.toLowerCase().endsWith(".html");
    if (!ALLOWED_MIME_TYPES.has(mimeType) || !looksLikeHtml) {
      return NextResponse.json(
        { error: "Only .html files are accepted." },
        { status: 400 }
      );
    }

    // Descobre o usuário logado (se houver) a partir da sessão em cookies.
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Operações privilegiadas (bypassam RLS) feitas com a service_role key.
    const admin = createSupabaseAdminClient();

    // Identidade anônima (cookie técnico) só é usada quando não há login.
    const cookieStore = cookies();
    let anonId = cookieStore.get(ANON_COOKIE_NAME)?.value ?? null;
    let isNewAnonId = false;
    if (!user && !anonId) {
      anonId = generateAnonId();
      isNewAnonId = true;
    }

    // Descobre o plano efetivo: anônimo, free ou pro.
    let plan: EffectivePlan = "anonymous";
    if (user) {
      const { data: profile } = await admin
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      plan = profile?.plan ?? "free";
    }
    const limits = getPlanLimits(plan);

    // Checa o limite de páginas ativas (não expiradas) antes de aceitar o upload.
    if (limits.maxActivePages !== null) {
      const nowIso = new Date().toISOString();
      let countQuery = admin
        .from("html_pages")
        .select("id", { count: "exact", head: true })
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

      countQuery = user ? countQuery.eq("user_id", user.id) : countQuery.eq("anon_id", anonId!);

      const { count, error: countError } = await countQuery;

      if (!countError && (count ?? 0) >= limits.maxActivePages) {
        return NextResponse.json(
          {
            error: user
              ? `Your ${limits.label} plan allows a maximum of ${limits.maxActivePages} active page(s). Delete an existing page or upgrade to the Pro plan.`
              : `Uploads without an account allow a maximum of ${limits.maxActivePages} active page. Create a free account for more space.`,
          },
          { status: 403 }
        );
      }
    }

    const uniqueId = nanoid(12);
    const filePath = `${user?.id ?? "anon"}/${uniqueId}.html`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from("html-files")
      .upload(filePath, Buffer.from(arrayBuffer), {
        contentType: "text/html",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: page, error: insertError } = await admin
      .from("html_pages")
      .insert({
        user_id: user?.id ?? null,
        anon_id: user ? null : anonId,
        title,
        description,
        file_path: filePath,
        expires_at: computeExpiresAt(plan),
      })
      .select()
      .single();

    if (insertError || !page) {
      // Reverte o upload do storage se a inserção no banco falhar.
      await admin.storage.from("html-files").remove([filePath]);
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to record upload." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ page }, { status: 201 });

    if (isNewAnonId && anonId) {
      response.cookies.set(ANON_COOKIE_NAME, anonId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: ANON_COOKIE_MAX_AGE,
        path: "/",
      });
    }

    return response;
  } catch (err) {
    console.error("Error in /api/upload:", err);
    return NextResponse.json(
      { error: "Unexpected error while processing the upload." },
      { status: 500 }
    );
  }
}
