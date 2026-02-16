import { useState, useRef, useEffect } from "react";
import { Plus, MessageSquare, Trash2, Shield, Pencil, FolderOpen, Home, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import type { Conversation } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
}

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  // Projects
  projects?: Project[];
  activeProjectId?: string | null;
  onSelectProject?: (id: string | null) => void;
  onCreateProject?: (name: string) => void;
  onRenameProject?: (id: string, name: string) => void;
  onDeleteProject?: (id: string) => void;
  scopeMode?: "home" | "project";
}

export function ConversationSidebar({ conversations, activeId, onSelect, onCreate, onDelete, onRename, projects = [], activeProjectId, onSelectProject, onCreateProject, onRenameProject, onDeleteProject, scopeMode = "home" }: Props) {
  const { signOut, user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectValue, setEditProjectValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  useEffect(() => {
    if (editingProjectId && projectInputRef.current) {
      projectInputRef.current.focus();
      projectInputRef.current.select();
    }
  }, [editingProjectId]);

  const startRename = (c: Conversation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingId(c.id);
    setEditValue(c.title);
  };

  const commitRename = () => {
    if (editingId && editValue.trim() && onRename) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const startProjectRename = (p: Project, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingProjectId(p.id);
    setEditProjectValue(p.name);
  };

  const commitProjectRename = () => {
    if (editingProjectId && editProjectValue.trim() && onRenameProject) {
      onRenameProject(editingProjectId, editProjectValue.trim());
    }
    setEditingProjectId(null);
  };

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border">
        <Shield className="h-5 w-5 text-primary garvis-text-glow" />
        <span className="font-mono text-sm font-bold tracking-widest text-primary garvis-text-glow">
          GARVIS
        </span>
      </div>

      {/* Projects section */}
      {projects.length > 0 && onSelectProject && (
        <div className="px-2 pt-3 pb-1">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
            Projects
          </div>
          <div className="space-y-0.5">
            <div
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs cursor-pointer transition-colors",
                scopeMode === "home"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              onClick={() => onSelectProject(null)}
            >
              <Home className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="truncate flex-1">Home (Canonical)</span>
            </div>
            {projects.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-3 py-1.5 text-xs cursor-pointer transition-colors",
                  activeProjectId === p.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                onClick={() => onSelectProject(p.id)}
                onDoubleClick={() => startProjectRename(p)}
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-60" />
                {editingProjectId === p.id ? (
                  <input
                    ref={projectInputRef}
                    value={editProjectValue}
                    onChange={(e) => setEditProjectValue(e.target.value)}
                    onBlur={commitProjectRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitProjectRename();
                      if (e.key === "Escape") setEditingProjectId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-xs bg-transparent border-b border-primary/50 outline-none py-0.5"
                  />
                ) : (
                  <span className="truncate flex-1">{p.name}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); startProjectRename(p, e); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                </button>
                {onDeleteProject && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {onCreateProject && (
            <button
              onClick={() => onCreateProject("New Project")}
              className="flex items-center gap-2 px-3 py-1.5 mt-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full rounded-md hover:bg-sidebar-accent/50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Project</span>
            </button>
          )}
        </div>
      )}

      {/* Divider between projects and chats */}
      {projects.length > 0 && (
        <div className="px-4 py-1">
          <div className="border-t border-sidebar-border" />
        </div>
      )}

      {/* New Chat */}
      <div className="px-2 pb-1">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-3 mb-1.5 mt-2">
          Sessions
        </div>
        <Button onClick={onCreate} variant="outline" size="sm" className="w-full justify-start gap-2 font-mono text-xs border-border hover:border-primary/50 hover:bg-primary/5">
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
              onDoubleClick={() => startRename(c)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
              {editingId === c.id ? (
                <input
                  ref={inputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs bg-transparent border-b border-primary/50 outline-none py-0.5"
                />
              ) : (
                <span className="truncate flex-1 text-xs">{c.title}</span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); startRename(c, e); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
              </button>
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

      {/* Footer — user profile */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className="h-8 w-8 shrink-0 rounded-full border border-border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground">
              {(user?.email?.[0] ?? "?").toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {user?.user_metadata?.full_name && (
              <div className="truncate text-xs font-medium text-sidebar-foreground">
                {user.user_metadata.full_name}
              </div>
            )}
            <div className="truncate text-[11px] text-muted-foreground">
              {user?.email}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}