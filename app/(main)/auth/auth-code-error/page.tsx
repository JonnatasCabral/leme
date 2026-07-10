import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-bold tracking-tight text-ink-900">
        We couldn&apos;t confirm your sign-in
      </h1>
      <p className="text-sm text-ink-500">
        The link may have expired or already been used. Please try signing in again.
      </p>
      <Link
        href="/login"
        className="mx-auto w-fit rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600"
      >
        Back to sign in
      </Link>
    </div>
  );
}
