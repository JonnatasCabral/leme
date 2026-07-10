"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const MAX_SIZE_BYTES = 2 * 1024 * 1024;

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError(null);

    if (selected && !selected.name.toLowerCase().endsWith(".html")) {
      setError("Select an .html file.");
      setFile(null);
      return;
    }
    if (selected && selected.size > MAX_SIZE_BYTES) {
      setError("The file must be at most 2MB.");
      setFile(null);
      return;
    }

    setFile(selected);
    if (selected && !title) {
      setTitle(selected.name.replace(/\.html?$/i, ""));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose an .html file to upload.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name);
    formData.append("description", description);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to upload the file.");
        setLoading(false);
        return;
      }

      // Redireciona direto para a página com o HTML renderizado —
      // sem tela intermediária de "sucesso".
      router.push(`/p/${data.page.id}`);
    } catch {
      setError("Connection error while uploading the file.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-card"
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
        HTML file (.html, up to 2MB)
        <input
          type="file"
          accept=".html,text/html"
          onChange={handleFileChange}
          className="mt-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 file:mr-3 file:rounded-full file:border-0 file:bg-brand-500 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-600"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
        Title
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="E.g.: Landing page generated with GPT"
          className="mt-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
        Description (optional)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Tell us a bit about this HTML..."
          className="mt-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-fit rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>
    </form>
  );
}
