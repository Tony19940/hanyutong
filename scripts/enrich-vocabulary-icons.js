import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveWordVisual } from '../src/utils/iconography.js';

async function main() {
  const target = process.argv[2] ?? path.resolve('data/vocabulary.imported.json');
  const raw = await fs.readFile(target, 'utf8');
  const vocabulary = JSON.parse(raw);

  const enriched = vocabulary.map((word) => ({
    ...word,
    visual: (() => {
      const visual = resolveWordVisual({ ...word, visual: null });
      return {
        source: visual.source,
        symbol: visual.symbol,
        key: visual.key,
        accent: visual.accent,
        assetUrl: visual.assetUrl,
        assetAlt: visual.assetAlt,
      };
    })(),
  }));

  await fs.writeFile(target, `${JSON.stringify(enriched, null, 2)}\n`, 'utf8');
  console.log(`Enriched ${enriched.length} vocabulary entries with visual metadata.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
