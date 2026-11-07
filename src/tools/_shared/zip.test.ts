import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { crc32, makeZip } from './zip';

const enc = (s: string) => new TextEncoder().encode(s);

describe('zip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(enc('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
  it('produces an archive Python can read back byte for byte (independent check)', () => {
    const files = [{ name: 'a.txt', data: enc('hello') }, { name: 'dir/ünï.bin', data: new Uint8Array([0, 1, 2, 255]) }, { name: 'empty', data: new Uint8Array(0) }];
    const dir = mkdtempSync(join(tmpdir(), 'zip-'));
    writeFileSync(join(dir, 't.zip'), makeZip(files));
    const out = execFileSync('python3', ['-c', `
import zipfile,json,sys
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
print(json.dumps({i.filename: list(z.read(i)) for i in z.infolist()}))`, join(dir, 't.zip')]).toString();
    expect(JSON.parse(out)).toEqual({ 'a.txt': [...enc('hello')], 'dir/ünï.bin': [0, 1, 2, 255], empty: [] });
    expect(readFileSync(join(dir, 't.zip')).length).toBeGreaterThan(100);
  });
});
