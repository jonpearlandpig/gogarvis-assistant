import type { UserModule } from "@/hooks/useModules";

interface ModuleRailProps {
  activeModules: UserModule[];
  suggestedModules: UserModule[];
  activeKey: string | null;
  onSelect: (key: string) => void;
}

export function ModuleRail({ activeModules, suggestedModules, activeKey, onSelect }: ModuleRailProps) {
  return (
    <div className="w-[240px] border-r border-border p-2 bg-card">
      <div className="text-xs font-medium text-muted-foreground mb-2">Modules</div>
      <div className="space-y-1">
        {activeModules.map((m) => (
          <button
            key={m.module_key}
            onClick={() => onSelect(m.module_key)}
            className={`w-full text-left px-2 py-2 rounded border border-border text-xs transition-colors ${
              activeKey === m.module_key
                ? "bg-muted text-foreground font-medium"
                : "hover:bg-muted/40 text-muted-foreground"
            }`}
          >
            {m.display_name}
          </button>
        ))}
      </div>

      {suggestedModules.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-2">Suggested</div>
          <div className="space-y-1">
            {suggestedModules.map((m) => (
              <div
                key={m.module_key}
                className="px-2 py-2 rounded border border-border text-xs text-muted-foreground"
              >
                {m.display_name} <span className="ml-2 opacity-60">• Suggested</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
