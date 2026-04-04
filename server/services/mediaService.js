import crypto from 'crypto';
import sharp from 'sharp';
import { query } from '../db.js';
import { badRequest, notFound } from '../errors.js';

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);

function isAllowedImageMimeType(value) {
  return IMAGE_MIME_TYPES.has(String(value || '').toLowerCase());
}

function asMediaUrl(id) {
  return `/api/media/${id}`;
}

function coercePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function normalizeImageUpload(buffer, mimeType, options = {}) {
  if (!buffer?.length) {
    throw badRequest('Image file is required', 'IMAGE_REQUIRED');
  }
  if (!isAllowedImageMimeType(mimeType)) {
    throw badRequest('Unsupported image type', 'UNSUPPORTED_IMAGE_TYPE');
  }

  const square = Boolean(options.square);
  const maxWidth = coercePositiveInt(options.maxWidth, square ? 512 : 1600);
  const maxHeight = coercePositiveInt(options.maxHeight, square ? 512 : 1600);
  const quality = coercePositiveInt(options.quality, 84);

  let pipeline = sharp(buffer, { animated: false }).rotate();
  if (square) {
    pipeline = pipeline.resize(maxWidth, maxHeight, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: false,
    });
  } else {
    pipeline = pipeline.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const image = pipeline.webp({ quality });
  const metadata = await image.metadata();
  const normalized = await image.toBuffer();

  return {
    buffer: normalized,
    mimeType: 'image/webp',
    width: metadata.width || null,
    height: metadata.height || null,
    sizeBytes: normalized.length,
  };
}

export async function createMediaAsset({
  ownerUserId = null,
  scope = 'admin',
  category,
  fileName = null,
  buffer,
  mimeType,
  width = null,
  height = null,
}, client = null) {
  const id = crypto.randomUUID();
  await query(
    `
      INSERT INTO media_assets (
        id,
        owner_user_id,
        scope,
        category,
        mime_type,
        file_name,
        bytes,
        size_bytes,
        width,
        height
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      id,
      ownerUserId,
      scope,
      category,
      mimeType,
      fileName,
      buffer,
      buffer.length,
      width,
      height,
    ],
    client
  );
  return {
    id,
    url: asMediaUrl(id),
    mimeType,
    width,
    height,
  };
}

export async function createNormalizedImageAsset({
  ownerUserId = null,
  scope = 'admin',
  category,
  fileName = null,
  buffer,
  mimeType,
  square = false,
  maxWidth,
  maxHeight,
  quality,
}, client = null) {
  const normalized = await normalizeImageUpload(buffer, mimeType, {
    square,
    maxWidth,
    maxHeight,
    quality,
  });

  return createMediaAsset(
    {
      ownerUserId,
      scope,
      category,
      fileName,
      buffer: normalized.buffer,
      mimeType: normalized.mimeType,
      width: normalized.width,
      height: normalized.height,
    },
    client
  );
}

export async function getMediaAsset(assetId, client = null) {
  const result = await query(
    `
      SELECT id, owner_user_id, scope, category, mime_type, file_name, bytes, size_bytes, width, height
      FROM media_assets
      WHERE id = $1
    `,
    [assetId],
    client
  );
  const asset = result.rows[0];
  if (!asset) {
    throw notFound('Media asset not found', 'MEDIA_ASSET_NOT_FOUND');
  }
  return asset;
}

export async function deleteMediaAsset(assetId, client = null) {
  await query('DELETE FROM media_assets WHERE id = $1', [assetId], client);
}

export function mapMediaAssetRow(asset) {
  return {
    id: asset.id,
    url: asMediaUrl(asset.id),
    mimeType: asset.mime_type,
    width: asset.width,
    height: asset.height,
    fileName: asset.file_name,
  };
}

export { asMediaUrl };
