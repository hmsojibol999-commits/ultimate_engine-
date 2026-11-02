import { Vfs } from './vfs';
import { IdbAdapter, MemoryAdapter } from './adapters';
import { capabilities } from '../capabilities';

export { Vfs } from './vfs';
export * from './types';
export * from './path';
export { MemoryAdapter, IdbAdapter } from './adapters';

let instance: Vfs | null = null;
/** App-wide VFS. IndexedDB when available, otherwise memory (with a one-session warning from the shell). */
export function getVfs(): Vfs {
  return (instance ??= new Vfs(capabilities().indexedDB ? new IdbAdapter() : new MemoryAdapter()));
}
