import UploadForm from "@/components/UploadForm";
import Link from "next/link";

// Tela enxuta, sem discurso de venda — quem chegou aqui já decidiu que
// quer subir um arquivo. O foco é só o formulário.
export default function UploadLanding() {
  return (
    <div className="bg-white">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
        <h1 className="text-center text-2xl font-bold tracking-tight text-ink-900">
          Upload your HTML
        </h1>

        <UploadForm />

        <p className="text-center text-xs text-ink-400">
          No account? No problem — your upload stays saved in this browser,
          access it later at{" "}
          <Link href="/mine" className="font-medium text-brand-600 hover:underline">
            My uploads
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
