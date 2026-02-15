import { useState, useRef } from "react";
import { Send, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { uploadAKBFile } from "@/lib/akbUpload";
import { toast } from "sonner";
import garvisLogoBlack from "@/assets/garvis_logo_black.png";
import { AKBStructurePanel } from "@/components/akb/AKBStructurePanel";
import type { StructureEntry } from "@/components/akb/AKBStructurePanel";
import { WhyAKBCollapsible } from "@/components/akb/WhyAKBCollapsible";

interface AKBBuildHeroProps {
  isStreaming: boolean;
  onSend: (text: string) => void;
  userId?: string;
  workspaceId?: string | null;
  onFilesUploaded?: (uploadIds: string[]) => void;
  structureEntries?: StructureEntry[];
  onStartBuilding?: () => void;
}

export function AKBBuildHero({
  isStreaming,
  onSend,
  userId,
  workspaceId,
  onFilesUploaded,
  structureEntries = [],
  onStartBuilding,
}: AKBBuildHeroProps) {
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    onSend(text);
  };

  const handlePickFiles = async (files: FileList) => {
    if (!userId) return;
    const arr = Array.from(files);
    try {
      const uploadIds: string[] = [];
      for (const f of arr) {
        const result = await uploadAKBFile({ userId, workspaceId: workspaceId || null, file: f });
        if (result?.id) uploadIds.push(result.id);
      }
      console.log("HERO UPLOAD COMPLETE → uploadIds:", uploadIds);
      toast.success(`Uploaded ${arr.length} file(s)`);
      onFilesUploaded?.(uploadIds);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-12">
        {/* Logo — huge and prominent */}
        <div className="flex justify-center">
          <img
            src={garvisLogoBlack}
            alt="goGARVIS"
            className="h-48 sm:h-64 md:h-80 lg:h-96"
          />
        </div>

        {/* Why AKB — collapsible + CTAs */}
        <WhyAKBCollapsible
          onStartBuilding={onStartBuilding}
          onExploreFirst={() =>
            onSend(
              "Explore First (Foundation Mode): Give me a brief overview of what you can do right now, and what unlocks as my AKB coverage increases. Keep it concise."
            )
          }
        />

        {/* Card with input */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-lg shadow-black/20">
          <div className="flex items-end gap-2">
            {/* Plus menu */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((p) => !p);
                }}
                className="h-9 w-9"
              >
                <Plus className="h-4 w-4" />
              </Button>

              {menuOpen && (
                <div
                  className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-border bg-card shadow-lg z-50 py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                    onClick={() => {
                      setMenuOpen(false);
                      fileRef.current?.click();
                    }}
                  >
                    Add files / photos
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                    onClick={() => {
                      setMenuOpen(false);
                      setInput("https://");
                    }}
                  >
                    Add website link
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors text-foreground"
                    onClick={() => {
                      setMenuOpen(false);
                      setInput("");
                    }}
                  >
                    Paste text
                  </button>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp"
                onChange={async (e) => {
                  if (e.target.files?.length) await handlePickFiles(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </div>

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Go Garvis!"
              className="min-h-[44px] max-h-32 resize-none bg-muted border-border font-mono text-sm"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isStreaming) handleSubmit();
                }
              }}
            />

            <Button
              type="button"
              className="h-9"
              onClick={handleSubmit}
              disabled={!input.trim() || isStreaming}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* View Structure + tagline */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setShowStructure(true)}
            className="text-xs text-muted-foreground hover:text-foreground font-mono transition-colors"
          >
            View Structure
          </button>
          <span className="text-[10px] text-muted-foreground/40">•</span>
          <p className="text-xs text-muted-foreground font-mono tracking-wide">
            Lift the learner. Launch the leader.
          </p>
        </div>
      </div>

      <AKBStructurePanel
        open={showStructure}
        onClose={() => setShowStructure(false)}
        entries={structureEntries}
      />
    </div>
  );
}
