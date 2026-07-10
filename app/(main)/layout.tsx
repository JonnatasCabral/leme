import Navbar from "@/components/Navbar";

// Layout do "site" normal: landing, login, dashboard e páginas de auth.
// As páginas de visualização (/s/[token] e /p/[id]) ficam fora desse grupo
// de rotas de propósito, para não herdar o Navbar.
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}
