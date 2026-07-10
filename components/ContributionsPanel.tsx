"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { Contribution, ContributionType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const TYPE_LABELS: Record<ContributionType, string> = {
  comment: "Comment",
  suggestion: "Suggestion",
  fork: "Fork",
};

const TYPE_COLORS: Record<ContributionType, string> = {
  comment: "bg-ink-100 text-ink-600",
  suggestion: "bg-amber-100 text-amber-700",
  fork: "bg-brand-100 text-brand-700",
};

export default function ContributionsPanel({
  pageId,
  pageTitle,
  pageHtml,
  initialContributions,
}: {
  pageId: string;
  pageTitle: string;
  pageHtml: string;
  initialContributions: Contribution[];
}) {
  const [contributions, setContributions] = useState(initialContributions);
  const [type, setType] = useState<ContributionType>("comment");
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [forkTitle, setForkTitle] = useState(`Fork of ${pageTitle}`);
  const [forkHtml, setForkHtml] = useState(pageHtml);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: Record<string, unknown> = {
      pageId,
      type,
      authorName,
      content,
    };

    if (type === "fork") {
      payload.htmlContent = forkHtml;
      payload.title = forkTitle;
    }

    try {
      const res = await fetch("/api/contribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to submit contribution.");
        return;
      }

      setContributions((prev) => [data.contribution, ...prev]);
      setContent("");
    } catch {
      setError("Connection error while submitting contribution.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-card"
      >
        <div className="flex gap-2 text-xs">
          {(Object.keys(TYPE_LABELS) as ContributionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                type === t ? "bg-brand-500 text-white shadow-sm" : "bg-ink-100 text-ink-500"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your name (optional)"
          className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />

        {type === "fork" && (
          <>
            <input
              type="text"
              value={forkTitle}
              onChange={(e) => setForkTitle(e.target.value)}
              placeholder="Fork title"
              className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-500">
              Edit the HTML before creating the fork:
              <textarea
                value={forkHtml}
                onChange={(e) => setForkHtml(e.target.value)}
                rows={8}
                className="mt-1 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 font-mono text-xs text-ink-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            type === "comment"
              ? "Leave a comment..."
              : type === "suggestion"
              ? "Describe your suggestion..."
              : "Message about this fork (optional)"
          }
          rows={3}
          required={type !== "fork"}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-fit rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {loading
            ? "Submitting..."
            : type === "fork"
            ? "Create fork"
            : "Submit"}
        </button>
      </form>

      <ul className="flex flex-col gap-3">
        {contributions.length === 0 && (
          <p className="text-sm text-ink-400">No contributions yet. Be the first!</p>
        )}
        {contributions.map((c) => (
          <li
            key={c.id}
            className="rounded-2xl border border-ink-100 bg-white p-4 text-sm shadow-card"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[c.type]}`}>
                {TYPE_LABELS[c.type]}
              </span>
              <span className="font-semibold text-ink-800">{c.author_name}</span>
              <span className="text-xs text-ink-400">{formatDate(c.created_at)}</span>
            </div>
            <p className="text-ink-600">{c.content}</p>
            {c.type === "fork" && c.fork_page_id && (
              <Link
                href={`/p/${c.fork_page_id}`}
                className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline"
              >
                View fork →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
