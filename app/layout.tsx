import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Poppins é a tipografia da identidade visual "Leme" (Regular/Medium/
// Semibold/Bold). Carregada como CSS variable e usada como fonte padrão
// via tailwind.config.ts (theme.fontFamily.sans).
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Leme",
  description:
    "Upload AI-generated HTML files and share them with anyone through a link.",
};

// Layout raiz: propositalmente sem Navbar. As páginas de visualização
// (/s/[token] e /p/[id]) precisam ocupar a tela inteira, sem "cara de site".
// O Navbar só é injetado pelo layout do grupo (main) — ver app/(main)/layout.tsx.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="min-h-screen bg-white text-ink-900 antialiased">{children}</body>
    </html>
  );
}
