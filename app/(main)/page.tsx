import Link from "next/link";
import { LogoMark } from "@/components/Logo";

// Landing page de vendas: hero, features e CTA final. Sem formulário de
// upload aqui de propósito — quem quer subir um arquivo vai direto pra
// /new, que é a tela enxuta e focada só nisso.
export default function HomePage() {
  return (
    <div className="bg-white">
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-2">
        <div>
          <span className="mb-4 inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
            AI-generated HTML, made shareable
          </span>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
            Turn what you build with AI into pages anyone can open
          </h1>
          <p className="mt-5 max-w-md text-base text-ink-500 sm:text-lg">
            Upload the HTML your favorite AI tool generated, get a shareable
            link in seconds, and let people comment, suggest changes, or fork
            it into something new.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/new"
              className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
            >
              Upload your HTML
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-ink-200 px-6 py-3 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50"
            >
              See plans
            </Link>
          </div>

          <p className="mt-4 text-xs text-ink-400">
            No account needed to try it — pages you upload without signing in
            stay saved in this browser.
          </p>
        </div>

        <HeroVisual />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            title="Upload"
            description="Drop in any .html file up to 2MB — no build step, no config."
          />
          <FeatureCard
            title="Share"
            description="Every upload gets its own page and link, ready to send."
          />
          <FeatureCard
            title="Collaborate"
            description="Visitors can comment, suggest changes, or fork your page."
          />
          <FeatureCard
            title="Stay in control"
            description="Free plan has limits and a watermark; Pro removes both."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:pb-28">
        <div className="flex flex-col items-center gap-4 rounded-3xl bg-ink-900 px-6 py-14 text-center sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Ready to share what you built?
          </h2>
          <p className="max-w-md text-sm text-ink-300">
            It takes less than a minute — no sign-up required to get started.
          </p>
          <Link
            href="/new"
            className="mt-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
          >
            Upload your HTML
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <LogoMark className="h-4 w-4" />
      </span>
      <h3 className="font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm text-ink-500">{description}</p>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative hidden lg:block">
      <div className="relative mx-auto flex h-[420px] w-full max-w-md items-center justify-center rounded-3xl bg-brand-50">
        <LogoMark className="h-36 w-36 text-brand-300" />

        <div className="absolute left-2 top-10 w-44 -rotate-6 rounded-xl border border-ink-100 bg-white p-3 shadow-card">
          <div className="mb-2 flex gap-1">
            <span className="h-2 w-2 rounded-full bg-red-300" />
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded bg-ink-100" />
            <div className="h-2 w-3/4 rounded bg-ink-100" />
            <div className="h-2 w-1/2 rounded bg-ink-100" />
          </div>
          <p className="mt-2 truncate text-xs font-semibold text-ink-700">landing-page.html</p>
        </div>

        <div className="absolute bottom-10 right-2 w-44 rotate-6 rounded-xl border border-ink-100 bg-white p-3 shadow-card">
          <div className="mb-2 flex gap-1">
            <span className="h-2 w-2 rounded-full bg-red-300" />
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded bg-ink-100" />
            <div className="h-2 w-2/3 rounded bg-ink-100" />
            <div className="h-2 w-5/6 rounded bg-ink-100" />
          </div>
          <p className="mt-2 truncate text-xs font-semibold text-ink-700">dashboard-ui.html</p>
        </div>
      </div>
    </div>
  );
}
