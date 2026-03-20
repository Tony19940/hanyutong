import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pinyin } from 'pinyin-pro';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, '..', 'data', 'vocabulary.seed.json');
const outPath = path.join(__dirname, '..', 'data', 'vocabulary.json');
const TARGET_COUNT = 500;

const candidateCatalog = [
  {
    category: 'home',
    items: [
      ['门', '🚪', 1], ['窗户', '🪟', 1], ['桌子', '🪑', 1], ['椅子', '🪑', 1], ['床', '🛏️', 1],
      ['沙发', '🛋️', 2], ['房间', '🏠', 1], ['厨房', '🍳', 2], ['客厅', '🛋️', 2], ['浴室', '🚿', 2],
      ['冰箱', '🧊', 2], ['灯', '💡', 1], ['钥匙', '🔑', 2], ['书包', '🎒', 1], ['杯子', '🥤', 1],
      ['盘子', '🍽️', 2], ['勺子', '🥄', 2], ['叉子', '🍴', 2], ['刀', '🔪', 2], ['毛巾', '🧺', 2],
    ],
  },
  {
    category: 'school',
    items: [
      ['学生', '🧑‍🎓', 1], ['老师', '👩‍🏫', 1], ['书', '📘', 1], ['本子', '📓', 1], ['笔', '🖊️', 1],
      ['铅笔', '✏️', 1], ['橡皮', '🩹', 2], ['黑板', '🧾', 2], ['教室', '🏫', 1], ['图书馆', '📚', 2],
      ['课本', '📕', 2], ['作业', '📝', 2], ['考试', '📋', 2], ['成绩', '📊', 3], ['答案', '✅', 2],
      ['练习', '📖', 2], ['单词', '🔤', 1], ['句子', '💬', 2], ['汉字', '🈶', 2], ['语法', '📚', 3],
    ],
  },
  {
    category: 'work',
    items: [
      ['公司', '🏢', 2], ['同事', '🤝', 2], ['老板', '👔', 2], ['会议', '🗂️', 2], ['文件', '📄', 2],
      ['邮件', '📧', 2], ['客户', '🙋', 3], ['经理', '📈', 3], ['工资', '💵', 3], ['任务', '📌', 2],
      ['计划', '🗓️', 2], ['假期', '🏖️', 2], ['办公室', '🖥️', 2], ['名片', '🪪', 3], ['合同', '📑', 4],
      ['报告', '📊', 3], ['经验', '🧠', 4], ['职位', '🪪', 4], ['生意', '💼', 3], ['培训', '🎓', 3],
    ],
  },
  {
    category: 'shopping',
    items: [
      ['商店', '🏪', 1], ['市场', '🛒', 2], ['超市', '🏬', 2], ['价格', '🏷️', 2], ['便宜', '💸', 2],
      ['贵', '💎', 2], ['钱包', '👛', 2], ['现金', '💵', 2], ['收据', '🧾', 3], ['尺寸', '📏', 3],
      ['衣服', '👕', 1], ['裤子', '👖', 2], ['裙子', '👗', 2], ['鞋子', '👟', 1], ['帽子', '🧢', 2],
      ['手表', '⌚', 2], ['礼物', '🎁', 2], ['折扣', '📉', 3], ['付款', '💳', 3], ['退货', '↩️', 4],
    ],
  },
  {
    category: 'travel',
    items: [
      ['酒店', '🏨', 2], ['机场', '✈️', 2], ['车站', '🚉', 2], ['地铁', '🚇', 2], ['地图', '🗺️', 2],
      ['护照', '🛂', 4], ['签证', '📘', 4], ['行李', '🧳', 2], ['旅游', '🗺️', 2], ['导游', '🧭', 4],
      ['预约', '📅', 3], ['地址', '📍', 2], ['楼', '🏢', 2], ['电梯', '🛗', 3], ['楼梯', '🪜', 2],
      ['银行', '🏦', 2], ['邮局', '📮', 3], ['餐厅', '🍽️', 2], ['医院', '🏥', 2], ['药店', '💊', 3],
    ],
  },
  {
    category: 'time',
    items: [
      ['今天', '📅', 1], ['昨天', '📆', 1], ['明天', '🌤️', 1], ['早上', '🌅', 1], ['中午', '☀️', 1],
      ['下午', '🌇', 1], ['晚上', '🌙', 1], ['周末', '🎉', 2], ['星期一', '1️⃣', 1], ['星期二', '2️⃣', 1],
      ['星期三', '3️⃣', 1], ['星期四', '4️⃣', 1], ['星期五', '5️⃣', 1], ['星期六', '6️⃣', 1], ['星期天', '7️⃣', 1],
      ['一月', '1️⃣', 2], ['二月', '2️⃣', 2], ['三月', '3️⃣', 2], ['四月', '4️⃣', 2], ['五月', '5️⃣', 2],
    ],
  },
  {
    category: 'time',
    items: [
      ['六月', '6️⃣', 2], ['七月', '7️⃣', 2], ['八月', '8️⃣', 2], ['九月', '9️⃣', 2], ['十月', '🔟', 2],
      ['十一月', '1️⃣1️⃣', 2], ['十二月', '1️⃣2️⃣', 2], ['分钟', '⏱️', 2], ['秒', '⏱️', 3], ['小时', '⏰', 1],
      ['年份', '📅', 2], ['现在', '🕒', 1], ['以前', '↩️', 2], ['以后', '⏭️', 2], ['最近', '📍', 2],
      ['马上', '⚡', 2], ['常常', '🔁', 2], ['已经', '✅', 2], ['刚才', '🕒', 2], ['未来', '🔮', 3],
    ],
  },
  {
    category: 'weather',
    items: [
      ['雨', '🌧️', 1], ['风', '💨', 1], ['云', '☁️', 1], ['雪', '❄️', 2], ['天空', '🌌', 1],
      ['月亮', '🌙', 1], ['星星', '⭐', 1], ['河', '🏞️', 2], ['湖', '🏞️', 3], ['海', '🌊', 2],
      ['山', '⛰️', 1], ['花', '🌸', 1], ['草', '🌱', 1], ['森林', '🌲', 2], ['公园', '🏞️', 2],
      ['石头', '🪨', 2], ['叶子', '🍃', 2], ['阳光', '🌞', 2], ['空气', '🌬️', 2], ['温度', '🌡️', 3],
    ],
  },
  {
    category: 'emotions',
    items: [
      ['高兴', '😄', 1], ['开心', '😁', 1], ['难过', '😢', 2], ['生气', '😠', 2], ['害怕', '😨', 2],
      ['累', '😫', 1], ['紧张', '😬', 2], ['放松', '😌', 3], ['满意', '🙂', 3], ['失望', '😞', 3],
      ['惊讶', '😲', 3], ['担心', '😟', 2], ['希望', '🙏', 2], ['喜欢', '❤️', 1], ['讨厌', '🙅', 2],
      ['爱', '💖', 1], ['想念', '💭', 3], ['兴奋', '🤩', 3], ['安静', '🤫', 2], ['勇敢', '🦁', 3],
    ],
  },
  {
    category: 'actions',
    items: [
      ['走', '🚶', 1], ['跑', '🏃', 1], ['跳', '🤾', 2], ['坐', '🪑', 1], ['站', '🧍', 1],
      ['睡觉', '😴', 1], ['起床', '⏰', 1], ['洗澡', '🛁', 2], ['洗脸', '🫧', 2], ['刷牙', '🪥', 2],
      ['开门', '🚪', 1], ['关门', '🚪', 1], ['打开', '📂', 2], ['关闭', '📕', 2], ['读', '📖', 1],
      ['写', '✍️', 1], ['说', '🗣️', 1], ['听', '👂', 1], ['看', '👀', 1], ['学习', '📚', 1],
    ],
  },
  {
    category: 'actions',
    items: [
      ['休息', '🛌', 2], ['买', '🛍️', 1], ['卖', '💰', 2], ['找', '🔎', 1], ['帮助', '🤝', 1],
      ['等', '⏳', 1], ['问', '❓', 1], ['回答', '💬', 2], ['开始', '▶️', 1], ['结束', '⏹️', 2],
      ['记住', '🧠', 2], ['忘记', '🤔', 2], ['准备', '🧰', 2], ['选择', '☑️', 2], ['决定', '🧭', 3],
      ['使用', '🛠️', 2], ['带', '🎒', 2], ['拿', '✋', 1], ['放', '📦', 1], ['回来', '↩️', 1],
    ],
  },
  {
    category: 'adjectives',
    items: [
      ['新', '✨', 1], ['旧', '🕰️', 1], ['快', '⚡', 1], ['慢', '🐢', 1], ['早', '🌅', 1],
      ['晚', '🌙', 1], ['对', '✅', 1], ['错', '❌', 1], ['忙', '📌', 2], ['空', '🫙', 2],
      ['重要', '❗', 2], ['方便', '👍', 2], ['简单', '🧩', 2], ['复杂', '🧠', 3], ['漂亮', '💅', 2],
      ['干净', '🧼', 2], ['脏', '🧹', 2], ['安全', '🛡️', 2], ['危险', '⚠️', 2], ['特别', '🌟', 2],
    ],
  },
  {
    category: 'technology',
    items: [
      ['手机', '📱', 1], ['电脑', '💻', 1], ['电视', '📺', 1], ['键盘', '⌨️', 2], ['鼠标', '🖱️', 2],
      ['充电器', '🔌', 2], ['网络', '🌐', 2], ['网站', '🕸️', 2], ['密码', '🔐', 2], ['账号', '🪪', 2],
      ['照片', '📷', 1], ['视频', '🎬', 2], ['音乐', '🎵', 1], ['游戏', '🎮', 1], ['消息', '💬', 1],
      ['软件', '💾', 3], ['应用', '📲', 2], ['下载', '⬇️', 2], ['上传', '⬆️', 2], ['登录', '🔓', 2],
    ],
  },
  {
    category: 'body',
    items: [
      ['眼睛', '👀', 1], ['耳朵', '👂', 2], ['嘴巴', '👄', 1], ['鼻子', '👃', 1], ['手', '✋', 1],
      ['脚', '🦶', 1], ['心', '❤️', 2], ['肚子', '🤰', 2], ['背', '🧍', 2], ['肩膀', '🫱', 3],
      ['牙齿', '🦷', 2], ['头发', '💇', 2], ['脸', '🙂', 1], ['手指', '👉', 2], ['身体', '🧍', 2],
      ['健康', '💚', 2], ['感冒', '🤒', 2], ['发烧', '🌡️', 2], ['咳嗽', '😷', 2], ['疼', '🤕', 2],
    ],
  },
  {
    category: 'food',
    items: [
      ['面包', '🍞', 1], ['面条', '🍜', 2], ['鸡蛋', '🥚', 2], ['牛奶', '🥛', 2], ['香蕉', '🍌', 2],
      ['西瓜', '🍉', 2], ['牛肉', '🥩', 3], ['猪肉', '🍖', 3], ['盐', '🧂', 3], ['糖', '🍬', 3],
      ['饺子', '🥟', 3], ['饼干', '🍪', 2], ['巧克力', '🍫', 3], ['汤', '🥣', 2], ['蛋糕', '🎂', 2],
      ['早餐', '🍳', 1], ['午餐', '🍱', 1], ['晚餐', '🍽️', 1], ['水果', '🍇', 1], ['蔬菜', '🥬', 2],
    ],
  },
  {
    category: 'colors',
    items: [
      ['红色', '🔴', 1], ['蓝色', '🔵', 1], ['绿色', '🟢', 1], ['黄色', '🟡', 1], ['黑色', '⚫', 1],
      ['白色', '⚪', 1], ['灰色', '灰', 2], ['紫色', '🟣', 2], ['粉色', '🩷', 2], ['橙色', '🟠', 2],
      ['金色', '🥇', 3], ['银色', '🥈', 3], ['透明', '🫧', 3], ['深色', '🌑', 3], ['浅色', '🌤️', 3],
    ],
  },
  {
    category: 'hobbies',
    items: [
      ['足球', '⚽', 2], ['篮球', '🏀', 2], ['排球', '🏐', 3], ['羽毛球', '🏸', 3], ['游泳', '🏊', 2],
      ['跑步', '🏃', 2], ['唱歌', '🎤', 2], ['跳舞', '💃', 2], ['画画', '🎨', 2], ['阅读', '📚', 2],
      ['拍照', '📸', 2], ['做饭', '🍳', 2], ['钓鱼', '🎣', 3], ['露营', '🏕️', 3], ['爬山', '🥾', 3],
      ['吉他', '🎸', 3], ['钢琴', '🎹', 3], ['书法', '🖌️', 4], ['电影票', '🎟️', 3], ['咖啡馆', '☕', 3],
      ['博物馆', '🏛️', 3],
    ],
  },
];

function flattenCandidates() {
  return candidateCatalog.flatMap(({ category, items }) =>
    items.map(([chinese, emoji, hsk]) => ({ chinese, emoji, hsk, category }))
  );
}

function ensureSeedExists() {
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed vocabulary is missing: ${seedPath}`);
  }
}

function readSeedWords() {
  ensureSeedExists();
  const seedWords = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  if (!Array.isArray(seedWords)) {
    throw new Error('Seed vocabulary must be an array');
  }
  return seedWords;
}

async function translateToKhmer(text) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'zh-CN');
  url.searchParams.set('tl', 'km');
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translation request failed for "${text}"`);
  }

  const payload = await response.json();
  return payload?.[0]?.map((part) => part[0]).join('').trim();
}

function buildExampleCn(chinese) {
  return `这个词是“${chinese}”。`;
}

function buildExampleKm(khmer) {
  return `ពាក្យនេះគឺ “${khmer}”。`;
}

async function buildNewEntry(candidate, id) {
  const khmer = await translateToKhmer(candidate.chinese);
  return {
    id,
    chinese: candidate.chinese,
    pinyin: pinyin(candidate.chinese, { toneType: 'symbol', type: 'array' }).join(' '),
    khmer,
    emoji: candidate.emoji,
    category: candidate.category,
    hsk: candidate.hsk,
    example_cn: buildExampleCn(candidate.chinese),
    example_km: buildExampleKm(khmer),
  };
}

async function main() {
  const seedWords = readSeedWords();
  const existingByChinese = new Set(seedWords.map((word) => word.chinese));
  const candidates = flattenCandidates().filter((candidate) => !existingByChinese.has(candidate.chinese));

  const needed = Math.max(TARGET_COUNT - seedWords.length, 0);
  const selectedCandidates = candidates.slice(0, needed);
  const startId = Math.max(...seedWords.map((word) => word.id), 0) + 1;
  const generatedWords = [];

  for (let index = 0; index < selectedCandidates.length; index += 1) {
    const entry = await buildNewEntry(selectedCandidates[index], startId + index);
    generatedWords.push(entry);
  }

  const words = [...seedWords, ...generatedWords];
  fs.writeFileSync(outPath, JSON.stringify(words, null, 2), 'utf8');
  console.log(`Generated ${words.length} words to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
