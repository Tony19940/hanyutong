import { randomUUID } from 'crypto';
import { pinyin } from 'pinyin-pro';
import {
  applyTranscriptToSession,
  buildCompletionSpecs,
  buildDialogueState,
  buildLessonIntroSpecs,
  buildStartSpecs,
  getCurrentLesson,
} from './dialogueScenarioService.js';
import { generateDialogueFeedback } from './arkFlashService.js';
import {
  buildDialogueAudioAssetId,
  ensureDialogueAudioAsset,
} from './audioAssetService.js';
import { synthesizeDialogueAudioBuffer } from './doubaoTtsService.js';
import { synthesizeKhmerTeacherAudio } from './geminiKhmerService.js';

const PREWARM_LIMIT = 3;

function buildPinyin(value) {
  return pinyin(String(value || ''), {
    toneType: 'symbol',
    nonZh: 'removed',
    type: 'array',
  })
    .filter(Boolean)
    .join(' ');
}

function createTimestamp() {
  return new Date().toISOString();
}

function buildMessageEnvelope(spec) {
  return {
    id: spec.id || randomUUID(),
    sender: spec.sender || 'teacher',
    kind: spec.kind || 'guide',
    language: spec.language || 'km',
    engine: spec.engine || 'system',
    displayText: spec.displayText || '',
    pinyin: spec.pinyin || '',
    khmerText: spec.khmerText || '',
    delayBeforeShowMs: Number(spec.delayBeforeShowMs || 0),
    activatesRecording: Boolean(spec.activatesRecording),
    expectedText: spec.expectedText || null,
    createdAt: spec.createdAt || createTimestamp(),
  };
}

async function runWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function materializeDoubaoAudio(spec, session, speed = 'normal') {
  const speedRatio = speed === 'slow' ? 0.72 : 1.0;
  const assetId = buildDialogueAudioAssetId({
    engine: 'doubao-chinese',
    voice: session.voiceType || 'default',
    text: spec.ttsText || spec.displayText,
    speed,
  });
  return await ensureDialogueAudioAsset(assetId, async () => {
    const audio = await synthesizeDialogueAudioBuffer(spec.ttsText || spec.displayText, {
      voiceType: session.voiceType,
      speedRatio,
    });
    return {
      buffer: audio.buffer,
      mimeType: audio.mimeType,
    };
  });
}

async function materializeGeminiAudio(spec) {
  const assetId = buildDialogueAudioAssetId({
    engine: 'gemini-khmer',
    voice: 'bunson-km',
    text: spec.ttsText || spec.displayText,
    speed: 'normal',
  });
  return await ensureDialogueAudioAsset(assetId, async () => {
    const audio = await synthesizeKhmerTeacherAudio(spec.ttsText || spec.displayText);
    return {
      buffer: audio.buffer,
      mimeType: audio.mimeType,
    };
  });
}

async function materializeTeacherMessage(spec, options = {}) {
  const message = buildMessageEnvelope(spec);
  if (message.sender === 'system' || !spec.engine || spec.engine === 'system') {
    return message;
  }

  try {
    if (spec.engine === 'doubao-chinese') {
      const normalAudio = await materializeDoubaoAudio(spec, options.session, 'normal');
      let audioSlowUrl = null;
      if (spec.audioSlow) {
        const slowAudio = await materializeDoubaoAudio(spec, options.session, 'slow');
        audioSlowUrl = slowAudio.audioUrl;
      }

      return {
        ...message,
        audioUrl: normalAudio.audioUrl,
        audioSlowUrl,
        pinyin: message.language === 'zh' && message.displayText ? message.pinyin || buildPinyin(message.displayText) : message.pinyin,
      };
    }

    if (spec.engine === 'gemini-khmer') {
      const khmerAudio = await materializeGeminiAudio(spec);
      return {
        ...message,
        audioUrl: khmerAudio.audioUrl,
      };
    }
  } catch (error) {
    console.error('Failed to materialize teacher audio:', error);
  }

  return message;
}

export async function materializeMessageSpecs(specs, options = {}) {
  return await runWithConcurrency(specs, PREWARM_LIMIT, async (spec) => materializeTeacherMessage(spec, options));
}

function prewarmMessageSpecs(specs, options = {}) {
  void materializeMessageSpecs(specs, options).catch((error) => {
    console.error('Failed to prewarm dialogue message audio:', error);
  });
}

function buildKhmerFeedbackText({ lesson, evaluation, outcome }) {
  if (!evaluation.recognizedText) {
    return 'Bunson老师 មិនទាន់ស្តាប់ច្បាស់ទេ សូមនិយាយម្ដងទៀត ហើយដាក់មីក្រូហ្វូនឱ្យកាន់តែជិត។';
  }

  if (!evaluation.contentMatched) {
    return 'អ្នកនិយាយមិនទាន់ត្រូវខ្លឹមសារគោលដៅទេ។ សូមស្តាប់គំរូម្ដងទៀត ហើយនិយាយតាមឱ្យជិតជាងមុន។';
  }

  if (outcome === 'passed' || outcome === 'complete') {
    return 'ល្អណាស់! សំឡេងអ្នកកាន់តែច្បាស់ហើយ យើងបន្តទៅជំហានបន្ទាប់។';
  }

  if (outcome === 'skipped') {
    return 'មិនអីទេ ប្រយោគនេះខ្ញុំនឹងសម្គាល់ទុកឱ្យអ្នកហាត់ម្តងទៀតពេលក្រោយ ឥឡូវយើងបន្តសិន។';
  }

  if (evaluation.overallScore != null) {
    if (evaluation.overallScore >= 50) {
      return lesson.focusKm || 'សំឡេងជិតត្រូវហើយ ប៉ុន្តែសូមកែសំឡេងឡើងចុះឱ្យច្បាស់ជាងមុន ហើយសាកម្តងទៀត។';
    }
    return 'សូមនិយាយយឺតបន្តិច ហើយតាមសំឡេងគ្រូម្តងទៀត។ ចាំស្តាប់គំរូយឺតជាមុន។';
  }

  return 'ល្អហើយ ប៉ុន្តែខ្ញុំចង់ឱ្យអ្នកសាកម្ដងទៀត ដើម្បីឱ្យសំឡេងកាន់តែច្បាស់។';
}

function buildRetrySpecs(session, lesson, evaluation) {
  const feedbackSpec = {
    id: `${lesson.id}-retry-feedback-${Date.now()}`,
    kind: 'feedback',
    language: 'km',
    engine: 'gemini-khmer',
    displayText: buildKhmerFeedbackText({ lesson, evaluation, outcome: 'retry' }),
    delayBeforeShowMs: 280,
  };

  const promptMessages = buildLessonIntroSpecs(session);
  const demoMessage = promptMessages.find((message) => message.language === 'zh');
  const promptMessage = promptMessages.find((message) => message.activatesRecording);
  const queue = [feedbackSpec];

  if (demoMessage) {
    queue.push({
      ...demoMessage,
      id: `${demoMessage.id}-retry-${Date.now()}`,
      audioMode: evaluation.overallScore != null && evaluation.overallScore < 60 ? 'slow' : demoMessage.audioMode,
      audioSlow: true,
      delayBeforeShowMs: 340,
    });
  }

  if (promptMessage) {
    queue.push({
      ...promptMessage,
      id: `${promptMessage.id}-retry-${Date.now()}`,
      delayBeforeShowMs: 0,
      activatesRecording: true,
    });
  }

  return queue;
}

async function buildPhase3PartnerReply(session, transcript) {
  const lesson = getCurrentLesson(session);
  if (!lesson || lesson.phase !== 'phase3_dialogue') {
    return null;
  }

  try {
    const text = await generateDialogueFeedback({
      systemPrompt: [
        `你是中文对话老师“${session.scenario.coachName}”。`,
        `话题：${session.scenario.title}。`,
        '你现在扮演情景对话里的对话伙伴。',
        '只输出一句简短自然的中文回应或追问。',
        '不要解释，不要点评，不要输出高棉语。',
      ].join('\n'),
      userPrompt: `学员刚才说：${transcript}`,
    });

    return {
      id: `${lesson.id}-partner-followup-${Date.now()}`,
      kind: 'demo',
      language: 'zh',
      engine: 'doubao-chinese',
      displayText: text,
      pinyin: buildPinyin(text),
      khmerText: '',
      audioSlow: true,
      delayBeforeShowMs: 320,
    };
  } catch (error) {
    console.error('Failed to generate dialogue partner reply:', error);
    return null;
  }
}

async function buildOutcomeSpecs({ session, lesson, transcript, outcome, evaluation }) {
  if (outcome === 'retry') {
    return buildRetrySpecs(session, lesson, evaluation);
  }

  if (outcome === 'skipped') {
    const queue = [
      {
        id: `${lesson.id}-skip-feedback-${Date.now()}`,
        kind: 'feedback',
        language: 'km',
        engine: 'gemini-khmer',
        displayText: buildKhmerFeedbackText({ lesson, evaluation, outcome }),
        delayBeforeShowMs: 280,
      },
    ];

    if (session.isComplete) {
      queue.push(...buildCompletionSpecs(session));
      return queue;
    }

    queue.push(...buildLessonIntroSpecs(session));
    return queue;
  }

  const queue = [
    {
      id: `${lesson.id}-pass-feedback-${Date.now()}`,
      kind: 'feedback',
      language: 'km',
      engine: 'gemini-khmer',
      displayText: buildKhmerFeedbackText({ lesson, evaluation, outcome }),
      delayBeforeShowMs: 260,
    },
  ];

  if (lesson.phase === 'phase3_dialogue') {
    const partnerReply = await buildPhase3PartnerReply(session, transcript);
    if (partnerReply) {
      queue.push(partnerReply);
    }
  }

  if (session.isComplete) {
    queue.push(...buildCompletionSpecs(session));
  } else {
    queue.push(...buildLessonIntroSpecs(session));
  }

  return queue;
}

function buildUserMessage(transcript, localAudio = null) {
  return {
    id: randomUUID(),
    sender: 'learner',
    kind: 'learner_audio',
    language: 'zh',
    engine: 'learner',
    displayText: String(transcript || '').trim(),
    pinyin: '',
    khmerText: '',
    createdAt: createTimestamp(),
    ...(localAudio ? { audioUrl: localAudio } : {}),
  };
}

export async function buildDialogueStartResponse(session) {
  const specs = buildStartSpecs(session);
  const messages = await materializeMessageSpecs(specs, { session });

  const nextLesson = session.scenario.steps[1];
  if (nextLesson) {
    prewarmMessageSpecs(nextLesson.messages, { session });
  }

  return {
    messages,
    state: buildDialogueState(session, 'SHOWING_BUBBLE'),
  };
}

export async function buildDialogueTurnResponse({ session, transcript, evaluation }) {
  const lesson = getCurrentLesson(session);
  const progress = applyTranscriptToSession(session, transcript, evaluation);
  const queueSpecs = await buildOutcomeSpecs({
    session,
    lesson,
    transcript,
    outcome: progress.outcome,
    evaluation: progress.evaluation,
  });
  const aiMessages = await materializeMessageSpecs(queueSpecs, { session });

  const nextLesson = getCurrentLesson(session);
  if (nextLesson) {
    prewarmMessageSpecs(nextLesson.messages, { session });
  }

  return {
    userMessage: buildUserMessage(progress.evaluation.recognizedText),
    messages: aiMessages,
    state: progress.state,
    evaluation: progress.evaluation,
  };
}
