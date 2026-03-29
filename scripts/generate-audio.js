import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const vocabularyPath = path.join(rootDir, 'data', 'vocabulary.imported.json');
const publicDir = path.join(rootDir, 'public');
const wordsDir = path.join(publicDir, 'audio', 'words');
const examplesDir = path.join(publicDir, 'audio', 'examples');

const {
  DOUBAO_TTS_APP_ID,
  DOUBAO_TTS_TOKEN,
  DOUBAO_TTS_CLUSTER,
  DOUBAO_TTS_VOICE_TYPE = 'BV001_streaming',
  DOUBAO_TTS_ENCODING = 'mp3',
  DOUBAO_TTS_RATE = '24000',
  DOUBAO_TTS_SPEED_RATIO = '1.0',
  DOUBAO_TTS_VOLUME_RATIO = '1.0',
  DOUBAO_TTS_PITCH_RATIO = '1.0',
  DOUBAO_TTS_EMOTION = '',
  DOUBAO_TTS_LANGUAGE = 'cn',
} = process.env;

if (!DOUBAO_TTS_APP_ID || !DOUBAO_TTS_TOKEN || !DOUBAO_TTS_CLUSTER) {
  console.error('Missing Doubao TTS env vars: DOUBAO_TTS_APP_ID / DOUBAO_TTS_TOKEN / DOUBAO_TTS_CLUSTER');
  process.exit(1);
}

fs.mkdirSync(wordsDir, { recursive: true });
fs.mkdirSync(examplesDir, { recursive: true });

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number.parseInt(limitArg.split('=')[1], 10) : Number.POSITIVE_INFINITY;
const onlyMissing = args.has('--only-missing');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPayload(text) {
  const audio = {
    voice_type: DOUBAO_TTS_VOICE_TYPE,
    encoding: DOUBAO_TTS_ENCODING,
    compression_rate: 1,
    rate: Number.parseInt(DOUBAO_TTS_RATE, 10),
    speed_ratio: Number.parseFloat(DOUBAO_TTS_SPEED_RATIO),
    volume_ratio: Number.parseFloat(DOUBAO_TTS_VOLUME_RATIO),
    pitch_ratio: Number.parseFloat(DOUBAO_TTS_PITCH_RATIO),
    language: DOUBAO_TTS_LANGUAGE,
  };

  if (DOUBAO_TTS_EMOTION) {
    audio.emotion = DOUBAO_TTS_EMOTION;
  }

  return {
    app: {
      appid: DOUBAO_TTS_APP_ID,
      token: 'placeholder',
      cluster: DOUBAO_TTS_CLUSTER,
    },
    user: {
      uid: 'hanyutong-batch',
    },
    audio,
    request: {
      reqid: crypto.randomUUID(),
      text,
      text_type: 'plain',
      operation: 'query',
    },
  };
}

async function synthesizeToFile(text, outputPath) {
  const response = await fetch('https://openspeech.bytedance.com/api/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer;${DOUBAO_TTS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildPayload(text)),
  });

  if (!response.ok) {
    throw new Error(`Doubao HTTP TTS failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  if (payload?.code !== 3000 || !payload?.data) {
    throw new Error(`Doubao HTTP TTS returned error: ${JSON.stringify(payload)}`);
  }

  const audioBuffer = Buffer.from(payload.data, 'base64');
  fs.writeFileSync(outputPath, audioBuffer);
}

const vocabulary = JSON.parse(fs.readFileSync(vocabularyPath, 'utf8'));
let processed = 0;

for (const entry of vocabulary) {
  if (processed >= limit) break;

  const wordBaseName = String(entry.id).padStart(4, '0');
  const wordRelativePath = `/audio/words/${wordBaseName}.${DOUBAO_TTS_ENCODING}`;
  const wordOutputPath = path.join(wordsDir, `${wordBaseName}.${DOUBAO_TTS_ENCODING}`);

  const shouldDownloadWord = !onlyMissing || !fs.existsSync(wordOutputPath);
  if (shouldDownloadWord) {
    await synthesizeToFile(entry.chinese, wordOutputPath);
    await sleep(180);
  }
  entry.audio_word = wordRelativePath;

  const examples = Array.isArray(entry.examples) ? entry.examples : [];
  for (const [index, example] of examples.entries()) {
    if (!example?.chinese) continue;

    const exampleFileName = `${wordBaseName}-${index + 1}.${DOUBAO_TTS_ENCODING}`;
    const exampleRelativePath = `/audio/examples/${exampleFileName}`;
    const exampleOutputPath = path.join(examplesDir, exampleFileName);
    const shouldDownloadExample = !onlyMissing || !fs.existsSync(exampleOutputPath);

    if (shouldDownloadExample) {
      await synthesizeToFile(example.chinese, exampleOutputPath);
      await sleep(180);
    }

    example.audio = exampleRelativePath;
    if (index === 0) entry.audio_example = exampleRelativePath;
    if (index === 1) entry.audio_example_2 = exampleRelativePath;
  }

  processed += 1;
  console.log(`Generated Doubao audio for word #${entry.id} ${entry.chinese}`);
}

fs.writeFileSync(vocabularyPath, JSON.stringify(vocabulary, null, 2) + '\n', 'utf8');
console.log(`Doubao audio generation complete. Updated ${processed} vocabulary entries.`);
