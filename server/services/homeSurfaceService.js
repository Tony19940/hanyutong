import { query } from '../db.js';
import { mapMediaAssetRow } from './mediaService.js';

function mapBannerRow(row) {
  return {
    id: row.banner_id,
    title: row.title || '',
    linkUrl: row.link_url || '',
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
    image: mapMediaAssetRow(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPopupRow(row) {
  return {
    id: row.popup_id,
    title: row.title || '',
    body: row.body || '',
    linkUrl: row.link_url || '',
    priority: row.priority,
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    isActive: Boolean(row.is_active),
    image: mapMediaAssetRow(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listActiveHomeBanners(client = null) {
  const result = await query(
    `
      SELECT b.id AS banner_id,
             b.title,
             b.link_url,
             b.sort_order,
             b.is_active,
             b.created_at,
             b.updated_at,
             m.id,
             m.mime_type,
             m.file_name,
             m.width,
             m.height
      FROM home_banners b
      JOIN media_assets m ON m.id = b.asset_id
      WHERE b.is_active = TRUE
      ORDER BY b.sort_order ASC, b.id ASC
    `,
    [],
    client
  );
  return result.rows.map(mapBannerRow);
}

export async function listAdminBanners(client = null) {
  const result = await query(
    `
      SELECT b.id AS banner_id,
             b.title,
             b.link_url,
             b.sort_order,
             b.is_active,
             b.created_at,
             b.updated_at,
             b.asset_id,
             m.id,
             m.mime_type,
             m.file_name,
             m.width,
             m.height
      FROM home_banners b
      JOIN media_assets m ON m.id = b.asset_id
      ORDER BY b.sort_order ASC, b.id ASC
    `,
    [],
    client
  );
  return result.rows.map(mapBannerRow);
}

export async function listAdminPopups(client = null) {
  const result = await query(
    `
      SELECT p.id AS popup_id,
             p.title,
             p.body,
             p.link_url,
             p.priority,
             p.starts_at,
             p.ends_at,
             p.is_active,
             p.created_at,
             p.updated_at,
             p.asset_id,
             m.id,
             m.mime_type,
             m.file_name,
             m.width,
             m.height
      FROM app_popups p
      JOIN media_assets m ON m.id = p.asset_id
      ORDER BY p.priority DESC, p.id DESC
    `,
    [],
    client
  );
  return result.rows.map(mapPopupRow);
}

export async function findEligiblePopupForUser(userId, client = null) {
  const today = new Date().toISOString().split('T')[0];
  const result = await query(
    `
      SELECT p.id AS popup_id,
             p.title,
             p.body,
             p.link_url,
             p.priority,
             p.starts_at,
             p.ends_at,
             p.is_active,
             p.created_at,
             p.updated_at,
             m.id,
             m.mime_type,
             m.file_name,
             m.width,
             m.height
      FROM app_popups p
      JOIN media_assets m ON m.id = p.asset_id
      WHERE p.is_active = TRUE
        AND (p.starts_at IS NULL OR p.starts_at <= CURRENT_TIMESTAMP)
        AND (p.ends_at IS NULL OR p.ends_at >= CURRENT_TIMESTAMP)
        AND NOT EXISTS (
          SELECT 1
          FROM popup_impressions pi
          WHERE pi.popup_id = p.id
            AND pi.user_id = $1
            AND pi.impression_date = $2
        )
      ORDER BY p.priority DESC, p.id DESC
      LIMIT 1
    `,
    [userId, today],
    client
  );
  return result.rows[0] ? mapPopupRow(result.rows[0]) : null;
}
