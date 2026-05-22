import { copyFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const SRC = join(here, '..', 'node_modules', 'three', 'examples', 'jsm', 'libs', 'basis');
const DST = join(here, '..', 'public', 'basis');

try { await access(SRC); }
catch { console.warn(`[copy-basis] source missing: ${SRC} — skipping`); process.exit(0); }

await mkdir(DST, { recursive: true });
for (const file of ['basis_transcoder.js', 'basis_transcoder.wasm']) {
  await copyFile(join(SRC, file), join(DST, file));
}
console.log(`[copy-basis] copied transcoder → public/basis/`);
