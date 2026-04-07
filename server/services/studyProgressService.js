import { config } from '../config.js';
import { query } from '../db.js';
import { getVocabulary } from './vocabularyService.js';

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function clampQuality(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(parsed, 5));
}

function addDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

function buildWordMap() {
  return new Map(getVocabulary().map((word) => [word.id, word]));
}

function isStudyDay(row) {
  return Number(row.words_learned || 0) + Number(row.review_words || 0) > 0 || Number(row.time_spent || 0) > 0;
}

export async function ensureDailyRecord(userId, date = todayString(), client = null) {
  const result = await query(
    `
      INSERT INTO daily_records (
        user_id,
        date,
        words_learned,
        review_words,
        time_spent,
        goal_target,
        goal_completed,
        quiz_questions_used,
        dialogue_rounds_used,
        last_activity_at
      )
      VALUES ($1, $2, 0, 0, 0, $3, FALSE, 0, 0, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, date) DO UPDATE
      SET goal_target = COALESCE(daily_records.goal_target, EXCLUDED.goal_target),
          last_activity_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
    [userId, date, config.dailyStudyGoal],
    client
  );

  return result.rows[0];
}

export async function recalculateGoalSummary(userId, date = todayString(), client = null) {
  const result = await query(
    `
      UPDATE daily_records
      SET goal_completed = (words_learned + review_words) >= goal_target,
          last_activity_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND date = $2
      RETURNING *
    `,
    [userId, date],
    client
  );

  return result.rows[0] || ensureDailyRecord(userId, date, client);
}

export async function incrementLearnedWords(userId, amount = 1, client = null) {
  const date = todayString();
  await ensureDailyRecord(userId, date, client);
  await query(
    `
      UPDATE daily_records
      SET words_learned = words_learned + $3,
          last_activity_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND date = $2
    `,
    [userId, date, amount],
    client
  );
  return recalculateGoalSummary(userId, date, client);
}

export async function incrementReviewWords(userId, amount = 1, client = null) {
  const date = todayString();
  await ensureDailyRecord(userId, date, client);
  await query(
    `
      UPDATE daily_records
      SET review_words = review_words + $3,
          last_activity_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND date = $2
    `,
    [userId, date, amount],
    client
  );
  return recalculateGoalSummary(userId, date, client);
}

export async function recordStudyTime(userId, minutes, client = null) {
  const date = todayString();
  await ensureDailyRecord(userId, date, client);
  await query(
    `
      UPDATE daily_records
      SET time_spent = time_spent + $3,
          last_activity_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND date = $2
    `,
    [userId, date, minutes],
    client
  );
  return recalculateGoalSummary(userId, date, client);
}

export async function getGoalSummary(userId, client = null) {
  const today = await ensureDailyRecord(userId, todayString(), client);
  const summary = await recalculateGoalSummary(userId, today.date, client);
  const studiedWords = Number(summary.words_learned || 0) + Number(summary.review_words || 0);
  return {
    date: summary.date,
    target: Number(summary.goal_target || config.dailyStudyGoal),
    studiedWords,
    learnedWords: Number(summary.words_learned || 0),
    reviewWords: Number(summary.review_words || 0),
    completed: Boolean(summary.goal_completed || studiedWords >= Number(summary.goal_target || config.dailyStudyGoal)),
  };
}

function resolveWordWithProgress(wordMap, progressRow) {
  const wordId = Number(progressRow.word_id);
  const word = wordMap.get(wordId);
  if (!word) {
    return null;
  }
  return {
    ...word,
    reviewState: {
      interval: Number(progressRow.interval || 0),
      easeFactor: Number(progressRow.ease_factor || 2.5),
      repetitions: Number(progressRow.repetitions || 0),
      nextReview: progressRow.next_review || null,
      lastReview: progressRow.last_review || null,
      quality: progressRow.quality === null || progressRow.quality === undefined ? null : Number(progressRow.quality),
    },
  };
}

export async function getProgressQueue(userId, { limit = 20 } = {}, client = null) {
  const boundedLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 20, 40));
  const wordMap = buildWordMap();
  const nowIso = new Date().toISOString();
  const dueResult = await query(
    `
      SELECT *
      FROM word_progress
      WHERE user_id = $1
        AND next_review IS NOT NULL
        AND next_review <= $2
      ORDER BY next_review ASC, updated_at ASC
      LIMIT $3
    `,
    [userId, nowIso, boundedLimit],
    client
  );

  const progressResult = await query(
    `
      SELECT word_id, status
      FROM user_progress
      WHERE user_id = $1
    `,
    [userId],
    client
  );

  const learnedIds = new Set(progressResult.rows.filter((row) => row.status === 'learned').map((row) => Number(row.word_id)));
  const trackedIds = new Set(dueResult.rows.map((row) => Number(row.word_id)));
  const reviewWords = dueResult.rows
    .map((row) => resolveWordWithProgress(wordMap, row))
    .filter(Boolean);
  const newWords = getVocabulary()
    .filter((word) => !learnedIds.has(word.id) && !trackedIds.has(word.id))
    .slice(0, Math.max(4, boundedLimit))
    .map((word) => ({
      ...word,
      reviewState: null,
    }));
  const goalSummary = await getGoalSummary(userId, client);

  return {
    reviewWords,
    newWords,
    goalSummary,
    summary: {
      dueCount: reviewWords.length,
      newCount: newWords.length,
    },
  };
}

function applySm2(previous, quality) {
  const currentEaseFactor = Number(previous.ease_factor || 2.5);
  const currentInterval = Number(previous.interval || 0);
  const currentRepetitions = Number(previous.repetitions || 0);
  let repetitions = currentRepetitions;
  let interval = currentInterval;
  let easeFactor = currentEaseFactor;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else if (repetitions === 0) {
    repetitions = 1;
    interval = 1;
  } else if (repetitions === 1) {
    repetitions = 2;
    interval = 3;
  } else {
    repetitions += 1;
    interval = Math.max(1, Math.round(currentInterval * currentEaseFactor));
  }

  easeFactor = Math.max(
    1.3,
    Number((easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))).toFixed(2))
  );

  return {
    repetitions,
    interval,
    easeFactor,
    quality,
    lastReview: new Date().toISOString(),
    nextReview: addDays(new Date(), interval),
  };
}

export async function reviewWord(userId, wordId, qualityInput, client = null) {
  const quality = clampQuality(qualityInput);
  const previousResult = await query(
    `
      SELECT *
      FROM word_progress
      WHERE user_id = $1 AND word_id = $2
    `,
    [userId, wordId],
    client
  );
  const previous = previousResult.rows[0] || {
    interval: 0,
    ease_factor: 2.5,
    repetitions: 0,
  };
  const next = applySm2(previous, quality);

  const result = await query(
    `
      INSERT INTO word_progress (
        user_id,
        word_id,
        interval,
        ease_factor,
        repetitions,
        next_review,
        last_review,
        quality,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, word_id)
      DO UPDATE SET interval = EXCLUDED.interval,
                    ease_factor = EXCLUDED.ease_factor,
                    repetitions = EXCLUDED.repetitions,
                    next_review = EXCLUDED.next_review,
                    last_review = EXCLUDED.last_review,
                    quality = EXCLUDED.quality,
                    updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `,
    [userId, wordId, next.interval, next.easeFactor, next.repetitions, next.nextReview, next.lastReview, next.quality],
    client
  );

  const goalSummary = await incrementReviewWords(userId, 1, client);
  return {
    progress: result.rows[0],
    goalSummary,
  };
}

export async function getCheckinSummary(userId, { days = 21 } = {}, client = null) {
  const boundedDays = Math.max(7, Math.min(Number.parseInt(days, 10) || 21, 60));
  const result = await query(
    `
      SELECT date, words_learned, review_words, time_spent, goal_target, goal_completed
      FROM daily_records
      WHERE user_id = $1
      ORDER BY date DESC
      LIMIT $2
    `,
    [userId, boundedDays],
    client
  );

  const rows = result.rows;
  const today = todayString();
  let streak = 0;
  const dateSet = new Set(rows.filter(isStudyDay).map((row) => row.date));
  const cursor = new Date(today);
  if (!dateSet.has(today)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (dateSet.has(cursor.toISOString().split('T')[0])) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return {
    streak,
    calendar: rows
      .slice()
      .reverse()
      .map((row) => ({
        date: row.date,
        wordsLearned: Number(row.words_learned || 0),
        reviewWords: Number(row.review_words || 0),
        timeSpent: Number(row.time_spent || 0),
        studied: isStudyDay(row),
        goalTarget: Number(row.goal_target || config.dailyStudyGoal),
        goalCompleted: Boolean(row.goal_completed),
      })),
    today: await getGoalSummary(userId, client),
  };
}
