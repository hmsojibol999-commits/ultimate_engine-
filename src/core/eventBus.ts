// Tiny typed event bus. Apps open files in other apps through it.
import type { CharacterCue } from './characterExpressionLogic';
export interface BusEvents {
  'app:open': { appId: string; file?: string };
  'file:open': { path: string };
  'toast': { kind: 'info' | 'success' | 'warning' | 'error'; text: string };
  'character:cue': { cue: CharacterCue };
}
type Handler<K extends keyof BusEvents> = (payload: BusEvents[K]) => void;

const handlers = new Map<keyof BusEvents, Set<Handler<keyof BusEvents>>>();

export function on<K extends keyof BusEvents>(type: K, fn: Handler<K>): () => void {
  const set = handlers.get(type) ?? new Set();
  set.add(fn as Handler<keyof BusEvents>);
  handlers.set(type, set);
  return () => { set.delete(fn as Handler<keyof BusEvents>); };
}

export function emit<K extends keyof BusEvents>(type: K, payload: BusEvents[K]): void {
  handlers.get(type)?.forEach((fn) => (fn as Handler<K>)(payload));
}
