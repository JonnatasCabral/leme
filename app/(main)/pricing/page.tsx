import Link from "next/link";
import { PLAN_LIMITS } from "@/lib/plans";
import ProPlanCard from "@/components/ProPlanCard";

const FREE = PLAN_LIMITS.free;
const ANON = PLAN_LIMITS.anonymous;

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Simple plans, no catch
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-500">
          Use it without creating an account to try it quickly, create a free
          account to keep more pages, or go Pro when you want to keep
          everything live with no limit.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <PlanCard
          name="No account"
          price="$0"
          description="To try it out quickly, no sign-up."
          features={[
            `${ANON.maxActivePages} active page at a time`,
            `Expires in ${ANON.retentionDays} days`,
            "With watermark",
          ]}
          cta={{ label: "Use now", href: "/" }}
        />

        <PlanCard
          name="Free"
          price="$0"
          description="Create an account and get more space."
          features={[
            `${FREE.maxActivePages} active pages at the same time`,
            `Expires in ${FREE.retentionDays} days`,
            "With watermark",
          ]}
          cta={{ label: "Create free account", href: "/login" }}
          highlighted
        />

        <ProPlanCard />
      </div>

      <p className="mt-10 text-center text-xs text-ink-400">
        Payments are processed securely by Stripe. Cancel anytime from your
        billing settings.
      </p>
    </div>
  );
}

function PlanCard({
  name,
  price,
  description,
  features,
  cta,
  highlighted = false,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: { label: string; href?: string; disabled?: boolean };
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-2xl border p-6 shadow-card ${
        highlighted ? "border-brand-300 bg-brand-50/40" : "border-ink-100 bg-white"
      }`}
    >
      <div>
        <h2 className="text-lg font-bold text-ink-900">{name}</h2>
        <p className="mt-1 text-sm text-ink-500">{description}</p>
      </div>

      <p className="text-2xl font-bold text-ink-900">{price}</p>

      <ul className="flex flex-1 flex-col gap-2 text-sm text-ink-600">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-0.5 text-brand-500">✓</span>
            {feature}
          </li>
        ))}
      </ul>

      {cta.disabled || !cta.href ? (
        <span className="w-full rounded-full bg-ink-100 px-4 py-2 text-center text-sm font-semibold text-ink-400">
          {cta.label}
        </span>
      ) : (
        <Link
          href={cta.href}
          className={`w-full rounded-full px-4 py-2 text-center text-sm font-semibold shadow-sm transition-colors ${
            highlighted
              ? "bg-brand-500 text-white hover:bg-brand-600"
              : "bg-ink-900 text-white hover:bg-ink-800"
          }`}
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
