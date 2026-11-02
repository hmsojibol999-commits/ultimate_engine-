import type { Lang } from './i18n';
import type { SearchItem } from './search';

/** A command the palette can run. Apps and shell code register their own (F-09). */
export interface Command {
  id: string;
  title: Record<Lang, string>;
  keywords?: string[];
  run: () => void | Promise<void>;
}

const commands = new Map<string, Command>();

/** Register (or replace) a command. Returns a function that removes it again. */
export function registerCommand(cmd: Command): () => void {
  commands.set(cmd.id, cmd);
  return () => { if (commands.get(cmd.id) === cmd) commands.delete(cmd.id); };
}

export const listCommands = (): Command[] => [...commands.values()];
export const getCommand = (id: string): Command | undefined => commands.get(id);

export function commandItems(lang: Lang): SearchItem[] {
  return listCommands().map((c) => ({ id: c.id, kind: 'command' as const, title: c.title[lang], keywords: [...(c.keywords ?? []), c.title.en, c.title.bn] }));
}

/** Run a command by id. A failing command never crashes the shell; the error is returned instead. */
export async function runCommand(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = commands.get(id);
  if (!c) return { ok: false, error: `Unknown command: ${id}` };
  try { await c.run(); return { ok: true }; } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
