import { Plus, MessageSquare, Trash2, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import type { Conversation } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar({ conversations, activeId, onSelect, onCreate, onDelete }: Props) {
  const { signOut, user } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
        <Shield className="h-5 w-5 text-primary garvis-text-glow" />
        <span className="font-mono text-sm font-bold tracking-widest text-primary garvis-text-glow">
          GARVIS
        </span>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <Button onClick={onCreate} variant="outline" className="w-full justify-start gap-2 font-mono text-xs border-border hover:border-primary/50 hover:bg-primary/5">
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
                activeId === c.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              onClick={() => onSelect(c.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
              <span className="truncate flex-1 text-xs">{c.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        <div className="text-xs text-muted-foreground truncate px-1">
          {user?.email}
        </div>
        <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground">
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
