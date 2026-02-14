import { useMemo } from "react";
import { toast } from "sonner";
import { useModules } from "@/hooks/useModules";

export function ModuleNudge({ userId }: { userId: string }) {
  const { suggestedModules, activateModule } = useModules(userId);

  const journal = useMemo(
    () => suggestedModules.find((m) => m.module_key === "journal"),
    [suggestedModules]
  );

  if (!journal) return null;

  return (
    <div className="border border-border rounded-lg p-3 bg-muted/40 mx-4 mt-2">
      <div className="text-xs font-medium">{journal.display_name} suggested</div>
      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
        <div>There's insight here that could strengthen your operating system.</div>
        <div>Would you like to activate Journal to capture reflections in a structured way?</div>
      </div>
      <div className="flex gap-3 mt-2">
        <button
          className="text-xs underline"
          onClick={async () => {
            await activateModule("journal");
            toast.success("Journal activated");
          }}
        >
          Activate
        </button>
        <button
          className="text-xs underline text-muted-foreground"
          onClick={() => toast.message("Noted")}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
