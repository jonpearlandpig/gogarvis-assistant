import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface AKBEntry {
  id: string;
  telauthorium_id: string;
  title: string;
  content: string;
  category: string;
  source_type: "human" | "decision_object";
  source_conversation_id: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  telauthorium_id: string;
  action: string;
  actor: string;
  context: string | null;
  created_at: string;
}

export function useAKB() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AKBEntry[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("akb_entries")
      .select("*")
      .order("created_at", { ascending: false });
    setEntries((data as AKBEntry[]) || []);
    setLoading(false);
  }, [user]);

  const fetchLedger = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("telauthorium_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setLedger((data as LedgerEntry[]) || []);
  }, [user]);

  useEffect(() => {
    fetchEntries();
    fetchLedger();
  }, [fetchEntries, fetchLedger]);

  const addEntry = async (entry: {
    title: string;
    content: string;
    category: string;
    source_type?: "human" | "decision_object";
    source_conversation_id?: string | null;
  }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("akb_entries")
      .insert({
        user_id: user.id,
        title: entry.title,
        content: entry.content,
        category: entry.category,
        source_type: entry.source_type || "human",
        source_conversation_id: entry.source_conversation_id || null,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Failed to save to AKB");
      console.error(error);
      return null;
    }

    toast.success("Saved to AKB with Telauthorium ID");
    await fetchEntries();
    await fetchLedger();
    return data as AKBEntry;
  };

  return { entries, ledger, loading, addEntry, refetch: fetchEntries };
}
