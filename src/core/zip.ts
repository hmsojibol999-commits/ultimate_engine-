// Minimal ZIP reader/writer with no dependencies (F-16 zip core, used by the .sgrid backup, F-24).
// Writer: "stored" entries only (no compression), so output is simple and always valid.
// Reader: stored and deflate entries (deflate uses the browser's DecompressionStream). No ZIP64, no encryption.

export interface ZipEntry { name: string; data: Uint8Array; mtime?: number }

export type ZipErrorCode = 'NOT_ZIP' | 'CORRUPT' | 'UNSUPPORTED' | 'TOO_BIG';
export class ZipError extends Error {
  constructor(public code: ZipErrorCode, message: string) {
    super(message);
    this.name = 'ZipError';
  }
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_END = 0x06054b50;
const MAX_U32 = 0xfffffffe;
export const DEFAULT_MAX_UNPACKED_BYTES = 500 * 1024 * 1024;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = (CRC_TABLE[(c ^ (data[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function toDos(ms: number): { time: number; date: number } {
  const d = new Date(ms);
  const year = Math.min(2107, Math.max(1980, d.getFullYear()));
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function fromDos(date: number, time: number): number {
  return new Date(1980 + (date >> 9), Math.max(0, ((date >> 5) & 15) - 1), Math.max(1, date & 31), time >> 11, (time >> 5) & 63, (time & 31) * 2).getTime();
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** Build a ZIP file (stored, UTF-8 names). Pass `mtime` per entry for repeatable output. */
export function zipStore(entries: ZipEntry[], now: number = Date.now()): Uint8Array {
  if (entries.length > 0xffff) throw new ZipError('TOO_BIG', 'Too many files for one zip');
  const enc = new TextEncoder();
  const body: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const size = e.data.length;
    if (name.length > 0xffff || size > MAX_U32 || offset > MAX_U32) throw new ZipError('TOO_BIG', 'File too large for zip');
    const crc = crc32(e.data);
    const { time, date } = toDos(e.mtime ?? now);

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, SIG_LOCAL, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true);
    lv.setUint16(10, time, true); lv.setUint16(12, date, true); lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true); lv.setUint32(22, size, true); lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true);
    local.set(name, 30);

    const cen = new Uint8Array(46 + name.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, SIG_CENTRAL, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true); cv.setUint16(14, date, true); cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true); cv.setUint32(24, size, true); cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true); cv.setUint16(32, 0, true); cv.setUint16(34, 0, true); cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true); cv.setUint32(42, offset, true);
    cen.set(name, 46);

    body.push(local, e.data);
    central.push(cen);
    offset += local.length + size;
  }
  const cenSize = central.reduce((n, c) => n + c.length, 0);
  if (offset + cenSize > MAX_U32) throw new ZipError('TOO_BIG', 'Zip is too large');
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, SIG_END, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cenSize, true); ev.setUint32(16, offset, true); ev.setUint16(20, 0, true);
  return concat([...body, ...central, end]);
}

async function inflateRaw(raw: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new ZipError('UNSUPPORTED', 'This browser cannot read compressed zip files');
  const stream = new Blob([raw as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Read every entry of a ZIP file. Verifies sizes and CRC. Folder entries (name ends with '/') have empty data. */
export async function readZip(bytes: Uint8Array, opts: { maxUnpackedBytes?: number } = {}): Promise<ZipEntry[]> {
  const max = opts.maxUnpackedBytes ?? DEFAULT_MAX_UNPACKED_BYTES;
  if (bytes.length < 22) throw new ZipError('NOT_ZIP', 'Not a zip file');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (v.getUint32(i, true) === SIG_END) { eocd = i; break; }
  }
  if (eocd < 0) throw new ZipError('NOT_ZIP', 'Not a zip file');
  const total = v.getUint16(eocd + 10, true);
  const cenSize = v.getUint32(eocd + 12, true);
  const cenOff = v.getUint32(eocd + 16, true);
  if (total === 0xffff || cenOff === 0xffffffff || cenSize === 0xffffffff) throw new ZipError('UNSUPPORTED', 'ZIP64 files are not supported');
  if (cenOff + cenSize > eocd) throw new ZipError('CORRUPT', 'Zip directory is damaged');

  const dec = new TextDecoder();
  interface Meta { name: string; method: number; crc: number; csize: number; usize: number; lho: number; mtime: number }
  const metas: Meta[] = [];
  let p = cenOff;
  let declared = 0;
  for (let i = 0; i < total; i++) {
    if (p + 46 > bytes.length || v.getUint32(p, true) !== SIG_CENTRAL) throw new ZipError('CORRUPT', 'Zip directory is damaged');
    const flags = v.getUint16(p + 8, true);
    if (flags & 1) throw new ZipError('UNSUPPORTED', 'Encrypted zip files are not supported');
    const nlen = v.getUint16(p + 28, true), elen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true);
    if (p + 46 + nlen > bytes.length) throw new ZipError('CORRUPT', 'Zip directory is damaged');
    const usize = v.getUint32(p + 24, true);
    declared += usize;
    if (declared > max) throw new ZipError('TOO_BIG', 'Zip contents are too large');
    metas.push({
      name: dec.decode(bytes.subarray(p + 46, p + 46 + nlen)),
      method: v.getUint16(p + 10, true),
      mtime: fromDos(v.getUint16(p + 14, true), v.getUint16(p + 12, true)),
      crc: v.getUint32(p + 16, true),
      csize: v.getUint32(p + 20, true),
      usize,
      lho: v.getUint32(p + 42, true),
    });
    p += 46 + nlen + elen + clen;
  }

  const out: ZipEntry[] = [];
  for (const m of metas) {
    if (m.lho + 30 > bytes.length || v.getUint32(m.lho, true) !== SIG_LOCAL) throw new ZipError('CORRUPT', `Damaged entry: ${m.name}`);
    const start = m.lho + 30 + v.getUint16(m.lho + 26, true) + v.getUint16(m.lho + 28, true);
    if (start + m.csize > bytes.length) throw new ZipError('CORRUPT', `Damaged entry: ${m.name}`);
    const raw = bytes.subarray(start, start + m.csize);
    let data: Uint8Array;
    if (m.method === 0) data = raw.slice();
    else if (m.method === 8) data = await inflateRaw(raw);
    else throw new ZipError('UNSUPPORTED', `Unsupported compression in: ${m.name}`);
    if (data.length !== m.usize || crc32(data) !== m.crc) throw new ZipError('CORRUPT', `Damaged entry: ${m.name}`);
    out.push({ name: m.name, data, mtime: m.mtime });
  }
  return out;
}
