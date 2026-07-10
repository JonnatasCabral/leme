"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Mode = "magic-link" | "password";
type PasswordAction = "sign-in" | "sign-up";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<Mode>("magic-link");
  const [passwordAction, setPasswordAction] = useState<PasswordAction>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setMessage("Magic link sent! Check your inbox to continue.");
    } catch {
      setError("Couldn't connect. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordAuth(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (passwordAction === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          setError(error.message);
          return;
        }

        setMessage("Account created! Confirm your email to sign in.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't connect. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Sign in</h1>
        <p className="mt-1 text-sm text-ink-500">
          Access your account to manage your uploads and share links.
        </p>
      </div>

      <div className="flex rounded-full border border-ink-200 bg-ink-50 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("magic-link")}
          className={`flex-1 rounded-full py-1.5 font-medium transition-colors ${
            mode === "magic-link" ? "bg-brand-500 text-white shadow-sm" : "text-ink-500"
          }`}
        >
          Magic link
        </button>
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`flex-1 rounded-full py-1.5 font-medium transition-colors ${
            mode === "password" ? "bg-brand-500 text-white shadow-sm" : "text-ink-500"
          }`}
        >
          Email and password
        </button>
      </div>

      {mode === "magic-link" ? (
        <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-ink-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-brand-500 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send magic link"}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordAuth} className="flex flex-col gap-3">
          <label className="text-sm font-medium text-ink-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="text-sm font-medium text-ink-700">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-brand-500 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : passwordAction === "sign-in"
              ? "Sign in"
              : "Create account"}
          </button>
          <button
            type="button"
            onClick={() =>
              setPasswordAction(passwordAction === "sign-in" ? "sign-up" : "sign-in")
            }
            className="text-xs font-medium text-ink-500 hover:text-ink-800"
          >
            {passwordAction === "sign-in"
              ? "Don't have an account? Create one now"
              : "Already have an account? Sign in"}
          </button>
        </form>
      )}

      {message && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
