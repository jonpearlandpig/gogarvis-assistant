interface Props {
  onSwitchHome: () => void;
  onSearch: () => void;
}

export function NotHereCard({ onSwitchHome, onSearch }: Props) {
  return (
    <div className="border border-border rounded p-3 text-xs bg-muted/40 space-y-2">
      <div className="font-mono text-foreground">
        Not found in this project.
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSwitchHome}
          className="border border-border px-2 py-1 rounded hover:bg-muted"
        >
          Switch to Home
        </button>

        <button
          onClick={onSearch}
          className="border border-border px-2 py-1 rounded hover:bg-muted"
        >
          Search Other Projects
        </button>
      </div>
    </div>
  );
}
