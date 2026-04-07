import { config } from '../config.js';
import { query } from '../db.js';
import { ensureDailyRecord } from './studyProgressService.js';

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function buildSummary(row) {
  const quizUsed = Number(row?.quiz_questions_used || 0);
  const dialogueUsed = Number(row?.dialogue_rounds_used || 0);
  return {
    date: row?.date || todayString(),
    quiz: {
      limit: config.freeQuizQuestionsPerDay,
      used: quizUsed,
      remaining: Math.max(config.freeQuizQuestionsPerDay - quizUsed, 0),
    },
    dialogue: {
      limit: config.freeDialogueRoundsPerDay,
      used: dialogueUsed,
      remaining: Math.max(config.freeDialogueRoundsPerDay - dialogueUsed, 0),
    },
  };
}

export async function getFreeQuotaSummary(userId, client = null) {
  const row = await ensureDailyRecord(userId, todayString(), client);
  return buildSummary(row);
}

export async function consumeFreeQuota(userId, feature, amount = 1, client = null) {
  const normalizedFeature = feature === 'dialogue' ? 'dialogue' : 'quiz';
  const count = Math.max(1, Number.parseInt(amount, 10) || 1);
  const summary = await getFreeQuotaSummary(userId, client);
  const bucket = summary[normalizedFeature];

  if (bucket.remaining < count) {
    return {
      allowed: false,
      quota: summary,
    };
  }

  const column = normalizedFeature === 'dialogue' ? 'dialogue_rounds_used' : 'quiz_questions_used';
  const result = await query(
    `
      UPDATE daily_records
      SET ${column} = ${column} + $3,
          last_activity_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND date = $2
      RETURNING *
    `,
    [userId, todayString(), count],
    client
  );

  return {
    allowed: true,
    quota: buildSummary(result.rows[0]),
  };
}
