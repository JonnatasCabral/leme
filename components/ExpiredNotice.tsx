import Link from "next/link";

export default function ExpiredNotice() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-3 bg-white px-4 text-center">
      <h1 className="text-xl font-bold tracking-tight text-ink-900">This page has expired</h1>
      <p className="max-w-sm text-sm text-ink-500">
        The author&apos;s plan limits how long a page stays live. If you&apos;re the
        author, upgrade to the Pro plan to keep your pages from expiring.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
      >
        Back to home
      </Link>
    </div>
  );
}
