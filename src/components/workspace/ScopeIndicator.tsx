import { useState } from "react";
import { ChevronDown, Home, FolderOpen, Search } from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface ScopeIndicatorProps {
  mode: "home" | "project";
  activeProject: Project | null;
  projects: Project[];
  onSelectProject: (projectId: string | null) => void;
}

export function ScopeIndicator({
  mode,
  activeProject,
  projects,
  onSelectProject,
}: ScopeIndicatorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono"
      >
        {mode === "home" ? (
          <>
            <Home className="h-3 w-3" />
            <span>Scope: Home (Canonical)</span>
          </>
        ) : (
          <>
            <FolderOpen className="h-3 w-3" />
            <span>Scope: {activeProject?.name || "Project"}</span>
          </>
        )}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-border bg-card shadow-lg z-50 py-1">
            <button
              className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${
                mode === "home" ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
              onClick={() => {
                onSelectProject(null);
                setOpen(false);
              }}
            >
              <Home className="h-3 w-3" />
              Home (Canonical)
            </button>

            {projects.length > 3 && (
              <div className="px-3 py-1.5">
                <div className="flex items-center gap-1.5 border border-border rounded px-2 py-1 bg-background">
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <input
                    className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                    placeholder="Search projects…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            <div className="border-t border-border my-1" />

            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-muted-foreground">No projects</div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${
                    activeProject?.id === p.id ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                  onClick={() => {
                    onSelectProject(p.id);
                    setOpen(false);
                  }}
                >
                  <FolderOpen className="h-3 w-3" />
                  {p.name}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
