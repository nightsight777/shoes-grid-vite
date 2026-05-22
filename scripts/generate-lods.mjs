/**
 * scripts/generate-lods.mjs
 *
 * Uses @gltf-transform to generate medium and low LOD variants for each
 * shoe model. Run with:  node scripts/generate-lods.mjs
 *
 * LOD strategy:
 *   ultra  – the existing full-quality file (no change)
 *   high   – simplified to 80% triangle budget (ratio 0.8)
 *   medium – simplified to 50% triangle budget (ratio 0.5)
 *   low    – simplified to 20% triangle budget (ratio 0.2)
 *
 * All tiers are stored alongside the source files under assets/shoes-lod/.
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, weld, simplify, prune, reorder, quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { readdir, mkdir, stat, writeFile } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT      = join(__dirname, '..');
const SRC_DIR   = join(ROOT, 'src', 'assets', 'shoesRenderrs');
const OUT_DIR   = join(ROOT, 'src', 'assets', 'shoes-lod');

// LOD ratio table
const LOD_LEVELS = {
  high:   { ratio: 0.80, label: 'high' },
  medium: { ratio: 0.50, label: 'medium' },
  low:    { ratio: 0.20, label: 'low' },
};

await mkdir(OUT_DIR, { recursive: true });

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  });

const kb = (n) => (n / 1024).toFixed(1) + ' KB';

const entries = await readdir(SRC_DIR);
const glbs = entries.filter(f => extname(f).toLowerCase() === '.glb');

if (!glbs.length) {
  console.warn(`No .glb files found in ${SRC_DIR}`);
  process.exit(0);
}

console.log(`Found ${glbs.length} models — generating LODs…\n`);

for (const file of glbs) {
  const inputPath = join(SRC_DIR, file);
  const baseName = file.replace(/\.glb$/i, '');

  for (const [tier, cfg] of Object.entries(LOD_LEVELS)) {
    const outputPath = join(OUT_DIR, `${baseName}-${tier}.glb`);
    const size = await stat(inputPath).then(s => s.size);

    process.stdout.write(`  ${file} [${tier}] … `);

    try {
      const doc = await io.read(inputPath);

      await doc.transform(
        dedup(),
        // Only weld / simplify for medium and low to save time on high
        tier === 'high'
          ? quantize()
          : simplify({
              simplifier: MeshoptSimplifier,
              ratio: cfg.ratio,
              error: 0.01,
            }),
        tier !== 'high' ? weld({ tolerance: 0.0001 }) : undefined,
        tier !== 'high' ? prune() : undefined,
        quantize(),
        reorder({ encoder: MeshoptEncoder }),
      );

      doc.createExtension(EXTMeshoptCompression)
        .setRequired(true)
        .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });

      await io.write(outputPath, doc);

      const after = await stat(outputPath).then(s => s.size);
      console.log(`${kb(size)} → ${kb(after)}`);
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
    }
  }
}

console.log('\nDone. LOD files written to', OUT_DIR);