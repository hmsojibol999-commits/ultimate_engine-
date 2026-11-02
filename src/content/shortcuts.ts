// Keyboard shortcuts that really exist in the shell (Desktop.tsx, CommandPalette.tsx). The Help app and the shortcuts
// overlay (F-28) both read this list. Add a row here only when the shortcut is implemented.
import type { StringKey } from './strings.en';

export interface ShortcutInfo { id: string; keys: string[]; label: StringKey }

export const SHORTCUTS: ShortcutInfo[] = [
  { id: 'palette', keys: ['Ctrl/Cmd', 'K'], label: 'help.sc.palette' },
  { id: 'search', keys: ['Ctrl/Cmd', 'Shift', 'K'], label: 'help.sc.search' },
  { id: 'cycle', keys: ['Ctrl', 'Alt', '← / →'], label: 'help.sc.cycle' },
  { id: 'shortcuts', keys: ['?'], label: 'help.sc.shortcuts' },
  { id: 'winMove', keys: ['← ↑ → ↓'], label: 'help.sc.move' },
  { id: 'winResize', keys: ['Shift', '← ↑ → ↓'], label: 'help.sc.resize' },
  { id: 'close', keys: ['Esc'], label: 'help.sc.close' },
];
