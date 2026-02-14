import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Msg } from "@/lib/stream-chat";

export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<(Msg & { id?: string })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setMessages(
          (data || []).map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
        setLoading(false);
      });
  }, [conversationId]);

  const addMessage = useCallback(
    async (role: "user" | "assistant", content: string) => {
      if (!conversationId) return;
      const { data } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, role, content })
        .select()
        .single();
      return data;
    },
    [conversationId]
  );

  const appendLocal = useCallback((msg: Msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateLastAssistant = useCallback((content: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
        return prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, content } : m
        );
      }
      return [...prev, { role: "assistant" as const, content }];
    });
  }, []);

  return { messages, loading, addMessage, appendLocal, updateLastAssistant, setMessages };
}
