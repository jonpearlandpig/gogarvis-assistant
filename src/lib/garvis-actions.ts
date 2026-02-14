export type GarvisAction =
  | { action: "CREATE_RECEIPTS_REPORT"; filters: any; title_hint?: string };

export function tryParseGarvisAction(text: string): GarvisAction | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (obj?.action === "CREATE_RECEIPTS_REPORT") return obj as GarvisAction;
    return null;
  } catch {
    return null;
  }
}
