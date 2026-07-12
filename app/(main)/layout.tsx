import Navbar from "@/components/Navbar";

// Layout do "site" normal: landing, login, dashboard, páginas de auth e
// também as páginas de visualização (/p/[id] e /s/[token]) — todas herdam
// o Navbar daqui.
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
