export const ICON_SOURCE_VERSION = 'openmoji-v4';

const OPENMOJI_BASE = 'https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg';

const ACCENT_STYLES = {
  violet: {
    tint: 'rgba(161, 135, 255, 0.18)',
    border: 'rgba(161, 135, 255, 0.3)',
    glow: 'rgba(161, 135, 255, 0.34)',
  },
  blue: {
    tint: 'rgba(93, 194, 255, 0.18)',
    border: 'rgba(93, 194, 255, 0.28)',
    glow: 'rgba(93, 194, 255, 0.34)',
  },
  gold: {
    tint: 'rgba(255, 201, 92, 0.2)',
    border: 'rgba(255, 201, 92, 0.28)',
    glow: 'rgba(255, 201, 92, 0.32)',
  },
  mint: {
    tint: 'rgba(92, 255, 204, 0.18)',
    border: 'rgba(92, 255, 204, 0.28)',
    glow: 'rgba(92, 255, 204, 0.32)',
  },
  coral: {
    tint: 'rgba(255, 121, 137, 0.18)',
    border: 'rgba(255, 121, 137, 0.28)',
    glow: 'rgba(255, 121, 137, 0.32)',
  },
  neutral: {
    tint: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.12)',
    glow: 'rgba(255, 255, 255, 0.18)',
  },
};

const EXACT_RULE_GROUPS = [
  { key: 'gratitude', accent: 'coral', symbol: '🙏', words: ['谢谢', '感谢', '客气'] },
  { key: 'apology', accent: 'coral', symbol: '🙇', words: ['打扰', '抱歉', '麻烦'] },
  { key: 'sleep', accent: 'blue', symbol: '🛌', words: ['睡觉', '困'] },
  { key: 'timeofday', accent: 'blue', symbol: '🌞', words: ['上午', '下午', '中午'] },
  { key: 'night', accent: 'blue', symbol: '🌙', words: ['夜里'] },
  { key: 'media', accent: 'violet', symbol: '🎬', words: ['短剧', '剧集', '剪辑', '拍摄', '导演', '台词'] },
  { key: 'audience', accent: 'blue', symbol: '👀', words: ['观众', '活跃'] },
  { key: 'social-like', accent: 'coral', symbol: '👍', words: ['点赞'] },
  { key: 'beauty', accent: 'mint', symbol: '🧴', words: ['面膜', '面霜', '洗面奶', '精华', '功效', '涂抹', '吸收', '美白', '干燥'] },
  { key: 'download', accent: 'blue', symbol: '⬇️', words: ['下载', '导出'] },
  { key: 'documents', accent: 'violet', symbol: '🧾', words: ['发票', '票', '签字', '合同', '报销', '报告', '资料', '简历', '记录'] },
  { key: 'mail', accent: 'violet', symbol: '✉️', words: ['信'] },
  { key: 'newspaper', accent: 'violet', symbol: '📰', words: ['报纸', '新闻'] },
  { key: 'sound', accent: 'blue', symbol: '🔊', words: ['声音'] },
  { key: 'birthday', accent: 'gold', symbol: '🎂', words: ['生日'] },
  { key: 'phnom-penh', accent: 'violet', symbol: '🏙️', words: ['金边'] },
  { key: 'university', accent: 'violet', symbol: '🎓', words: ['大学', '毕业', '教授', '课程'] },
  { key: 'toys', accent: 'coral', symbol: '🧸', words: ['玩具', '玩具车'] },
  { key: 'color', accent: 'coral', symbol: '🎨', words: ['颜色', '红色', '黑色', '白色', '绿色', '蓝色'] },
  { key: 'trust', accent: 'mint', symbol: '🤝', words: ['相信', '合作', '认识'] },
  { key: 'electronics', accent: 'blue', symbol: '🧊', words: ['冰箱'] },
  { key: 'laundry', accent: 'mint', symbol: '🧺', words: ['洗衣机', '洗衣液'] },
  { key: 'light', accent: 'gold', symbol: '💡', words: ['灯', '停电'] },
  { key: 'tableware', accent: 'gold', symbol: '🍽️', words: ['盘子', '菜单'] },
  { key: 'chopsticks', accent: 'gold', symbol: '🥢', words: ['筷子'] },
  { key: 'spoon', accent: 'gold', symbol: '🥄', words: ['勺子'] },
  { key: 'knife', accent: 'gold', symbol: '🔪', words: ['刀', '切'] },
  { key: 'paper', accent: 'violet', symbol: '📄', words: ['纸', '卫生纸', '纸巾'] },
  { key: 'extreme', accent: 'violet', symbol: '⚡', words: ['极', '必须', '终于'] },
  { key: 'amount', accent: 'gold', symbol: '🔢', words: ['多少', '数量'] },
  { key: 'parking', accent: 'blue', symbol: '🅿️', words: ['停车'] },
  { key: 'traffic-light', accent: 'blue', symbol: '🚦', words: ['红绿灯', '路口'] },
  { key: 'motorbike', accent: 'blue', symbol: '🏍️', words: ['摩托车', '嘟嘟车'] },
  { key: 'traffic-jam', accent: 'blue', symbol: '🚗', words: ['堵车'] },
  { key: 'lost', accent: 'blue', symbol: '🗺️', words: ['迷路'] },
  { key: 'deliver', accent: 'violet', symbol: '📦', words: ['快递', '发货', '发货', '外卖', '打包盒', '箱子', '集装箱'] },
  { key: 'tips', accent: 'gold', symbol: '🪙', words: ['小费', '零钱', '免费', '奖金', '罚款', '税', '关税', '汇率'] },
  { key: 'marketplace', accent: 'gold', symbol: '🥬', words: ['菜市场'] },
  { key: 'atm', accent: 'gold', symbol: '🏧', words: ['取款机'] },
  { key: 'barber', accent: 'coral', symbol: '💈', words: ['理发店'] },
  { key: 'pot', accent: 'gold', symbol: '🍲', words: ['锅', '汤', '煮', '煮粥'] },
  { key: 'frying', accent: 'gold', symbol: '🍳', words: ['炒菜'] },
  { key: 'salt', accent: 'gold', symbol: '🧂', words: ['盐', '咸'] },
  { key: 'sweet', accent: 'gold', symbol: '🍬', words: ['糖'] },
  { key: 'oil', accent: 'gold', symbol: '🫗', words: ['油', '酱油'] },
  { key: 'onion', accent: 'gold', symbol: '🧅', words: ['葱'] },
  { key: 'garlic', accent: 'gold', symbol: '🧄', words: ['大蒜'] },
  { key: 'pepper', accent: 'gold', symbol: '🌶️', words: ['辣椒', '辣椒酱'] },
  { key: 'cabbage', accent: 'gold', symbol: '🥬', words: ['白菜'] },
  { key: 'potato', accent: 'gold', symbol: '🥔', words: ['土豆'] },
  { key: 'tomato', accent: 'gold', symbol: '🍅', words: ['西红柿'] },
  { key: 'mango', accent: 'gold', symbol: '🥭', words: ['芒果'] },
  { key: 'coconut', accent: 'gold', symbol: '🥥', words: ['椰子'] },
  { key: 'lunch', accent: 'gold', symbol: '🍱', words: ['午餐', '晚餐'] },
  { key: 'shirt', accent: 'coral', symbol: '👔', words: ['衬衫'] },
  { key: 'coat', accent: 'coral', symbol: '🧥', words: ['外套'] },
  { key: 'fitting', accent: 'coral', symbol: '🪞', words: ['试穿', '合适', '尺码', '款式'] },
  { key: 'mirror', accent: 'coral', symbol: '🪞', words: ['镜子'] },
  { key: 'glasses', accent: 'blue', symbol: '👓', words: ['眼镜'] },
  { key: 'living-room', accent: 'mint', symbol: '🛋️', words: ['客厅'] },
  { key: 'bedroom', accent: 'mint', symbol: '🛏️', words: ['卧室'] },
  { key: 'kitchen', accent: 'mint', symbol: '🍽️', words: ['厨房'] },
  { key: 'bathroom', accent: 'mint', symbol: '🚿', words: ['洗手间'] },
  { key: 'stairs', accent: 'mint', symbol: '🪜', words: ['楼梯'] },
  { key: 'elevator', accent: 'mint', symbol: '🛗', words: ['电梯'] },
  { key: 'security', accent: 'blue', symbol: '🛡️', words: ['保安', '物业', '锁'] },
  { key: 'community', accent: 'mint', symbol: '🏘️', words: ['小区', '房东', '租房'] },
  { key: 'work-shift', accent: 'violet', symbol: '💼', words: ['上班', '下班', '加班'] },
  { key: 'leave', accent: 'violet', symbol: '🗓️', words: ['请假'] },
  { key: 'late', accent: 'violet', symbol: '⏰', words: ['迟到', '早退', '考勤'] },
  { key: 'salary', accent: 'gold', symbol: '💵', words: ['工资', '提成'] },
  { key: 'interview', accent: 'blue', symbol: '🤝', words: ['面试', '录用'] },
  { key: 'quit', accent: 'coral', symbol: '👋', words: ['辞职', '开除'] },
  { key: 'summary', accent: 'violet', symbol: '📝', words: ['总结', '汇报', '建议', '意见', '讨论'] },
  { key: 'task', accent: 'violet', symbol: '🎯', words: ['任务', '达成'] },
  { key: 'sales', accent: 'gold', symbol: '📈', words: ['业绩', '销售', '增长', '下降', '统计'] },
  { key: 'meeting-room', accent: 'violet', symbol: '🏢', words: ['会议室'] },
  { key: 'printer', accent: 'blue', symbol: '🖨️', words: ['打印', '复印', '扫描'] },
  { key: 'pass', accent: 'mint', symbol: '✅', words: ['合格'] },
  { key: 'excellent', accent: 'gold', symbol: '🏆', words: ['优秀', '中奖', '奖品', '抽奖'] },
  { key: 'progress', accent: 'mint', symbol: '📈', words: ['进步'] },
  { key: 'training', accent: 'violet', symbol: '🎓', words: ['培训', '考核', '调查'] },
  { key: 'fear', accent: 'coral', symbol: '😨', words: ['害怕'] },
  { key: 'nervous', accent: 'coral', symbol: '😬', words: ['紧张'] },
  { key: 'excited', accent: 'coral', symbol: '🤩', words: ['激动'] },
  { key: 'disappointed', accent: 'coral', symbol: '😞', words: ['失望'] },
  { key: 'proud', accent: 'gold', symbol: '🏅', words: ['骄傲'] },
  { key: 'brave', accent: 'coral', symbol: '🦸', words: ['勇敢'] },
  { key: 'lazy', accent: 'coral', symbol: '🛋️', words: ['懒'] },
  { key: 'diligent', accent: 'mint', symbol: '💪', words: ['勤奋', '努力'] },
  { key: 'honest', accent: 'mint', symbol: '🤝', words: ['诚实'] },
  { key: 'warm', accent: 'coral', symbol: '❤️', words: ['热情'] },
  { key: 'funny', accent: 'coral', symbol: '😄', words: ['幽默'] },
  { key: 'serious', accent: 'violet', symbol: '🧐', words: ['认真'] },
  { key: 'patient', accent: 'blue', symbol: '⏳', words: ['耐心'] },
  { key: 'temper', accent: 'coral', symbol: '😤', words: ['脾气'] },
  { key: 'careful', accent: 'gold', symbol: '⚠️', words: ['小心'] },
  { key: 'budget', accent: 'violet', symbol: '📋', words: ['预算'] },
  { key: 'invest', accent: 'gold', symbol: '📈', words: ['投资', '价值'] },
  { key: 'software', accent: 'blue', symbol: '💻', words: ['软件', '屏幕'] },
  { key: 'battery', accent: 'blue', symbol: '🔋', words: ['充电', '电池'] },
  { key: 'keyboard', accent: 'blue', symbol: '⌨️', words: ['键盘'] },
  { key: 'mouse', accent: 'blue', symbol: '🖱️', words: ['鼠标'] },
  { key: 'basketball', accent: 'gold', symbol: '🏀', words: ['篮球', '比赛'] },
  { key: 'win', accent: 'gold', symbol: '🥇', words: ['赢'] },
  { key: 'lose', accent: 'coral', symbol: '😞', words: ['输'] },
  { key: 'thesis', accent: 'violet', symbol: '📄', words: ['论文'] },
  { key: 'speech', accent: 'violet', symbol: '🎤', words: ['演讲', '交流'] },
  { key: 'picture-book', accent: 'violet', symbol: '📚', words: ['绘本'] },
  { key: 'kindergarten', accent: 'blue', symbol: '🏫', words: ['幼儿园'] },
  { key: 'obedient', accent: 'mint', symbol: '👂', words: ['听话'] },
  { key: 'naughty', accent: 'coral', symbol: '😜', words: ['调皮'] },
  { key: 'habit', accent: 'blue', symbol: '🔁', words: ['习惯'] },
  { key: 'wipes', accent: 'mint', symbol: '🧻', words: ['湿巾'] },
  { key: 'blur', accent: 'blue', symbol: '🌫️', words: ['模糊'] },
  { key: 'simple', accent: 'mint', symbol: '🟢', words: ['简单'] },
  { key: 'complex', accent: 'violet', symbol: '🧩', words: ['复杂'] },
  { key: 'protect', accent: 'mint', symbol: '🛡️', words: ['保护'] },
  { key: 'break', accent: 'coral', symbol: '💥', words: ['破坏'] },
  { key: 'repair', accent: 'blue', symbol: '🛠️', words: ['修理', '修理工'] },
  { key: 'test', accent: 'violet', symbol: '🧪', words: ['测试'] },
  { key: 'result', accent: 'mint', symbol: '📌', words: ['结果', '原因', '改变', '过程', '结束'] },
  { key: 'promotion', accent: 'coral', symbol: '📣', words: ['宣传', '服务', '标准'] },
  { key: 'beauty-skin', accent: 'mint', symbol: '🪞', words: ['皮肤', '面膜', '面霜', '洗面奶', '精华', '防晒'] },
  { key: 'baby', accent: 'blue', symbol: '🍼', words: ['奶瓶', '婴儿车', '喂饭', '哄睡'] },
  { key: 'nutrition', accent: 'mint', symbol: '🥛', words: ['营养', '健康', '奶粉'] },
  { key: 'fall', accent: 'coral', symbol: '🤕', words: ['摔倒'] },
  { key: 'hug', accent: 'coral', symbol: '🤱', words: ['抱', '亲'] },
  { key: 'cute', accent: 'coral', symbol: '🥰', words: ['乖', '可爱'] },
  { key: 'port', accent: 'blue', symbol: '🚢', words: ['出口', '港口', '海运'] },
  { key: 'warehouse', accent: 'violet', symbol: '📦', words: ['存货', '盘点', '搬运'] },
  { key: 'stamp', accent: 'violet', symbol: '📮', words: ['盖章'] },
  { key: 'account', accent: 'gold', symbol: '🏦', words: ['账户', '汇款'] },
  { key: 'law', accent: 'violet', symbol: '⚖️', words: ['法律', '规定', '遵守'] },
  { key: 'cleaning', accent: 'mint', symbol: '🧹', words: ['扫地', '拖地', '垃圾袋', '洗手液', '洗洁精'] },
  { key: 'ice', accent: 'blue', symbol: '🧊', words: ['冰块'] },
  { key: 'straw', accent: 'gold', symbol: '🥤', words: ['吸管'] },
  { key: 'mask', accent: 'mint', symbol: '😷', words: ['口罩'] },
  { key: 'smell', accent: 'coral', symbol: '👃', words: ['臭', '香'] },
  { key: 'noise', accent: 'blue', symbol: '🔇', words: ['吵', '安静'] },
  { key: 'mosquito', accent: 'coral', symbol: '🦟', words: ['蚊子', '咬', '痒', '抓'] },
  { key: 'sweat', accent: 'coral', symbol: '💦', words: ['出汗'] },
  { key: 'stomach', accent: 'coral', symbol: '🤢', words: ['拉肚子', '吐'] },
  { key: 'bandage', accent: 'mint', symbol: '🩹', words: ['创可贴', '擦药'] },
  { key: 'generator', accent: 'blue', symbol: '⚙️', words: ['发电机'] },
  { key: 'claws', accent: 'coral', symbol: '✂️', words: ['剪指甲'] },
  { key: 'push-pull', accent: 'blue', symbol: '↔️', words: ['推', '拉'] },
  { key: 'drop-pick', accent: 'coral', symbol: '🫳', words: ['掉', '捡'] },
  { key: 'door-knock', accent: 'blue', symbol: '🚪', words: ['敲门'] },
  { key: 'snack', accent: 'gold', symbol: '🍪', words: ['零食'] },
  { key: 'company', accent: 'violet', symbol: '🏢', words: ['公司'] },
  { key: 'steel', accent: 'violet', symbol: '🏗️', words: ['钢材'] },
  { key: 'quality', accent: 'mint', symbol: '🏅', words: ['质量'] },
  { key: 'son', accent: 'blue', symbol: '👦', words: ['儿子'] },
  { key: 'beautiful', accent: 'coral', symbol: '✨', words: ['漂亮'] },
  { key: 'name', accent: 'violet', symbol: '🏷️', words: ['名字'] },
  { key: 'understand', accent: 'mint', symbol: '💡', words: ['懂', '明白', '知道'] },
  { key: 'story-book', accent: 'violet', symbol: '📖', words: ['故事书'] },
  { key: 'weight', accent: 'gold', symbol: '⚖️', words: ['吨'] },
  { key: 'bill', accent: 'gold', symbol: '🧾', words: ['买单', '确认'] },
  { key: 'timeline', accent: 'blue', symbol: '⏳', words: ['以前', '以后'] },
  { key: 'happen', accent: 'violet', symbol: '✨', words: ['发生'] },
  { key: 'sunday', accent: 'blue', symbol: '☀️', words: ['星期日 / 星期天'] },
  { key: 'internet', accent: 'blue', symbol: '🌐', words: ['网', '网费'] },
  { key: 'almost', accent: 'neutral', symbol: '📍', words: ['几乎', '才', '就', '都', '只', '全', '其实'] },
  { key: 'casual', accent: 'coral', symbol: '👌', words: ['随便'] },
  { key: 'hard-work', accent: 'coral', symbol: '💦', words: ['辛苦'] },
  { key: 'logistics', accent: 'blue', symbol: '🚚', words: ['物流'] },
  { key: 'put', accent: 'blue', symbol: '🫳', words: ['放', '丢'] },
  { key: 'receive', accent: 'blue', symbol: '🤲', words: ['接'] },
  { key: 'call', accent: 'blue', symbol: '📞', words: ['打'] },
  { key: 'look', accent: 'blue', symbol: '👀', words: ['看'] },
  { key: 'utility-bill', accent: 'gold', symbol: '💡', words: ['电费'] },
  { key: 'toothpaste', accent: 'mint', symbol: '🪥', words: ['牙膏'] },
  { key: 'bodywash', accent: 'mint', symbol: '🧴', words: ['沐浴露'] },
  { key: 'towel', accent: 'mint', symbol: '🧻', words: ['毛巾'] },
  { key: 'sick', accent: 'coral', symbol: '🤒', words: ['生病', '感冒', '咳嗽'] },
  { key: 'pharmacy', accent: 'mint', symbol: '💊', words: ['药店', '诊所', '打针'] },
  { key: 'comfortable', accent: 'mint', symbol: '😌', words: ['舒服'] },
  { key: 'sour', accent: 'gold', symbol: '🍋', words: ['酸'] },
  { key: 'bitter', accent: 'gold', symbol: '☕', words: ['苦'] },
  { key: 'taste', accent: 'gold', symbol: '👅', words: ['味道'] },
  { key: 'pork', accent: 'gold', symbol: '🥩', words: ['猪肉'] },
  { key: 'walk', accent: 'mint', symbol: '🚶', words: ['散步', '走路'] },
  { key: 'park', accent: 'mint', symbol: '🌳', words: ['公园'] },
  { key: 'durian', accent: 'gold', symbol: '🍈', words: ['榴莲'] },
  { key: 'bake', accent: 'gold', symbol: '🔥', words: ['烤', '炸'] },
  { key: 'makeup', accent: 'coral', symbol: '💄', words: ['化妆'] },
  { key: 'policy', accent: 'violet', symbol: '📋', words: ['制度'] },
  { key: 'foolish', accent: 'coral', symbol: '🐢', words: ['笨'] },
  { key: 'increase', accent: 'mint', symbol: '📈', words: ['增加'] },
  { key: 'decrease', accent: 'coral', symbol: '📉', words: ['减少'] },
  { key: 'prop', accent: 'violet', symbol: '🧰', words: ['道具'] },
  { key: 'shorts', accent: 'coral', symbol: '🩳', words: ['短裤'] },
  { key: 'tshirt', accent: 'coral', symbol: '👕', words: ['短袖'] },
  { key: 'dirty', accent: 'coral', symbol: '🫧', words: ['脏'] },
  { key: 'exchange-money', accent: 'gold', symbol: '💱', words: ['换钱'] },
  { key: 'question', accent: 'violet', symbol: '❓', words: ['问题'] },
  { key: 'time-word', accent: 'blue', symbol: '⏰', words: ['时间'] },
  { key: 'thing', accent: 'violet', symbol: '📦', words: ['东西'] },
  { key: 'speak', accent: 'blue', symbol: '💬', words: ['说'] },
  { key: 'do', accent: 'violet', symbol: '🛠️', words: ['做'] },
  { key: 'want', accent: 'coral', symbol: '🎯', words: ['要', '想'] },
  { key: 'exist', accent: 'mint', symbol: '📍', words: ['在', '有', '没有'] },
  { key: 'and', accent: 'neutral', symbol: '🔗', words: ['和', '的'] },
  { key: 'human', accent: 'blue', symbol: '🧑', words: ['人', '大家'] },
  { key: 'price-high', accent: 'gold', symbol: '💎', words: ['贵'] },
  { key: 'price-low', accent: 'mint', symbol: '🏷️', words: ['便宜'] },
  { key: 'business-word', accent: 'violet', symbol: '💼', words: ['生意'] },
  { key: 'use', accent: 'blue', symbol: '🔧', words: ['用'] },
];

const EXACT_RULES = new Map(
  EXACT_RULE_GROUPS.flatMap((group) =>
    group.words.map((word) => [
      word,
      { key: group.key, accent: group.accent, symbol: group.symbol },
    ]),
  ),
);

const CATEGORY_RULES = [
  {
    key: 'numbers',
    accent: 'gold',
    match: /^(一|两 \/ 二|三|四|五|六|七|八|九|十|百|千|万|个|次|遍|位|种|岁|半|刻|件|条|张|本|杯|瓶|碗|双|辆|家|些|点|几)$/,
    pool: ['🔢', '🧮', '📏', '📐', '📊', '🏷️', '🔣', '🪙', '📎', '📌'],
  },
  {
    key: 'family',
    accent: 'blue',
    match: /(爸爸|妈妈|哥哥|姐姐|弟弟|妹妹|孩子|宝宝|家人)/,
    pool: ['👨‍👩‍👧', '👨', '👩', '🧒', '👶', '🫂', '👪', '🧑', '👧', '👦'],
  },
  {
    key: 'people',
    accent: 'blue',
    match: /^(你|我|他|她|我们|你们|他们|先生|小姐|男|女|朋友|同学|老师|学生|客户|用户|粉丝|演员|老板|经理|警察|服务员|司机|同事|财务)$/,
    pool: ['🧑', '👩', '👨', '👩‍🏫', '🧑‍🎓', '👮', '🧑‍💼', '👩‍💼', '🧑‍💻', '🤝', '🫶', '🙋', '🧍', '🕴️'],
  },
  {
    key: 'food',
    accent: 'gold',
    match: /^(吃|饭|米饭|面|面条|包子|饺子|菜|水果|苹果|香蕉|西瓜|鸡|牛|鱼|肉|饭店|点餐|早餐|午饭|晚饭|餐厅|超市)$/,
    pool: ['🍚', '🍜', '🍲', '🥟', '🍌', '🍎', '🍉', '🥢', '🍽️', '🍱', '🍳', '🥣'],
  },
  {
    key: 'drink',
    accent: 'gold',
    match: /(喝|水|茶|咖啡|牛奶|果汁|可乐|酒|杯子)/,
    pool: ['🥤', '🧋', '☕', '🍵', '🥛', '🫗', '🧃', '🍶'],
  },
  {
    key: 'money',
    accent: 'gold',
    match: /^(钱|价格|成本|利润|美金|人民币|瑞尔|元|块|毛|角|买|卖|付款|支付|定金|尾款|转账|现金|打折|充值|提现|运费|银行)$/,
    pool: ['💰', '💸', '🪙', '💵', '💳', '🏷️', '🧾', '📈', '📉', '🏦'],
  },
  {
    key: 'transport',
    accent: 'blue',
    match: /^(车|出租车|飞机|火车|地铁|公交车|自行车|机场|护照|签证|行李|旅行证|报关|清关|空运|陆运|运费|打车|路|站|航班)$/,
    pool: ['🚕', '🚗', '🚌', '🚲', '✈️', '🚆', '🧳', '🛂', '🚚', '🚢', '🗺️', '📍'],
  },
  {
    key: 'tech',
    accent: 'blue',
    match: /^(手机|电脑|微信|电话|视频|账号|密码|数据库|导出|系统|权限|图表|转化|播放|评论|收藏|推荐|电视|广告|新闻|数据|平台|流量)$/,
    pool: ['📱', '💻', '⌨️', '🖥️', '🔐', '🗄️', '📊', '📈', '📺', '🎬', '🔊', '🛰️'],
  },
  {
    key: 'study',
    accent: 'violet',
    match: /^(学校|教室|书|笔|本子|成绩|分析|读|写|字|句子|话|故事|剧本|文件|样品|合同|报表|图表|考试|学习|作业|汇总|趋势|留存|翻译)$/,
    pool: ['📘', '📚', '📝', '✍️', '📖', '📒', '📐', '📓', '🧠', '📑', '🗂️', '🎓'],
  },
  {
    key: 'business',
    accent: 'violet',
    match: /^(工作|办公室|工厂|贸易|进口|客户|品牌|市场部|经理|财务|货物|规格|尺寸|重量|验收|安排|沟通|负责|处理|顺利|价格|利润|合同|样品|仓库|文件|目标|成功|努力|计划|准备|会议|市场|钢铁|建筑)$/,
    pool: ['💼', '🏢', '🏭', '📦', '📋', '🧾', '📊', '📌', '🗂️', '🧠', '🎯', '🤝'],
  },
  {
    key: 'clothing',
    accent: 'coral',
    match: /(衣服|裤子|鞋|帽子|包|裙|袜)/,
    pool: ['👕', '👖', '👟', '🧢', '👜', '🎒', '🧥', '👗'],
  },
  {
    key: 'home',
    accent: 'mint',
    match: /^(家|房间|门|窗户|桌子|椅子|床|地方|邻居|地址|垃圾|空调|杯子|剪刀|牙刷|梳子|塑料袋|照片|卡|画|房子|钥匙|厕所)$/,
    pool: ['🏠', '🛏️', '🚪', '🪟', '🪑', '🛋️', '🪥', '🪮', '🧴', '🧻', '🗑️', '🖼️'],
  },
  {
    key: 'health',
    accent: 'mint',
    match: /^(医院|医生|药|皮肤|发烧|敏感|保湿|成分|防晒|头发|洗澡|感觉|安全|危险|检查|发现|解决|清楚|护肤品|化妆品|刷牙|脸|眼睛|肚子|疼|纸尿裤|奶粉)$/,
    pool: ['🩺', '💊', '🩹', '🧴', '🌡️', '🦷', '💆', '🪞', '🧼', '🫧'],
  },
  {
    key: 'animal',
    accent: 'mint',
    match: /(猫|狗|鱼|鸟|马|鸡)/,
    pool: ['🐱', '🐶', '🐟', '🐦', '🐴', '🐔', '🐾'],
  },
  {
    key: 'direction',
    accent: 'gold',
    match: /^(左|右|前|后|里|外|上|下|东|西|南|北|旁|中|近)$/,
    pool: ['🧭', '↔️', '↕️', '➡️', '⬅️', '⬆️', '⬇️', '📍', '🗺️', '🛣️'],
  },
  {
    key: 'time',
    accent: 'blue',
    match: /^(今天|明天|昨天|现在|刚才|时候|分钟|小时|点|星期一|星期二|星期三|星期四|星期五|星期六|星期天|星期日|月|年|今年|周末|晚|早上|晚上|春天|夏天|秋天|冬天|节日|早)$/,
    pool: ['🕒', '⏰', '📅', '🗓️', '⌛', '🌅', '🌙', '⭐', '📆', '⏳'],
  },
  {
    key: 'nature',
    accent: 'mint',
    match: /(天气|雨|雪|风|太阳|树|花|草|海)/,
    pool: ['☀️', '🌧️', '❄️', '🌬️', '🌳', '🌸', '🌊', '⛅', '🍃'],
  },
  {
    key: 'emotion',
    accent: 'coral',
    match: /^(高兴|开心|喜欢|爱|哭|难过|累|生气|放心|担心|奇怪|聪明|饿|渴|胖|瘦|满意|笑)$/,
    pool: ['😊', '😍', '🤔', '😌', '😟', '😠', '😴', '😋', '🥵', '🫠', '🥳', '💡'],
  },
  {
    key: 'action',
    accent: 'coral',
    match: /^(来|走|进|给|找|醒|问|回答|发|忘|跑|聊|洗|玩|爬|告诉|让|决定|同意|拿|送|听|帮助|照顾|欢迎|抱歉|麻烦|负责|处理|去|出|开|关|等|查|收|算|记|帮|试|休息|运动|开始|需要|了解|穿|扫码|修|加油|打扫|借)$/,
    pool: ['🏃', '🚶', '🤲', '🔎', '💬', '📣', '🧼', '🎮', '🪜', '🤝', '🛎️', '🎯'],
  },
  {
    key: 'qualities',
    accent: 'violet',
    match: /^(大|小|多|少|慢|快|对|错|真|假|高|低|满|太|更|最|挺|比较|一直|一定|当然|立即|效果|经验|好|新|旧|坏|远|冷|热|饱|忙|甜|辣|干净|容易)$/,
    pool: ['⚖️', '✅', '❌', '📶', '📉', '📈', '✨', '⚡', '🔍', '🎚️', '🔁'],
  },
  {
    key: 'function',
    accent: 'neutral',
    match: /^(是|但是|觉得|希望|一起|再|还|非常|为了|关于|客气|也|因为|所以|如果|可能|经常|已经|事情|办法|关系)$/,
    pool: ['💭', '🔗', '➕', '🔁', '✨', '🫶', '⚪', '🪄', '🔆', '🧩'],
  },
];

function emojiToOpenMojiUrl(emoji) {
  const code = Array.from(emoji)
    .map((character) => character.codePointAt(0).toString(16).toUpperCase())
    .join('-');
  return `${OPENMOJI_BASE}/${code}.svg`;
}

function hashWord(value) {
  const input = `${value ?? ''}`;
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function normaliseVisual(visual) {
  const accent = visual.accent && ACCENT_STYLES[visual.accent] ? visual.accent : 'neutral';
  return {
    source: visual.source ?? ICON_SOURCE_VERSION,
    symbol: visual.symbol ?? '✨',
    key: visual.key ?? 'custom',
    accent,
    assetUrl: visual.assetUrl ?? null,
    assetAlt: visual.assetAlt ?? null,
    ...ACCENT_STYLES[accent],
  };
}

function pickEmoji(rule, word) {
  const index = hashWord(`${word.chinese ?? ''}-${word.khmer ?? ''}-${rule.key}`) % rule.pool.length;
  return rule.pool[index];
}

function buildVisual(rule, word) {
  const emoji = pickEmoji(rule, word);
  return normaliseVisual({
    source: ICON_SOURCE_VERSION,
    symbol: emoji,
    key: rule.key,
    accent: rule.accent,
    assetUrl: emojiToOpenMojiUrl(emoji),
    assetAlt: `${word.chinese || '词汇'} 图标`,
  });
}

function buildExactVisual(rule, word) {
  return normaliseVisual({
    source: ICON_SOURCE_VERSION,
    symbol: rule.symbol,
    key: rule.key,
    accent: rule.accent,
    assetUrl: emojiToOpenMojiUrl(rule.symbol),
    assetAlt: `${word.chinese || '词汇'} 图标`,
  });
}

function matchRule(word) {
  const haystack = `${word.chinese ?? ''}`.trim();

  return CATEGORY_RULES.find((rule) => rule.match.test(haystack)) ?? null;
}

export function resolveWordVisual(word) {
  if (!word) {
    return normaliseVisual({
      source: ICON_SOURCE_VERSION,
      symbol: '✨',
      key: 'fallback',
      accent: 'neutral',
      assetUrl: emojiToOpenMojiUrl('✨'),
      assetAlt: '默认图标',
    });
  }

  if (word.visual?.source === ICON_SOURCE_VERSION && (word.visual?.assetUrl || word.visual?.symbol)) {
    return normaliseVisual(word.visual);
  }

  const exactMatch = EXACT_RULES.get(`${word.chinese ?? ''}`.trim());
  if (exactMatch) return buildExactVisual(exactMatch, word);

  const matchedRule = matchRule(word) ?? {
    key: 'general',
    accent: 'violet',
    pool: ['💡', '🧩', '🪄', '📌', '🧠', '🌟', '🔷', '🌀', '🎈', '🎁', '🪙', '🗂️'],
  };

  return buildVisual(matchedRule, word);
}
