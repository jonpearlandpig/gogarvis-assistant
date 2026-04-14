import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Key, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const ALL_SCOPES = [
  { id: "akb:read", label: "AKB Read" },
  { id: "akb:write", label: "AKB Write" },
  { id: "projects:read", label: "Projects Read" },
  { id: "projects:write", label: "Projects Write" },
  { id: "artifacts:read", label: "Artifacts Read" },
];

interface APIKeyRow {
  id: string;
  label: string;
  scopes: string[];
  created_at: string;
  revoked_at: string | null;
}

export default function APIKeysPanel() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<APIKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(ALL_SCOPES.map(s => s.id));
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("api_keys")
      .select("id, label, scopes, created_at, revoked_at")
      .order("created_at", { ascending: false });
    setKeys((data as APIKeyRow[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newLabel.trim()) { toast.error("Label is required"); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        body: { label: newLabel.trim(), scopes: newScopes },
      });
      if (error) throw error;
      setGeneratedKey(data.key);
      toast.success("API key created");
      await fetchKeys();
    } catch (e: any) {
      toast.error(e?.message || "Failed to create key");
    }
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Failed to revoke");
    else { toast.success("Key revoked"); fetchKeys(); }
  };

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast.success("Copied to clipboard");
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="h-5 w-5" /> Connected Apps
        </CardTitle>
        <CardDescription>Connect external tools like Jennie or Compass to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button size="sm" onClick={() => { setShowCreate(true); setGeneratedKey(null); setNewLabel(""); setNewScopes(ALL_SCOPES.map(s => s.id)); setShowAdvanced(false); }}>
          <Plus className="h-4 w-4 mr-1" /> New Connection
        </Button>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{k.label}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {k.scopes.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {new Date(k.created_at).toLocaleDateString()}
                    {k.revoked_at && " · Revoked"}
                  </p>
                </div>
                {!k.revoked_at && (
                  <Button variant="ghost" size="icon" onClick={() => handleRevoke(k.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{generatedKey ? "Connection Ready" : "New Connection"}</DialogTitle>
              <DialogDescription>
                {generatedKey
                  ? "Copy this connection key now — it won't be shown again."
                  : "Name this connection so you can identify it later."}
              </DialogDescription>
            </DialogHeader>

            {generatedKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-3">
                  <code className="text-xs break-all flex-1">{generatedKey}</code>
                  <Button variant="ghost" size="icon" onClick={copyKey}><Copy className="h-4 w-4" /></Button>
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowCreate(false)}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <Input placeholder="App name (e.g. Jennie)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? "Hide advanced" : "Show advanced"}
                </button>
                {showAdvanced && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Permissions</p>
                    {ALL_SCOPES.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={newScopes.includes(s.id)}
                          onCheckedChange={(checked) => {
                            setNewScopes((prev) => checked ? [...prev, s.id] : prev.filter((x) => x !== s.id));
                          }}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={creating}>{creating ? "Connecting…" : "Connect"}</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
