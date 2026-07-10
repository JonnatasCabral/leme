import UploadLanding from "@/components/UploadLanding";

// Mesma tela da home, mas sem o redirect automático pro upload mais
// recente — é o destino do botão "+ Novo upload" pra quem já tem uploads.
export default function NewUploadPage() {
  return <UploadLanding />;
}
