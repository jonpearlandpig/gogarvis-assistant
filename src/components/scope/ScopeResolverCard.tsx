interface ResolverProps {
  projects: { id: string; name: string }[];
  onSelect: (id: string) => void;
}

export function ScopeResolverCard({ projects, onSelect }: ResolverProps) {
  return (
    <div className="border border-border rounded p-3 text-xs bg-background space-y-2">
      <div className="font-mono text-foreground">
        Select a project to search:
      </div>

      {projects.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className="block w-full text-left border border-border px-2 py-1 rounded hover:bg-muted"
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
