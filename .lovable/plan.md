

# Add API Keys Panel — User-Friendly Settings Sheet

Instead of embedding the API Keys panel into the Profile side panel or adding another top-bar button, we will use a **bottom sheet / slide-over drawer** triggered from a simple "Connections" button inside the existing Profile panel. This keeps the workspace clean and puts API key management exactly where a non-technical user would look: under their profile settings.

## Approach

Use the existing `Sheet` component (already in `src/components/ui/sheet.tsx`) to render the `APIKeysPanel` as a slide-up drawer. The trigger will be a friendly "Connections" button at the bottom of the `ProfilePanel`.

## Changes

### 1. `src/components/workspace/ProfilePanel.tsx`
- Import `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` and `APIKeysPanel`
- Add a "Connections" button (with a plug/link icon) below the "Save Profile" button
- Clicking it opens a Sheet (slide-up on mobile, slide-right on desktop) containing the `APIKeysPanel`
- Label it "Connections" not "API Keys" — friendlier for non-tech users

### 2. `src/components/workspace/APIKeysPanel.tsx`
- Rename the card title from "API Keys" to "Connected Apps"
- Change description to "Connect external tools like Jennie or Compass to your account"
- Rename "New Key" button to "New Connection"
- In the create dialog, change "Key label" placeholder to "App name (e.g. Jennie)"
- Hide the "Scopes" checkboxes behind a "Show advanced" toggle — default them all to checked
- This makes the entire flow feel like connecting an app, not managing API keys

Two files changed, zero new navigation concepts.

