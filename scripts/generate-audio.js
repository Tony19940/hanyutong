import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const vocabularyPath = path.join(rootDir, 'data', 'vocabulary.json');
const publicDir = path.join(rootDir, 'public');
const wordsDir = path.join(publicDir, 'audio', 'words');
const examplesDir = path.join(publicDir, 'audio', 'examples');

fs.mkdirSync(wordsDir, { recursive: true });
fs.mkdirSync(examplesDir, { recursive: true });

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : Number.POSITIVE_INFINITY;
const onlyMissing = args.has('--only-missing');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadTts(text, outputPath) {
  const endpoint = new URL('https://translate.google.com/translate_tts');
  endpoint.searchParams.set('ie', 'UTF-8');
  endpoint.searchParams.set('tl', 'zh-CN');
  endpoint.searchParams.set('client', 'tw-ob');
  endpoint.searchParams.set('q', text);

  const response = await fetch(endpoint, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`TTS request failed (${response.status}) for: ${text}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, audioBuffer);
}

const vocabulary = JSON.parse(fs.readFileSync(vocabularyPath, 'utf8'));
let processed = 0;

for (const entry of vocabulary) {
  if (processed >= limit) break;

  const fileBaseName = String(entry.id).padStart(4, '0');
  const wordRelativePath = `/audio/words/${fileBaseName}.mp3`;
  const exampleRelativePath = `/audio/examples/${fileBaseName}.mp3`;
  const wordOutputPath = path.join(wordsDir, `${fileBaseName}.mp3`);
  const exampleOutputPath = path.join(examplesDir, `${fileBaseName}.mp3`);

  const shouldDownloadWord = !onlyMissing || !fs.existsSync(wordOutputPath);
  const shouldDownloadExample = !onlyMissing || !fs.existsSync(exampleOutputPath);

  if (shouldDownloadWord) {
    await downloadTts(entry.chinese, wordOutputPath);
    await sleep(250);
  }

  if (entry.example_cn && shouldDownloadExample) {
    await downloadTts(entry.example_cn, exampleOutputPath);
    await sleep(250);
  }

  entry.audio_word = wordRelativePath;
  entry.audio_example = entry.example_cn ? exampleRelativePath : null;
  processed += 1;
  console.log(`Generated audio for word #${entry.id}`);
}

fs.writeFileSync(vocabularyPath, JSON.stringify(vocabulary, null, 2) + '\n', 'utf8');
console.log(`Audio generation complete. Updated ${processed} vocabulary entries.`);
