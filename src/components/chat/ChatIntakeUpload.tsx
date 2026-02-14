import { useRef } from "react";
import { uploadAKBFile } from "@/lib/akbUpload";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface ChatIntakeUploadProps {
  userId: string;
  workspaceId?: string | null;
  onDone: () => void;
}

export function ChatIntakeUpload({ userId, workspaceId, onDone }: ChatIntakeUploadProps) {
  const ref = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    try {
      for (const f of arr) {
        await uploadAKBFile({ userId, workspaceId: workspaceId || null, file: f });
      }
      toast.success(`Uploaded ${arr.length} file(s)`);
      onDone();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline transition-colors"
        onClick={() => ref.current?.click()}
      >
        <Upload className="h-3.5 w-3.5" />
        Upload first file to begin
      </button>
      <input
        ref={ref}
        type="file"
        className="hidden"
        multiple
        onChange={async (e) => {
          await handle(e.target.files);
          if (e.target) e.target.value = "";
        }}
      />
    </div>
  );
}
