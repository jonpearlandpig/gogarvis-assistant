import { AKBBuilderPanel } from "@/components/akb/AKBBuilderPanel";

interface ModuleHostProps {
  activeKey: string | null;
  workspaceId?: string | null;
}

export function ModuleHost({ activeKey, workspaceId }: ModuleHostProps) {
  if (!activeKey) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-xs text-muted-foreground">
        No module selected.
      </div>
    );
  }

  if (activeKey === "akb_builder") {
    return (
      <div className="flex-1 border-l border-border">
        <AKBBuilderPanel workspaceId={workspaceId || null} />
      </div>
    );
  }

  if (activeKey === "invoicewatch") {
    return (
      <div className="flex-1 border-l border-border p-6 text-xs text-muted-foreground">
        InvoiceWatch — coming soon.
      </div>
    );
  }

  return (
    <div className="flex-1 border-l border-border p-6 text-xs text-muted-foreground">
      Module not implemented: {activeKey}
    </div>
  );
}
