import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  state:
    | "akb_identity"
    | "akb_goals"
    | "akb_offer"
    | "foundation_complete"
    | "workspace";
  onAction: (action: string) => void;
  persistKey?: string;
}

export function SafeNextStep({ state, onAction, persistKey = "safe_next_step" }: Props) {
  const storageKey = `${persistKey}:${state}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      setDismissed(v === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  const actions = useMemo(() => {
    switch (state) {
      case "akb_identity":
        return [
          { label: "Save Identity Draft", action: "save_identity" },
          { label: "Skip for Now", action: "skip_identity" },
        ];
      case "akb_goals":
        return [
          { label: "Save Goals Draft", action: "save_goals" },
          { label: "Continue to Offer", action: "next_offer" },
        ];
      case "akb_offer":
        return [
          { label: "Save Offer Draft", action: "save_offer" },
          { label: "Continue Building", action: "continue_building" },
        ];
      case "foundation_complete":
        return [
          { label: "Enter Workspace", action: "enter_workspace" },
          { label: "Start Project 01", action: "start_project" },
        ];
      case "workspace":
        return [
          { label: "Create First Artifact", action: "create_artifact" },
          { label: "Start New Project", action: "new_project" },
        ];
      default:
        return [{ label: "What should I do next?", action: "suggest" }];
    }
  }, [state]);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[260px] rounded-xl border border-border bg-background/80 backdrop-blur p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground font-mono">Safe Next Step</div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(storageKey, "1");
            } catch {}
          }}
          className={cn(
            "text-muted-foreground hover:text-foreground transition-colors",
            "rounded px-1"
          )}
        >
          ×
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {actions.map((a) => (
          <Button key={a.action} size="sm" variant="outline" onClick={() => onAction(a.action)}>
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
