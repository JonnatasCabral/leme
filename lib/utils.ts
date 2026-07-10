export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function getPublicFileUrl(filePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/html-files/${filePath}`;
}

/** Texto curto de expiração pra mostrar no dashboard (null = plano sem expiração). */
export function formatExpiration(expiresAt: string | null): string | null {
  if (!expiresAt) return null;

  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "expired";
  if (diffDays === 1) return "expires in 1 day";
  return `expires in ${diffDays} days`;
}
