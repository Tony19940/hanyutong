import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { badRequest } from '../errors.js';

const SCENARIOS = [
  {
    id: 'greeting',
    title: '见面寒暄',
    subtitle: '完成打招呼、自我介绍和身份交流。',
    coachName: '豆包口语教练',
    difficulty: '入门',
    openingLine: '你好，我是你的中文口语教练。我们先练见面寒暄。',
    steps: [
      { id: 'hello', label: '打招呼', coach: '你好，我叫小豆。你叫什么名字？', coachKhmer: 'សួស្តី ខ្ញុំឈ្មោះស៊ាវដោ។ អ្នកឈ្មោះអ្វី?', hints: ['我叫 Tony。', '我叫……'] },
      { id: 'identity', label: '身份', coach: '很高兴认识你。你是学生还是上班？', coachKhmer: 'រីករាយដែលបានស្គាល់អ្នក។ អ្នកជាសិស្ស ឬ ធ្វើការ?', hints: ['我是学生。', '我上班。'] },
      { id: 'goal', label: '今天练什么', coach: '今天你想练习什么？', coachKhmer: 'ថ្ងៃនេះអ្នកចង់ហាត់អ្វី?', hints: ['我想练习买东西。', '我想练习问路。'] },
    ],
  },
  {
    id: 'shopping',
    title: '买东西',
    subtitle: '练价格、数量和付款方式。',
    coachName: '豆包店员',
    difficulty: '常用',
    openingLine: '我们来练买东西。你负责说你想买什么。',
    steps: [
      { id: 'need', label: '说需求', coach: '欢迎光临。你想买什么？', coachKhmer: 'សូមស្វាគមន៍។ អ្នកចង់ទិញអ្វី?', hints: ['我想买水果。', '我想买一件衣服。'] },
      { id: 'count', label: '说数量', coach: '这个三十五块。你要几个？', coachKhmer: 'អ៊ីវ៉ាន់នេះ ៣៥ យ័ន។ អ្នកចង់បានប៉ុន្មាន?', hints: ['我要两个。', '我要一个。'] },
      { id: 'pay', label: '付款', coach: '好的。你扫码还是现金？', coachKhmer: 'បាន។ អ្នកស្កេនបង់ ឬ បង់សាច់ប្រាក់?', hints: ['我扫码。', '我付现金。'] },
    ],
  },
  {
    id: 'meal',
    title: '点餐',
    subtitle: '练人数、菜品和买单表达。',
    coachName: '豆包服务员',
    difficulty: '常用',
    openingLine: '现在开始点餐练习。你说得越短越自然越好。',
    steps: [
      { id: 'party', label: '几位', coach: '你好，请问几位？', coachKhmer: 'សួស្តី សូមសួរថា មានប៉ុន្មាននាក់?', hints: ['一位。', '两位。'] },
      { id: 'order', label: '点菜', coach: '你想吃什么？', coachKhmer: 'អ្នកចង់ញ៉ាំអ្វី?', hints: ['我要一碗面。', '我想喝茶。'] },
      { id: 'bill', label: '买单', coach: '好的，现在买单吗？', coachKhmer: 'បាន ឥឡូវបង់លុយទេ?', hints: ['现在买单。', '可以刷卡吗？'] },
    ],
  },
];

function buildScenarioPrompt(scenario, learnerName = '学员') {
  const stepScript = scenario.steps
    .map((step, index) => `${index + 1}. ${step.label}：先说“${step.coach}”，等用户回答，再用一句短中文反馈并推进下一步。`)
    .join('\n');

  return [
    `你是“${scenario.coachName}”，负责和名叫“${learnerName}”的用户练习中文口语。`,
    `本次场景是“${scenario.title}”，目标是：${scenario.subtitle}`,
    '你必须严格按照给定步骤推进，不要自由跳题，不要聊别的场景。',
    stepScript,
    '输出规则：',
    '1. 每次尽量只说 1 到 2 句短中文。',
    '2. 当用户不会时，只给非常短的提示。',
    '3. 如果用户偏题，马上拉回当前步骤。',
    '4. 完成最后一步后，只用一句中文总结鼓励。',
  ].join('\n');
}

function buildDialogContext(scenario) {
  return scenario.steps.map((step, index) => ({
    role: 'assistant',
    text: `${index + 1}. ${step.label}：${step.coach}`,
    timestamp: Date.now() + index,
  }));
}

export function listDialogueScenarios() {
  return SCENARIOS;
}

export function getDialogueAvailability() {
  return {
    available: Boolean(
      config.doubaoDialogAppId &&
      config.doubaoDialogAccessToken &&
      config.doubaoDialogAppKey &&
      config.doubaoDialogResourceId
    ),
    missing: [
      !config.doubaoDialogAppId && 'DOUBAO_DIALOG_APP_ID',
      !config.doubaoDialogAccessToken && 'DOUBAO_DIALOG_ACCESS_TOKEN',
      !config.doubaoDialogAppKey && 'DOUBAO_DIALOG_APP_KEY',
      !config.doubaoDialogResourceId && 'DOUBAO_DIALOG_RESOURCE_ID',
    ].filter(Boolean),
  };
}

export function buildDialogueSession({ scenarioId, learnerName }) {
  const scenario = SCENARIOS.find((item) => item.id === scenarioId);
  if (!scenario) {
    throw badRequest('Invalid dialogue scenario', 'INVALID_DIALOGUE_SCENARIO');
  }

  const availability = getDialogueAvailability();
  if (!availability.available) {
    throw badRequest(`Dialogue config missing: ${availability.missing.join(', ')}`, 'DIALOGUE_CONFIG_MISSING');
  }

  const connectId = randomUUID();
  const sessionId = randomUUID();

  return {
    scenario: {
      id: scenario.id,
      title: scenario.title,
      subtitle: scenario.subtitle,
      coachName: scenario.coachName,
      openingLine: scenario.openingLine,
      steps: scenario.steps,
    },
    doubao: {
      wsUrl: config.doubaoDialogWsUrl,
      appId: config.doubaoDialogAppId,
      accessToken: config.doubaoDialogAccessToken,
      appKey: config.doubaoDialogAppKey,
      resourceId: config.doubaoDialogResourceId,
      connectId,
      headerNames: {
        appId: 'X-Api-App-ID',
        accessToken: 'X-Api-Access-Key',
        appKey: 'X-Api-App-Key',
        resourceId: 'X-Api-Resource-Id',
        connectId: 'X-Api-Connect-Id',
      },
    },
    sessionId,
    startSession: {
      tts: {
        speaker: 'zh_female_vv_jupiter_bigtts',
        audio_config: {
          channel: 1,
          format: 'pcm_s16le',
          sample_rate: 24000,
          speech_rate: 0,
          loudness_rate: 0,
        },
      },
      asr: {
        extra: {
          enable_custom_vad: true,
          enable_asr_twopass: true,
          end_smooth_window_ms: 800,
          context: {
            hotwords: scenario.steps.flatMap((step) => step.hints.slice(0, 1)).map((word) => ({ word })),
            correct_words: {},
          },
        },
      },
      dialog: {
        bot_name: scenario.coachName,
        system_role: buildScenarioPrompt(scenario, learnerName),
        speaking_style: 'friendly_chinese_tutor',
        dialog_id: `hanyutong-${scenario.id}-${connectId}`,
        character_manifest: `${scenario.coachName}，中文口语练习教练，语气自然、简洁、鼓励式。`,
        dialog_context: buildDialogContext(scenario),
        extra: {
          strict_audit: true,
          audit_response: '我们继续练中文。',
          input_mod: 'push_to_talk',
          enable_music: false,
          enable_loudness_norm: true,
          enable_conversation_truncate: true,
          enable_user_query_exit: false,
          model: '1.2.1.1',
        },
      },
    },
    textQueryTemplate: {
      content: '',
    },
  };
}
