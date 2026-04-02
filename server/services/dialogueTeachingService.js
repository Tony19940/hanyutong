import { randomUUID } from 'crypto';
import {
  applyTranscriptToSession,
  buildCompletionSpecs,
  buildDialogueState,
  buildLessonIntroSpecs,
  buildStartSpecs,
  getCurrentLesson,
} from './dialogueScenarioService.js';
import { generateDialogueFeedback } from './arkFlashService.js';
import { synthesizeDialogueText } from './doubaoTtsService.js';

function buildMessage({ role, type, text, audio = null, khmerText = '' }) {
  return {
    id: randomUUID(),
    role,
    type,
    text,
    ...(khmerText ? { khmerText } : {}),
    createdAt: new Date().toISOString(),
    ...(audio ? { audio } : {}),
  };
}

async function attachAudio(message, options = {}) {
  if (message.type !== 'audio' || message.role !== 'assistant') {
    return message;
  }

  try {
    const audio = await synthesizeDialogueText(message.text, { voiceType: options.voiceType });
    return buildMessage({ ...message, audio });
  } catch (error) {
    console.error('Failed to synthesize dialogue TTS:', error);
    return buildMessage(message);
  }
}

export async function materializeMessageSpecs(specs, options = {}) {
  const messages = [];
  for (const spec of specs) {
    messages.push(await attachAudio(spec, options));
  }
  return messages;
}

function buildFallbackFeedback({ lesson, outcome, attemptsLeft }) {
  if (outcome === 'passed' || outcome === 'complete') {
    return '很好，继续保持。';
  }
  if (outcome === 'skipped' || outcome === 'complete_after_skip') {
    return '没关系，这句先跳过，后面再回来练。';
  }
  if (lesson.mode === 'shadow') {
    return attemptsLeft > 1 ? '差不多了，注意重点字的声调，再试一次。' : '已经很接近了，再试最后一次。';
  }
  return attemptsLeft > 1 ? '不错，再说完整一点。' : '可以了，再试最后一次。';
}

function buildSystemPrompt(session, lesson) {
  return [
    `你是中文口语教练“${session.scenario.coachName}”。`,
    `学员名字：${session.learnerName}。`,
    `场景：${session.scenario.title}。`,
    `阶段：${lesson.stage}。`,
    `任务：${lesson.label}。`,
    `目标句/目标任务：${lesson.target}。`,
    '你只输出 1 到 2 句非常短的中文反馈。',
    '先鼓励，再指出一个最关键的问题。',
    '不要总结整节课，不要切到其他话题，不要输出项目符号。',
  ].join('\n');
}

function buildUserPrompt({ lesson, transcript, outcome, retryCount }) {
  return [
    `用户实际说的是：${transcript}`,
    `当前结果：${outcome}`,
    `当前已重试次数：${retryCount}`,
    lesson.focus ? `教学重点：${lesson.focus}` : '',
    lesson.mode === 'shadow'
      ? '这是跟读句，请优先比较用户是否接近目标句。'
      : '这是自由组织表达，请优先鼓励，再指出一个最关键的问题。',
  ]
    .filter(Boolean)
    .join('\n');
}

async function buildFeedbackText({ session, lesson, transcript, outcome, retryCount }) {
  try {
    return await generateDialogueFeedback({
      systemPrompt: buildSystemPrompt(session, lesson),
      userPrompt: buildUserPrompt({ lesson, transcript, outcome, retryCount }),
    });
  } catch (error) {
    console.error('Failed to generate dialogue feedback:', error);
    const attemptsLeft = Math.max(0, 3 - retryCount);
    return buildFallbackFeedback({ lesson, outcome, attemptsLeft });
  }
}

export async function buildDialogueStartResponse(session) {
  return {
    messages: await materializeMessageSpecs(buildStartSpecs(session), { voiceType: session.voiceType }),
    state: buildDialogueState(session),
  };
}

export async function buildDialogueTurnResponse({ session, transcript }) {
  const userMessage = buildMessage({
    role: 'user',
    type: 'text',
    text: transcript,
  });

  const progress = applyTranscriptToSession(session, transcript);
  const currentLesson = progress.lesson || getCurrentLesson(session);
  const feedbackText = currentLesson
    ? await buildFeedbackText({
        session,
        lesson: currentLesson,
        transcript,
        outcome: progress.outcome,
        retryCount: progress.evaluation.retryCount,
      })
    : '很好，这个话题完成了。';

  const specs = [
    {
      role: 'assistant',
      type: 'audio',
      text: feedbackText,
    },
  ];

  if (progress.outcome === 'retry') {
    specs.push(...buildLessonIntroSpecs(session, { retrying: true }));
  } else if (session.isComplete) {
    specs.push(...buildCompletionSpecs(session));
  } else {
    specs.push(...buildLessonIntroSpecs(session));
  }

  return {
    userMessage,
    aiMessages: await materializeMessageSpecs(specs, { voiceType: session.voiceType }),
    state: progress.state,
    evaluation: progress.evaluation,
  };
}
