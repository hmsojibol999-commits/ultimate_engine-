// Workspace restore and autosave (F-17). Glue between the window store, localStorage and the VFS.
// The rules live in shell/workspaceLogic.ts (tested); this file only wires them up and never throws.
import { getApp } from '../core/registry';
import { getVfs } from '../core/vfs';
import { useWindows, viewport } from './windowStore';
import { parseWorkspace, serializeWorkspace, SAVE_DELAY_MS, WORKSPACE_KEY, type SavedWindow } from './workspaceLogic';

const canOpen = (appId: string): boolean => getApp(appId)?.enabled === true;

/** Keep a saved file only if it still exists in the VFS; otherwise the window opens without a file. */
async function withExistingFiles(items: SavedWindow[]): Promise<SavedWindow[]> {
  let vfs: ReturnType<typeof getVfs>;
  try { vfs = getVfs(); } catch { return items.map(({ file: _f, ...rest }) => { void _f; return rest; }); }
  return Promise.all(items.map(async (item) => {
    if (!item.file) return item;
    let ok = false;
    try { ok = await vfs.exists(item.file); } catch { ok = false; }
    if (ok) return item;
    const { file: _gone, ...rest } = item;
    void _gone;
    return rest;
  }));
}

/**
 * Put the saved windows back. Returns 'restored' when a saved workspace was applied (even an empty desktop, because the
 * visitor closed everything on purpose) and 'none' when there is nothing saved or storage is blocked (first visit).
 */
export async function restoreWorkspace(): Promise<'restored' | 'none'> {
  let raw: string | null = null;
  try { raw = localStorage.getItem(WORKSPACE_KEY); } catch { return 'none'; }
  const ws = parseWorkspace(raw, canOpen, viewport());
  if (!ws) return 'none';
  const items = await withExistingFiles(ws.windows);
  useWindows.getState().restore(items, ws.focusedIndex);
  return 'restored';
}

/**
 * Save the workspace after every window change (waits SAVE_DELAY_MS so a drag writes once), and once more when the page
 * is hidden or closed. Call after restoreWorkspace() has finished, otherwise the empty startup state would overwrite
 * the saved one. Returns a function that stops saving.
 */
export function startWorkspaceAutosave(): () => void {
  let last = '';
  let timer: number | undefined;
  const save = () => {
    const { windows, focusedId } = useWindows.getState();
    const json = serializeWorkspace(windows, focusedId);
    if (json === last) return;
    last = json;
    try { localStorage.setItem(WORKSPACE_KEY, json); } catch { /* storage blocked or full: the desktop just starts fresh next time */ }
  };
  const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(save, SAVE_DELAY_MS); };
  const flush = () => { window.clearTimeout(timer); save(); };
  const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };

  const off = useWindows.subscribe(schedule);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', flush);
  schedule(); // save the state we start from, so an untouched first visit is remembered too
  return () => {
    off();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', flush);
    flush();
  };
}
