import { create } from 'zustand';

/** Open/closed state of the keyboard shortcuts overlay (F-28). The "?" key, the palette command and other code use this. */
interface ShortcutsPanelState { open: boolean; show: () => void; hide: () => void; toggle: () => void }

export const useShortcutsPanel = create<ShortcutsPanelState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
