// Validate a file change against project rules/structure
export function validateFileChange({ file, diff }: { file: string; diff: string }): { valid: boolean; reason?: string } {
  // Example rules: must be in src/ or public/, must not overwrite config, must be .ts/.tsx/.json/.md/.css/.js
  if (!file.match(/^(src|public)\//)) {
    return { valid: false, reason: 'File must be in src/ or public/.' };
  }
  if (file.match(/(package|tsconfig|vite|postcss|tailwind|eslint|lock|README|\.env|supabase|migrations|node_modules|test|tmp|\.git)/i)) {
    return { valid: false, reason: 'Cannot modify core config, environment, or system files.' };
  }
  if (!file.match(/\.(ts|tsx|js|jsx|json|md|css)$/)) {
    return { valid: false, reason: 'Only code, markdown, and style files are allowed.' };
  }
  // Add more rules as needed
  return { valid: true };
}
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
