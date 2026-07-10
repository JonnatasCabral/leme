// Ícone de "roda de leme" (ship's wheel) recriado em SVG a partir da
// referência de marca — 8 raios entre o cubo central e o aro, com os
// pinos do timão pra fora do aro. Usa currentColor pra herdar a cor do
// texto de quem chama.
export function LogoMark({ className = "h-4 w-4" }: { className?: string }) {
  const spokeAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  const toXY = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: 12 + radius * Math.cos(rad),
      y: 12 + radius * Math.sin(rad),
    };
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      {spokeAngles.map((angle) => {
        const inner = toXY(angle, 2.5);
        const outer = toXY(angle, 8);
        return (
          <line
            key={`spoke-${angle}`}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            stroke="currentColor"
            strokeWidth="1.6"
          />
        );
      })}
      {spokeAngles.map((angle) => {
        const rimPoint = toXY(angle, 8);
        const tip = toXY(angle, 9.6);
        return (
          <line
            key={`handle-${angle}`}
            x1={rimPoint.x}
            y1={rimPoint.y}
            x2={tip.x}
            y2={tip.y}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export default function Logo({
  withWordmark = true,
  size = "md",
}: {
  withWordmark?: boolean;
  size?: "sm" | "md";
}) {
  const badgeSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  const markSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  return (
    <span className="flex items-center gap-2">
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-brand-500 text-white ${badgeSize}`}
      >
        <LogoMark className={markSize} />
      </span>
      {withWordmark && (
        <span className={`font-semibold tracking-tight text-ink-900 ${textSize}`}>Leme</span>
      )}
    </span>
  );
}
