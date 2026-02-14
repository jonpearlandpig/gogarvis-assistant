import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProjectContextField } from "@/lib/scoped-akb";

interface Props {
  projects: Array<{ id: string; name: string; status: string }>;
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onCreateProject: (name: string) => void;
  fields: ProjectContextField[];
  onSaveField: (domainKey: string, fieldKey: string, value: string) => void;
  scopeMode: "canonical" | "project";
}

export function ProjectAKBPanel({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  fields,
  onSaveField,
  scopeMode,
}: Props) {
  const [newName, setNewName] = useState("");
  const [editField, setEditField] = useState<{ domain: string; key: string; value: string } | null>(null);

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono text-foreground uppercase tracking-wide">
            Projects
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Mode: {scopeMode}
          </div>
        </div>

        {/* Project selector */}
        <div className="flex gap-2">
          <select
            className="flex-1 text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
            value={activeProjectId || ""}
            onChange={(e) => onSelectProject(e.target.value || null)}
          >
            <option value="">— Canonical (no project) —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Create project */}
        <div className="flex gap-2">
          <input
            className="flex-1 text-xs border border-border rounded px-2 py-1 bg-background text-foreground placeholder:text-muted-foreground"
            placeholder="New project name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-foreground"
            onClick={() => {
              if (newName.trim()) {
                onCreateProject(newName.trim());
                setNewName("");
              }
            }}
          >
            Create
          </button>
        </div>

        {/* Project context fields */}
        {activeProjectId && (
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground">
              Project context fields override canonical for tactical decisions only.
            </div>

            {fields.length === 0 && (
              <div className="text-[10px] text-muted-foreground italic">
                No project context yet. Add fields below.
              </div>
            )}

            {fields.map((f) => (
              <div key={f.id} className="border border-border rounded p-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-mono text-foreground">
                    {f.domain_key} / {f.field_key}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{f.status}</div>
                </div>
                <div className="text-[11px] text-foreground mt-1 whitespace-pre-wrap">
                  {f.value || "—"}
                </div>
              </div>
            ))}

            {/* Quick add field */}
            <div className="text-[10px] font-mono text-foreground mt-2">Add Context Field</div>
            <div className="flex gap-1">
              <input
                className="w-20 text-[10px] border border-border rounded px-1 py-1 bg-background text-foreground placeholder:text-muted-foreground"
                placeholder="domain"
                value={editField?.domain || ""}
                onChange={(e) => setEditField((p) => ({ domain: e.target.value, key: p?.key || "", value: p?.value || "" }))}
              />
              <input
                className="w-24 text-[10px] border border-border rounded px-1 py-1 bg-background text-foreground placeholder:text-muted-foreground"
                placeholder="field_key"
                value={editField?.key || ""}
                onChange={(e) => setEditField((p) => ({ domain: p?.domain || "", key: e.target.value, value: p?.value || "" }))}
              />
            </div>
            <textarea
              className="w-full text-xs border border-border rounded px-2 py-1 bg-background text-foreground placeholder:text-muted-foreground min-h-[50px]"
              placeholder="Value"
              value={editField?.value || ""}
              onChange={(e) => setEditField((p) => ({ domain: p?.domain || "", key: p?.key || "", value: e.target.value }))}
            />
            <button
              className="text-xs border border-border rounded px-2 py-1 hover:bg-muted/40 text-foreground"
              onClick={() => {
                if (editField?.domain && editField?.key && editField?.value) {
                  onSaveField(editField.domain, editField.key, editField.value);
                  setEditField(null);
                }
              }}
            >
              Save Field
            </button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
