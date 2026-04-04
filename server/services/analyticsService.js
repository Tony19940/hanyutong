import { query } from '../db.js';

function todayDateString() {
  return new Date().toISOString().split('T')[0];
}

function dateDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

export async function trackAppEvent({ userId = null, eventName, metadata = null }, client = null) {
  const eventDate = todayDateString();
  await query(
    `
      INSERT INTO app_events (user_id, event_name, event_date, metadata)
      VALUES ($1, $2, $3, $4)
    `,
    [userId, eventName, eventDate, metadata ? JSON.stringify(metadata) : null],
    client
  );
}

export async function markPopupImpression({ popupId, userId }, client = null) {
  const impressionDate = todayDateString();
  await query(
    `
      INSERT INTO popup_impressions (popup_id, user_id, impression_date)
      VALUES ($1, $2, $3)
      ON CONFLICT (popup_id, user_id, impression_date) DO NOTHING
    `,
    [popupId, userId, impressionDate],
    client
  );
}

export async function markPopupClick({ popupId, userId }, client = null) {
  const impressionDate = todayDateString();
  await query(
    `
      UPDATE popup_impressions
      SET clicked_at = CURRENT_TIMESTAMP
      WHERE popup_id = $1
        AND user_id = $2
        AND impression_date = $3
    `,
    [popupId, userId, impressionDate],
    client
  );
}

async function countEventsOnDate(eventName, eventDate, client = null) {
  const result = await query(
    `
      SELECT COUNT(*) AS count
      FROM app_events
      WHERE event_name = $1
        AND event_date = $2
    `,
    [eventName, eventDate],
    client
  );
  return Number(result.rows[0]?.count || 0);
}

async function countDistinctUsersOnDate(eventName, eventDate, client = null) {
  const result = await query(
    `
      SELECT COUNT(DISTINCT user_id) AS count
      FROM app_events
      WHERE event_name = $1
        AND event_date = $2
        AND user_id IS NOT NULL
    `,
    [eventName, eventDate],
    client
  );
  return Number(result.rows[0]?.count || 0);
}

export async function getAnalyticsOverview(client = null) {
  const today = todayDateString();
  const [
    dau,
    opens,
    dialogueStarts,
    interpreterStarts,
    bannerClicks,
    popupClicks,
    trialStartsResult,
    paidActivationsResult,
  ] = await Promise.all([
    countDistinctUsersOnDate('app_open', today, client),
    countEventsOnDate('app_open', today, client),
    countEventsOnDate('dialogue_start', today, client),
    countEventsOnDate('interpreter_start', today, client),
    countEventsOnDate('banner_click', today, client),
    countEventsOnDate('popup_click', today, client),
    query(
      `
        SELECT COUNT(*) AS count
        FROM entitlement_events
        WHERE event_type = 'trial_started'
          AND DATE(created_at AT TIME ZONE 'UTC')::text = $1
      `,
      [today],
      client
    ),
    query(
      `
        SELECT COUNT(*) AS count
        FROM entitlement_events
        WHERE event_type = 'paid_activation'
          AND DATE(created_at AT TIME ZONE 'UTC')::text = $1
      `,
      [today],
      client
    ),
  ]);

  const last7Days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = dateDaysAgo(offset);
    const [dayDau, dayOpens, dayDialogue, dayInterpreter] = await Promise.all([
      countDistinctUsersOnDate('app_open', date, client),
      countEventsOnDate('app_open', date, client),
      countEventsOnDate('dialogue_start', date, client),
      countEventsOnDate('interpreter_start', date, client),
    ]);
    last7Days.push({
      date,
      dau: dayDau,
      opens: dayOpens,
      dialogueStarts: dayDialogue,
      interpreterStarts: dayInterpreter,
    });
  }

  return {
    today: {
      dau,
      opens,
      newTrials: Number(trialStartsResult.rows[0]?.count || 0),
      paidActivations: Number(paidActivationsResult.rows[0]?.count || 0),
      dialogueStarts,
      interpreterStarts,
      bannerClicks,
      popupClicks,
    },
    last7Days,
  };
}
