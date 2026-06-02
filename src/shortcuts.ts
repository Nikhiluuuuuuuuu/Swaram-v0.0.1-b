export const DEFAULT_SHORTCUTS = {
  shortcut_toggle: "CommandOrControl+Shift+R",
  shortcut_hold: "CommandOrControl+Shift+Space",
  shortcut_cancel: "CommandOrControl+Alt+X",
} as const;

const NON_SHIFT_MODIFIERS = new Set([
  "ALT",
  "OPTION",
  "CTRL",
  "CONTROL",
  "SUPER",
  "CMD",
  "COMMAND",
  "COMMANDORCONTROL",
  "COMMANDORCTRL",
  "CMDORCTRL",
  "CMDORCONTROL",
]);

export function validateShortcut(shortcut: string) {
  const parts = shortcut
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "Shortcut cannot be empty.";
  }

  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
  const hasNonShiftModifier = modifiers.some((modifier) =>
    NON_SHIFT_MODIFIERS.has(modifier.toUpperCase())
  );

  if (isTextInputKey(key) && !hasNonShiftModifier) {
    return "Use Ctrl, Alt, Super/Command, or CommandOrControl with text keys. Shift-only shortcuts still type into the active app.";
  }

  return null;
}

function isTextInputKey(key: string) {
  const trimmed = key.trim();
  const upper = trimmed.toUpperCase();

  if (upper === "SPACE") return true;
  if (trimmed.length === 1) return /^[a-z0-9]$/i.test(trimmed);
  if (/^KEY[A-Z]$/i.test(trimmed)) return true;
  if (/^DIGIT[0-9]$/i.test(trimmed)) return true;
  return false;
}
