import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, weld, simplify, prune, reorder, quantize, textureCompress, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readdir, mkdir, stat, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = fileURLToPath(new URL('.', import.meta.url));
const SRC_DIR = join(here, '..', 'src', 'assets', 'shoesRenderrs');
const OUT_DIR = join(here, '..', 'src', 'assets', 'shoes-optimized');

await mkdir(OUT_DIR, { recursive: true });

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  });

function runUastc(input, output) {
  return new Promise((resolve, reject) => {
    const args = [
      'gltf-transform', 'uastc', input, output,
      '--level', '4',
      '--rdo', 'true',
      '--rdo-lambda', '1.0',
      '--mipmaps', 'true',
      '--filter', 'lanczos4',
    ];
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve();
      else {
        if (/toktx/i.test(stderr)) {
          reject(new Error(
            `UASTC step failed — KTX-Software (toktx) is not installed or not on PATH.\n` +
            `Install from: https://github.com/KhronosGroup/KTX-Software/releases\n` +
            `On Windows, run the installer and restart your terminal.\n\n` +
            `--- toktx stderr ---\n${stderr}`
          ));
        } else {
          reject(new Error(`gltf-transform uastc exited ${code}\n${stderr}`));
        }
      }
    });
  });
}

const entries = await readdir(SRC_DIR);
const glbs = entries.filter(f => extname(f).toLowerCase() === '.glb');

if (!glbs.length) {
  console.warn(`No .glb files in ${SRC_DIR}.`);
  process.exit(0);
}

const kb = (n) => (n / 1024).toFixed(1) + ' KB';

for (const file of glbs) {
  const inputPath = join(SRC_DIR, file);
  const tmpPath = join(OUT_DIR, `.tmp-${file}`);
  const outputPath = join(OUT_DIR, file);
  const before = (await stat(inputPath)).size;

  const doc = await io.read(inputPath);
  await doc.transform(
    dedup(),
    resample(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'png', resize: [1024, 1024] }),
    weld({ tolerance: 0.0001 }),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.005 }),
    reorder({ encoder: MeshoptEncoder }),
    quantize(),
  );
  doc.createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });

  await io.write(tmpPath, doc);

  process.stdout.write(`${file}  encoding UASTC… `);
  try {
    await runUastc(tmpPath, outputPath);
    const after = (await stat(outputPath)).size;
    const ratio = (before / after).toFixed(1);
    console.log(`${kb(before)} → ${kb(after)}  (${ratio}× smaller)`);
  } finally {
    try { await unlink(tmpPath); } catch {}
  }
}
