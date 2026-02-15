import { useState } from "react";

type Props = {
  onTry: () => void;
  onBuild: () => void;
};

export default function GarvisEntryGate({ onTry, onBuild }: Props) {
  const [hovered, setHovered] = useState<"try" | "build" | null>(null);

  return (
    <div className="w-full max-w-3xl mx-auto mt-12 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Before we begin —
        </h1>
        <p className="text-sm text-muted-foreground">
          Do you want to try GARVIS… or build it?
        </p>
      </div>

      {/* OPTION 1 */}
      <button
        onClick={onTry}
        onMouseEnter={() => setHovered("try")}
        onMouseLeave={() => setHovered(null)}
        className="w-full rounded-2xl border border-border p-6 text-left transition-all hover:bg-muted/40"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-foreground">
              Should I try it?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              I'm curious. I want to see how this works without going deep.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">Fast start</span>
        </div>

        {hovered === "try" && (
          <div className="mt-4 text-xs text-muted-foreground leading-relaxed">
            • Set your name, role, and tone<br />
            • Connect Google Calendar (optional)<br />
            • Start asking questions immediately<br />
            • Build deeper only when needed
          </div>
        )}
      </button>

      {/* OPTION 2 */}
      <button
        onClick={onBuild}
        onMouseEnter={() => setHovered("build")}
        onMouseLeave={() => setHovered(null)}
        className="w-full rounded-2xl border border-border p-6 text-left transition-all hover:bg-muted/40"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-foreground">
              Or should I build it?
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              I have a business, assets, and context. I want GARVIS embedded into my system.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">Full system</span>
        </div>

        {hovered === "build" && (
          <div className="mt-4 text-xs text-muted-foreground leading-relaxed">
            • Upload executive summary or website<br />
            • Auto-generate AKB structure<br />
            • Scaffold projects + contacts<br />
            • Activate operational workspace
          </div>
        )}
      </button>
    </div>
  );
}
