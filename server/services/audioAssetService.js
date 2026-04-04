import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

const AUDIO_EXTENSIONS = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
};

function ensureCacheDir() {
  fs.mkdirSync(config.dialogueAudioCacheDir, { recursive: true });
}

function resolveExtension(mimeType = '') {
  return AUDIO_EXTENSIONS[String(mimeType || '').toLowerCase()] || 'bin';
}

function buildAudioPath(assetId, extension) {
  return path.join(config.dialogueAudioCacheDir, `${assetId}.${extension}`);
}

function buildMetaPath(assetId) {
  return path.join(config.dialogueAudioCacheDir, `${assetId}.json`);
}

function readAssetMeta(assetId) {
  ensureCacheDir();
  const metaPath = buildMetaPath(assetId);
  if (!fs.existsSync(metaPath)) return null;
  try {
    const raw = fs.readFileSync(metaPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeAssetMeta(assetId, metadata) {
  ensureCacheDir();
  fs.writeFileSync(buildMetaPath(assetId), JSON.stringify(metadata, null, 2), 'utf8');
}

export function buildDialogueAudioAssetId({ engine, voice = 'default', text, speed = 'normal' }) {
  return crypto
    .createHash('sha1')
    .update(JSON.stringify({ engine, voice, speed, text: String(text || '').trim() }))
    .digest('hex');
}

export function resolveDialogueAudioAsset(assetId) {
  const metadata = readAssetMeta(assetId);
  if (!metadata?.extension) return null;
  const filePath = buildAudioPath(assetId, metadata.extension);
  if (!fs.existsSync(filePath)) return null;
  return {
    ...metadata,
    assetId,
    filePath,
  };
}

export function buildDialogueAudioUrl(assetId) {
  return `/api/dialogue/audio/${assetId}`;
}

export async function ensureDialogueAudioAsset(assetId, builder) {
  const existing = resolveDialogueAudioAsset(assetId);
  if (existing) {
    return {
      assetId,
      audioUrl: buildDialogueAudioUrl(assetId),
      audioSlowUrl: null,
      mimeType: existing.mimeType,
      durationMs: existing.durationMs || null,
    };
  }

  ensureCacheDir();
  const result = await builder();
  if (!result?.buffer?.length || !result?.mimeType) {
    throw new Error('Audio builder must return buffer and mimeType.');
  }

  const extension = resolveExtension(result.mimeType);
  const filePath = buildAudioPath(assetId, extension);
  fs.writeFileSync(filePath, result.buffer);
  writeAssetMeta(assetId, {
    mimeType: result.mimeType,
    durationMs: result.durationMs || null,
    extension,
    size: result.buffer.length,
    createdAt: new Date().toISOString(),
  });

  return {
    assetId,
    audioUrl: buildDialogueAudioUrl(assetId),
    audioSlowUrl: null,
    mimeType: result.mimeType,
    durationMs: result.durationMs || null,
  };
}
