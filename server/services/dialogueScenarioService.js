import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { badRequest } from '../errors.js';

export const MAX_DIALOGUE_RETRIES = 3;

const DIALOGUE_STAGES = ['跟我读', '你来说', '自由聊'];

function lesson(label, mode, target, focus, prompt, keywords = []) {
  return { label, mode, target, focus, prompt, keywords };
}

const TOPIC_DEFINITIONS = [
  {
    id: 'greeting',
    title: '见面寒暄',
    subtitle: '先问好，再介绍自己。',
    dailyTopic: '今日推荐 · 见面寒暄',
    lessons: [
      lesson('打招呼', 'shadow', '你好，我叫小豆。', '注意“叫”的第四声。', '先听一遍，再跟我读。'),
      lesson('认识你', 'shadow', '很高兴认识你。', '“认识你”要连起来读。', '再跟我读一句。'),
      lesson('你来说', 'prompt', '请你用中文介绍自己的名字。', '至少说出“我叫……”。', '现在轮到你了，请用中文介绍自己的名字。', ['我叫', '你好']),
      lesson('自由聊', 'free', '你今天怎么样？', '用一句完整的话回答。', '最后自由说一句，告诉我你今天怎么样。', ['今天', '我']),
    ],
  },
  {
    id: 'meal',
    title: '餐厅点餐',
    subtitle: '会点菜，也会结账。',
    dailyTopic: '今日推荐 · 餐厅点餐',
    lessons: [
      lesson('点菜', 'shadow', '你好，我要点菜。', '“点菜”要读清楚。', '先跟我读第一句。'),
      lesson('推荐', 'shadow', '有什么推荐的吗？', '句尾要自然上扬。', '再读一句问推荐的话。'),
      lesson('你来说', 'prompt', '请你用中文点一道菜。', '说出“我要……”就可以。', '现在你来点菜。', ['我要', '菜']),
      lesson('自由聊', 'free', '你最喜欢吃什么？', '说一道你喜欢的菜。', '最后自由回答：你最喜欢吃什么？', ['喜欢', '吃']),
    ],
  },
  {
    id: 'shopping',
    title: '商店购物',
    subtitle: '问价格，买东西。',
    dailyTopic: '今日推荐 · 商店购物',
    lessons: [
      lesson('买东西', 'shadow', '我想买这个。', '“这个”要说完整。', '先跟我读这句。'),
      lesson('问价格', 'shadow', '这个多少钱？', '“多少”不要吞音。', '再读一句问价格。'),
      lesson('你来说', 'prompt', '请你问一件商品的价格。', '至少说出“多少钱”。', '轮到你了，请问价格。', ['多少', '钱']),
      lesson('自由聊', 'free', '你平时喜欢买什么？', '说一个你常买的东西。', '最后自由说一句，你平时喜欢买什么？', ['喜欢', '买']),
    ],
  },
  {
    id: 'self_intro',
    title: '自我介绍',
    subtitle: '说名字、国家和职业。',
    dailyTopic: '今日推荐 · 自我介绍',
    lessons: [
      lesson('国家', 'shadow', '我是柬埔寨人。', '“柬埔寨”要慢一点。', '跟我读第一句。'),
      lesson('职业', 'shadow', '我现在是学生。', '“现在”要自然连读。', '再读一句。'),
      lesson('你来说', 'prompt', '请你介绍自己的国家和职业。', '可以用“我是……，我现在……”。', '现在请你介绍自己。', ['我是', '我现在']),
      lesson('自由聊', 'free', '你为什么想学中文？', '说一个学中文的原因。', '最后自由回答：你为什么想学中文？', ['中文', '因为']),
    ],
  },
  {
    id: 'drinks',
    title: '买饮料',
    subtitle: '买水、点咖啡、说冷热。',
    dailyTopic: '今日推荐 · 买饮料',
    lessons: [
      lesson('点饮料', 'shadow', '我要一杯冰咖啡。', '“冰咖啡”要连读。', '先跟我读一句。'),
      lesson('少糖', 'shadow', '请帮我少放一点糖。', '“少放一点”要读顺。', '再读一句要求。'),
      lesson('你来说', 'prompt', '请你点一杯你想喝的饮料。', '说出“我要一杯……”。', '现在轮到你点饮料。', ['我要', '一杯']),
      lesson('自由聊', 'free', '你平时喜欢喝热的还是冰的？', '说出你的习惯。', '最后自由说一句，你喜欢热的还是冰的？', ['喜欢', '热', '冰']),
    ],
  },
  {
    id: 'ask_price',
    title: '问价格',
    subtitle: '学会问价、确认价格。',
    dailyTopic: '今日推荐 · 问价格',
    lessons: [
      lesson('问价', 'shadow', '这个一共多少钱？', '“一共”要读清楚。', '先跟我读一句。'),
      lesson('太贵了', 'shadow', '有便宜一点的吗？', '“便宜一点”注意语气。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问一件东西的总价。', '至少说出“多少钱”。', '轮到你来问价格。', ['多少', '钱']),
      lesson('自由聊', 'free', '如果太贵了，你会怎么说？', '说一句你会说的话。', '最后自由回答。', ['贵', '便宜']),
    ],
  },
  {
    id: 'bargain',
    title: '还价',
    subtitle: '价格太高时怎么说。',
    dailyTopic: '今日推荐 · 还价',
    lessons: [
      lesson('便宜点', 'shadow', '可以便宜一点吗？', '“便宜”两个字要清楚。', '先读这句。'),
      lesson('再少一点', 'shadow', '再少一点吧。', '“少一点”语气要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你用中文试着还价。', '说出“便宜一点”就可以。', '现在你来还价。', ['便宜', '一点']),
      lesson('自由聊', 'free', '你买东西会常常还价吗？', '说你的习惯。', '最后自由回答。', ['买东西', '会']),
    ],
  },
  {
    id: 'payment',
    title: '付款结账',
    subtitle: '会说现金、扫码、刷卡。',
    dailyTopic: '今日推荐 · 付款结账',
    lessons: [
      lesson('结账', 'shadow', '你好，我想结账。', '“结账”读得干净一点。', '先跟我读一句。'),
      lesson('支付方式', 'shadow', '我可以扫码付款吗？', '“扫码付款”要一口气读完。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问对方能不能扫码。', '说出“扫码付款”就可以。', '轮到你来问付款方式。', ['扫码', '付款']),
      lesson('自由聊', 'free', '你平时最常用什么方式付款？', '说一种方式。', '最后自由回答。', ['付款', '我']),
    ],
  },
  {
    id: 'taxi',
    title: '打车出行',
    subtitle: '说目的地和路线。',
    dailyTopic: '今日推荐 · 打车出行',
    lessons: [
      lesson('目的地', 'shadow', '师傅，请去中央市场。', '“中央市场”要读清楚。', '先跟我读一句。'),
      lesson('快一点', 'shadow', '麻烦开快一点。', '“麻烦”语气要礼貌。', '再读一句。'),
      lesson('你来说', 'prompt', '请你告诉司机你要去哪里。', '说出“请去……”。', '现在你来告诉司机目的地。', ['请去']),
      lesson('自由聊', 'free', '你平时坐出租车还是骑摩托？', '说一种出行方式。', '最后自由回答。', ['出租车', '摩托']),
    ],
  },
  {
    id: 'direction',
    title: '问路',
    subtitle: '不会迷路的基础表达。',
    dailyTopic: '今日推荐 · 问路',
    lessons: [
      lesson('问路', 'shadow', '请问，地铁站在哪儿？', '“在哪儿”要自然一点。', '先跟我读一句。'),
      lesson('左右转', 'shadow', '一直走，然后右转。', '“然后右转”要连贯。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问别人厕所在哪里。', '说出“请问……在哪儿”。', '轮到你来问路。', ['请问', '在哪']),
      lesson('自由聊', 'free', '你在新地方会用地图吗？', '说说你的习惯。', '最后自由回答。', ['地图', '会']),
    ],
  },
  {
    id: 'bus',
    title: '坐公交',
    subtitle: '问车次和下车地点。',
    dailyTopic: '今日推荐 · 坐公交',
    lessons: [
      lesson('车次', 'shadow', '去机场坐几路车？', '“几路车”要清楚。', '先跟我读一句。'),
      lesson('下车', 'shadow', '到了请提醒我。', '“提醒我”读完整。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问去学校坐哪路车。', '至少说出“坐几路车”。', '现在轮到你来问。', ['几路车']),
      lesson('自由聊', 'free', '你坐公交会提前看路线吗？', '说说你的习惯。', '最后自由回答。', ['公交', '路线']),
    ],
  },
  {
    id: 'hotel',
    title: '酒店入住',
    subtitle: '办理入住和确认房间。',
    dailyTopic: '今日推荐 · 酒店入住',
    lessons: [
      lesson('入住', 'shadow', '你好，我想办理入住。', '“办理入住”要连读。', '先跟我读一句。'),
      lesson('房型', 'shadow', '我订的是双人房。', '“双人房”要读准。', '再读一句。'),
      lesson('你来说', 'prompt', '请你告诉前台你想入住。', '说出“办理入住”。', '现在你来说。', ['入住']),
      lesson('自由聊', 'free', '你出门住酒店最在意什么？', '说一个重点。', '最后自由回答。', ['酒店', '在意']),
    ],
  },
  {
    id: 'rent_house',
    title: '租房看房',
    subtitle: '问租金、押金和位置。',
    dailyTopic: '今日推荐 · 租房看房',
    lessons: [
      lesson('问租金', 'shadow', '这套房子一个月多少钱？', '“一个月”别吞音。', '先跟我读一句。'),
      lesson('押金', 'shadow', '需要付多少押金？', '“押金”要读准。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问房东租金是多少。', '至少说出“多少钱”。', '轮到你来问租金。', ['多少', '钱']),
      lesson('自由聊', 'free', '你租房最看重什么？', '说一个条件。', '最后自由回答。', ['租房', '看重']),
    ],
  },
  {
    id: 'doctor',
    title: '看医生',
    subtitle: '描述哪里不舒服。',
    dailyTopic: '今日推荐 · 看医生',
    lessons: [
      lesson('症状', 'shadow', '医生，我头疼。', '“头疼”要自然。', '先跟我读一句。'),
      lesson('发烧', 'shadow', '我昨天晚上发烧了。', '“发烧了”尾音放松。', '再读一句。'),
      lesson('你来说', 'prompt', '请你告诉医生你哪里不舒服。', '说出“我……不舒服”。', '现在你来说。', ['我', '不舒服']),
      lesson('自由聊', 'free', '你生病的时候会先做什么？', '说一个习惯。', '最后自由回答。', ['生病', '会']),
    ],
  },
  {
    id: 'pharmacy',
    title: '药店买药',
    subtitle: '问症状，买常用药。',
    dailyTopic: '今日推荐 · 药店买药',
    lessons: [
      lesson('买药', 'shadow', '我想买感冒药。', '“感冒药”要连起来读。', '先跟我读一句。'),
      lesson('怎么吃', 'shadow', '这个药一天吃几次？', '“一天吃几次”要清楚。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问药怎么吃。', '至少说出“吃几次”。', '轮到你来问。', ['几次']),
      lesson('自由聊', 'free', '你平时会自己买药吗？', '说说你的习惯。', '最后自由回答。', ['买药', '会']),
    ],
  },
  {
    id: 'weather',
    title: '聊天气',
    subtitle: '冷暖、下雨、出太阳。',
    dailyTopic: '今日推荐 · 聊天气',
    lessons: [
      lesson('天气', 'shadow', '今天很热。', '“很热”别读太快。', '先跟我读一句。'),
      lesson('下雨', 'shadow', '外面好像要下雨了。', '“好像要下雨了”慢一点。', '再读一句。'),
      lesson('你来说', 'prompt', '请你说一下今天的天气。', '至少说出“今天……”。', '现在轮到你来说天气。', ['今天']),
      lesson('自由聊', 'free', '你喜欢晴天还是雨天？', '说出你的选择。', '最后自由回答。', ['喜欢', '晴天', '雨天']),
    ],
  },
  {
    id: 'time_date',
    title: '时间日期',
    subtitle: '问时间，也会说日期。',
    dailyTopic: '今日推荐 · 时间日期',
    lessons: [
      lesson('问时间', 'shadow', '现在几点了？', '“几点了”要清楚。', '先跟我读一句。'),
      lesson('说日期', 'shadow', '今天是三月三十号。', '日期要完整。', '再读一句。'),
      lesson('你来说', 'prompt', '请你说一下今天几号。', '至少说出“今天是……号”。', '现在轮到你来说日期。', ['今天是', '号']),
      lesson('自由聊', 'free', '你一般几点起床？', '说一个时间。', '最后自由回答。', ['几点']),
    ],
  },
  {
    id: 'invite_friend',
    title: '邀请朋友',
    subtitle: '约吃饭、约见面。',
    dailyTopic: '今日推荐 · 邀请朋友',
    lessons: [
      lesson('邀请', 'shadow', '你晚上有空吗？', '“有空吗”要自然上扬。', '先跟我读一句。'),
      lesson('约时间', 'shadow', '我们一起吃饭吧。', '“一起吃饭吧”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你邀请朋友一起喝咖啡。', '说出“我们一起……”。', '现在你来邀请朋友。', ['一起']),
      lesson('自由聊', 'free', '你最喜欢和朋友做什么？', '说一个活动。', '最后自由回答。', ['朋友', '喜欢']),
    ],
  },
  {
    id: 'phone_call',
    title: '打电话',
    subtitle: '接电话，找人，说稍等。',
    dailyTopic: '今日推荐 · 打电话',
    lessons: [
      lesson('接电话', 'shadow', '喂，请问你找谁？', '“请问你找谁”要礼貌。', '先跟我读一句。'),
      lesson('稍等', 'shadow', '请稍等一下。', '“稍等一下”要柔和。', '再读一句。'),
      lesson('你来说', 'prompt', '请你在电话里找小王。', '说出“请问小王在吗”。', '现在你来说。', ['小王', '在吗']),
      lesson('自由聊', 'free', '你更喜欢打电话还是发消息？', '说出你的选择。', '最后自由回答。', ['电话', '消息']),
    ],
  },
  {
    id: 'delivery',
    title: '寄快递',
    subtitle: '填地址，问运费。',
    dailyTopic: '今日推荐 · 寄快递',
    lessons: [
      lesson('寄件', 'shadow', '我想寄一个包裹。', '“寄一个包裹”一口气读完。', '先跟我读一句。'),
      lesson('运费', 'shadow', '寄到金边要多少钱？', '“寄到金边”要清楚。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问寄快递多少钱。', '至少说出“多少钱”。', '现在轮到你来问。', ['多少', '钱']),
      lesson('自由聊', 'free', '你最近寄过什么东西？', '说一个东西。', '最后自由回答。', ['寄过']),
    ],
  },
  {
    id: 'pickup',
    title: '取快递',
    subtitle: '报号码，确认包裹。',
    dailyTopic: '今日推荐 · 取快递',
    lessons: [
      lesson('报号码', 'shadow', '我来取快递。', '“取快递”要清楚。', '先跟我读一句。'),
      lesson('确认信息', 'shadow', '请你看一下手机号码。', '“手机号码”读完整。', '再读一句。'),
      lesson('你来说', 'prompt', '请你告诉对方你来取快递。', '说出“我来取快递”。', '现在轮到你。', ['取快递']),
      lesson('自由聊', 'free', '你平时收快递多吗？', '简单说说。', '最后自由回答。', ['快递']),
    ],
  },
  {
    id: 'work_greet',
    title: '上班问候',
    subtitle: '上班见面自然寒暄。',
    dailyTopic: '今日推荐 · 上班问候',
    lessons: [
      lesson('早上好', 'shadow', '早上好，今天辛苦了。', '“辛苦了”要自然。', '先跟我读一句。'),
      lesson('开会', 'shadow', '我们十点开会。', '时间要读准。', '再读一句。'),
      lesson('你来说', 'prompt', '请你提醒同事十点开会。', '说出“十点开会”。', '现在轮到你。', ['十点', '开会']),
      lesson('自由聊', 'free', '你工作前会先做什么？', '说一个动作。', '最后自由回答。', ['工作', '先']),
    ],
  },
  {
    id: 'interview',
    title: '面试',
    subtitle: '回答经历和优点。',
    dailyTopic: '今日推荐 · 面试',
    lessons: [
      lesson('介绍经历', 'shadow', '我有两年的工作经验。', '“工作经验”要清楚。', '先跟我读一句。'),
      lesson('说优点', 'shadow', '我做事很认真。', '“很认真”语气稳定。', '再读一句。'),
      lesson('你来说', 'prompt', '请你说一个自己的优点。', '说出“我……很……”。', '现在轮到你。', ['我', '很']),
      lesson('自由聊', 'free', '你最想找什么样的工作？', '说你的想法。', '最后自由回答。', ['工作']),
    ],
  },
  {
    id: 'ask_leave',
    title: '请假',
    subtitle: '生病或有事时怎么说。',
    dailyTopic: '今日推荐 · 请假',
    lessons: [
      lesson('请假', 'shadow', '老师，我今天想请假。', '“请假”要读清楚。', '先跟我读一句。'),
      lesson('原因', 'shadow', '因为我有点不舒服。', '“有点不舒服”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你说一个请假的理由。', '说出“因为我……”。', '现在轮到你。', ['因为我']),
      lesson('自由聊', 'free', '你生病时会先休息还是先看医生？', '说一个选择。', '最后自由回答。', ['生病']),
    ],
  },
  {
    id: 'classroom',
    title: '课堂提问',
    subtitle: '听不懂时怎么问老师。',
    dailyTopic: '今日推荐 · 课堂提问',
    lessons: [
      lesson('听不懂', 'shadow', '老师，我没听懂。', '“没听懂”要清楚。', '先跟我读一句。'),
      lesson('再说一遍', 'shadow', '你可以再说一遍吗？', '“再说一遍”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你请老师说慢一点。', '说出“慢一点”。', '现在轮到你。', ['慢一点']),
      lesson('自由聊', 'free', '你上课最怕听不懂什么？', '说一个内容。', '最后自由回答。', ['上课']),
    ],
  },
  {
    id: 'homework',
    title: '作业交流',
    subtitle: '问作业和交作业。',
    dailyTopic: '今日推荐 · 作业交流',
    lessons: [
      lesson('问作业', 'shadow', '今天有作业吗？', '“作业吗”尾音上扬。', '先跟我读一句。'),
      lesson('交作业', 'shadow', '我已经做完了。', '“做完了”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你告诉老师你做完作业了。', '说出“做完了”。', '现在轮到你。', ['做完了']),
      lesson('自由聊', 'free', '你喜欢先写作业还是先休息？', '说一个选择。', '最后自由回答。', ['作业']),
    ],
  },
  {
    id: 'hobbies',
    title: '兴趣爱好',
    subtitle: '聊喜欢做什么。',
    dailyTopic: '今日推荐 · 兴趣爱好',
    lessons: [
      lesson('喜欢什么', 'shadow', '我喜欢听音乐。', '“听音乐”要连读。', '先跟我读一句。'),
      lesson('空闲时间', 'shadow', '周末我喜欢看电影。', '“周末”要读准。', '再读一句。'),
      lesson('你来说', 'prompt', '请你说一个自己的爱好。', '说出“我喜欢……”。', '现在轮到你。', ['我喜欢']),
      lesson('自由聊', 'free', '你最近最常做什么？', '说一个活动。', '最后自由回答。', ['最近']),
    ],
  },
  {
    id: 'family',
    title: '家庭成员',
    subtitle: '说爸爸妈妈和兄弟姐妹。',
    dailyTopic: '今日推荐 · 家庭成员',
    lessons: [
      lesson('介绍家人', 'shadow', '我家有四口人。', '“四口人”要读清楚。', '先跟我读一句。'),
      lesson('兄弟姐妹', 'shadow', '我有一个姐姐。', '“一个姐姐”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你介绍一位家人。', '说出“我有……”或“我妈妈……”。', '现在轮到你。', ['我有', '我妈妈']),
      lesson('自由聊', 'free', '你和家里谁最常聊天？', '说一个人。', '最后自由回答。', ['家里']),
    ],
  },
  {
    id: 'birthday',
    title: '过生日',
    subtitle: '祝福、邀请、说礼物。',
    dailyTopic: '今日推荐 · 过生日',
    lessons: [
      lesson('祝福', 'shadow', '生日快乐！', '“快乐”要清楚。', '先跟我读一句。'),
      lesson('邀请', 'shadow', '欢迎你来参加我的生日会。', '句子要连贯。', '再读一句。'),
      lesson('你来说', 'prompt', '请你祝朋友生日快乐。', '说出“生日快乐”。', '现在轮到你。', ['生日快乐']),
      lesson('自由聊', 'free', '你最想收到什么礼物？', '说一个礼物。', '最后自由回答。', ['礼物']),
    ],
  },
  {
    id: 'travel_plan',
    title: '旅行计划',
    subtitle: '说时间、地点和安排。',
    dailyTopic: '今日推荐 · 旅行计划',
    lessons: [
      lesson('去哪里', 'shadow', '下个月我想去曼谷。', '“下个月”要读准。', '先跟我读一句。'),
      lesson('住几天', 'shadow', '我打算住三天。', '“住三天”要清楚。', '再读一句。'),
      lesson('你来说', 'prompt', '请你说一个想去的地方。', '说出“我想去……”。', '现在轮到你。', ['我想去']),
      lesson('自由聊', 'free', '你旅行时最喜欢做什么？', '说一个活动。', '最后自由回答。', ['旅行']),
    ],
  },
  {
    id: 'airport',
    title: '机场出发',
    subtitle: '值机、行李、登机口。',
    dailyTopic: '今日推荐 · 机场出发',
    lessons: [
      lesson('值机', 'shadow', '你好，我想办理值机。', '“办理值机”要顺。', '先跟我读一句。'),
      lesson('登机口', 'shadow', '请问登机口在哪里？', '“登机口”要读清楚。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问登机口在哪里。', '说出“在哪里”。', '现在轮到你。', ['在哪里']),
      lesson('自由聊', 'free', '你坐飞机会紧张吗？', '说说你的感受。', '最后自由回答。', ['飞机']),
    ],
  },
  {
    id: 'train_station',
    title: '火车站',
    subtitle: '买票、改签、找站台。',
    dailyTopic: '今日推荐 · 火车站',
    lessons: [
      lesson('买票', 'shadow', '我想买一张去西安的票。', '“一张”不要吞音。', '先跟我读一句。'),
      lesson('站台', 'shadow', '请问这是几号站台？', '“几号站台”要清楚。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问车票多少钱。', '至少说出“多少钱”。', '现在轮到你。', ['多少', '钱']),
      lesson('自由聊', 'free', '你更喜欢坐火车还是坐飞机？', '说一个选择。', '最后自由回答。', ['火车', '飞机']),
    ],
  },
  {
    id: 'emergency',
    title: '紧急求助',
    subtitle: '不会说时先求助。',
    dailyTopic: '今日推荐 · 紧急求助',
    lessons: [
      lesson('帮帮我', 'shadow', '请帮帮我。', '“帮帮我”语气真诚。', '先跟我读一句。'),
      lesson('我迷路了', 'shadow', '我迷路了。', '“迷路了”要完整。', '再读一句。'),
      lesson('你来说', 'prompt', '请你用中文求助。', '至少说出“请帮帮我”。', '现在轮到你。', ['帮帮我']),
      lesson('自由聊', 'free', '遇到紧急情况时你会先联系谁？', '说一个人。', '最后自由回答。', ['联系']),
    ],
  },
  {
    id: 'police',
    title: '报警求助',
    subtitle: '找警察、说问题。',
    dailyTopic: '今日推荐 · 报警求助',
    lessons: [
      lesson('找警察', 'shadow', '警察先生，我的钱包丢了。', '“钱包丢了”要清楚。', '先跟我读一句。'),
      lesson('在哪里丢的', 'shadow', '我在市场丢的。', '“在市场丢的”要完整。', '再读一句。'),
      lesson('你来说', 'prompt', '请你告诉警察你丢了什么。', '说出“我……丢了”。', '现在轮到你。', ['丢了']),
      lesson('自由聊', 'free', '如果丢了手机，你第一步会做什么？', '说一个动作。', '最后自由回答。', ['手机']),
    ],
  },
  {
    id: 'bank',
    title: '银行业务',
    subtitle: '开户、取钱、问手续费。',
    dailyTopic: '今日推荐 · 银行业务',
    lessons: [
      lesson('开户', 'shadow', '我想开一个银行账户。', '“银行账户”要清楚。', '先跟我读一句。'),
      lesson('取钱', 'shadow', '我想取一点现金。', '“一点现金”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问转账手续费。', '说出“手续费”。', '现在轮到你。', ['手续费']),
      lesson('自由聊', 'free', '你平时去银行多吗？', '说说你的情况。', '最后自由回答。', ['银行']),
    ],
  },
  {
    id: 'exchange_money',
    title: '换钱',
    subtitle: '换汇率、换零钱。',
    dailyTopic: '今日推荐 · 换钱',
    lessons: [
      lesson('换钱', 'shadow', '我想换一点人民币。', '“人民币”要读清楚。', '先跟我读一句。'),
      lesson('汇率', 'shadow', '今天的汇率是多少？', '“汇率”不要吞音。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问今天汇率。', '说出“汇率是多少”。', '现在轮到你。', ['汇率']),
      lesson('自由聊', 'free', '你出门会带现金吗？', '说一个习惯。', '最后自由回答。', ['现金']),
    ],
  },
  {
    id: 'salon',
    title: '理发店',
    subtitle: '剪头发、洗头、修一点。',
    dailyTopic: '今日推荐 · 理发店',
    lessons: [
      lesson('剪头发', 'shadow', '我想剪短一点。', '“短一点”要清楚。', '先跟我读一句。'),
      lesson('洗头', 'shadow', '先帮我洗头吧。', '“洗头吧”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你告诉理发师你想怎么剪。', '说出“一点”。', '现在轮到你。', ['一点']),
      lesson('自由聊', 'free', '你多久理一次发？', '说一个时间。', '最后自由回答。', ['多久']),
    ],
  },
  {
    id: 'gym',
    title: '健身房',
    subtitle: '办卡、练什么、几点去。',
    dailyTopic: '今日推荐 · 健身房',
    lessons: [
      lesson('办卡', 'shadow', '我想办一张月卡。', '“一张月卡”要读清楚。', '先跟我读一句。'),
      lesson('练习', 'shadow', '我今天想练腿。', '“练腿”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你说你想练什么。', '说出“我想练……”。', '现在轮到你。', ['我想练']),
      lesson('自由聊', 'free', '你喜欢跑步还是举重？', '说一个选择。', '最后自由回答。', ['跑步', '举重']),
    ],
  },
  {
    id: 'market',
    title: '菜市场',
    subtitle: '买菜、买水果、看新鲜。',
    dailyTopic: '今日推荐 · 菜市场',
    lessons: [
      lesson('买菜', 'shadow', '我要两斤西红柿。', '“两斤西红柿”要清楚。', '先跟我读一句。'),
      lesson('新鲜吗', 'shadow', '这个新鲜吗？', '“新鲜吗”尾音上扬。', '再读一句。'),
      lesson('你来说', 'prompt', '请你买一种水果。', '说出“我要……”。', '现在轮到你。', ['我要']),
      lesson('自由聊', 'free', '你最常买什么菜？', '说一种菜。', '最后自由回答。', ['买', '菜']),
    ],
  },
  {
    id: 'supermarket',
    title: '超市购物',
    subtitle: '找商品，看促销。',
    dailyTopic: '今日推荐 · 超市购物',
    lessons: [
      lesson('找东西', 'shadow', '请问牛奶在哪一排？', '“哪一排”要清楚。', '先跟我读一句。'),
      lesson('促销', 'shadow', '这个今天有折扣吗？', '“有折扣吗”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问洗发水在哪里。', '说出“在哪里”。', '现在轮到你。', ['在哪里']),
      lesson('自由聊', 'free', '你逛超市会先买必需品吗？', '说说你的习惯。', '最后自由回答。', ['超市']),
    ],
  },
  {
    id: 'internet',
    title: '网络问题',
    subtitle: '网慢、断网、重连。',
    dailyTopic: '今日推荐 · 网络问题',
    lessons: [
      lesson('网络慢', 'shadow', '这里的网有点慢。', '“有点慢”要自然。', '先跟我读一句。'),
      lesson('连不上', 'shadow', '我连不上无线网。', '“无线网”要清楚。', '再读一句。'),
      lesson('你来说', 'prompt', '请你告诉店员网络有问题。', '说出“连不上”。', '现在轮到你。', ['连不上']),
      lesson('自由聊', 'free', '没有网络的时候你最着急做什么？', '说一个事情。', '最后自由回答。', ['网络']),
    ],
  },
  {
    id: 'recharge',
    title: '手机充值',
    subtitle: '充值流量和话费。',
    dailyTopic: '今日推荐 · 手机充值',
    lessons: [
      lesson('充值', 'shadow', '我想充五十块钱话费。', '金额要说清楚。', '先跟我读一句。'),
      lesson('流量', 'shadow', '这个套餐有多少流量？', '“多少流量”要清楚。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问一个流量套餐。', '说出“多少流量”。', '现在轮到你。', ['流量']),
      lesson('自由聊', 'free', '你每个月手机流量够用吗？', '说说你的情况。', '最后自由回答。', ['流量']),
    ],
  },
  {
    id: 'laundry',
    title: '洗衣店',
    subtitle: '送洗、取衣服、问时间。',
    dailyTopic: '今日推荐 · 洗衣店',
    lessons: [
      lesson('送洗', 'shadow', '我想洗这件外套。', '“这件外套”要完整。', '先跟我读一句。'),
      lesson('什么时候拿', 'shadow', '明天下午可以拿吗？', '“明天下午”要读准。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问什么时候可以来拿。', '说出“什么时候”。', '现在轮到你。', ['什么时候']),
      lesson('自由聊', 'free', '你平时自己洗衣服吗？', '说说你的习惯。', '最后自由回答。', ['洗衣服']),
    ],
  },
  {
    id: 'repair_phone',
    title: '修手机',
    subtitle: '屏幕坏了、电池不行了。',
    dailyTopic: '今日推荐 · 修手机',
    lessons: [
      lesson('手机坏了', 'shadow', '我的手机屏幕碎了。', '“屏幕碎了”要清楚。', '先跟我读一句。'),
      lesson('修多久', 'shadow', '修好要多久？', '“要多久”尾音上扬。', '再读一句。'),
      lesson('你来说', 'prompt', '请你告诉店员你的手机坏了。', '说出“手机……了”。', '现在轮到你。', ['手机']),
      lesson('自由聊', 'free', '如果手机坏了，你最担心什么？', '说一个问题。', '最后自由回答。', ['手机']),
    ],
  },
  {
    id: 'hospital_register',
    title: '医院挂号',
    subtitle: '先挂号，再找科室。',
    dailyTopic: '今日推荐 · 医院挂号',
    lessons: [
      lesson('挂号', 'shadow', '我想挂内科。', '“内科”要读准。', '先跟我读一句。'),
      lesson('排队', 'shadow', '我要先排队吗？', '“排队吗”尾音上扬。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问挂号窗口在哪里。', '说出“在哪里”。', '现在轮到你。', ['在哪里']),
      lesson('自由聊', 'free', '你去医院最怕等什么？', '说一个事情。', '最后自由回答。', ['医院']),
    ],
  },
  {
    id: 'weekend_plan',
    title: '周末计划',
    subtitle: '安排出门、休息、见朋友。',
    dailyTopic: '今日推荐 · 周末计划',
    lessons: [
      lesson('周末安排', 'shadow', '周末我想去看电影。', '“周末我想去”要自然。', '先跟我读一句。'),
      lesson('约时间', 'shadow', '你周六有空吗？', '“周六有空吗”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你说一个周末计划。', '说出“我想去……”。', '现在轮到你。', ['我想去']),
      lesson('自由聊', 'free', '你更喜欢在家休息还是出去玩？', '说一个选择。', '最后自由回答。', ['喜欢']),
    ],
  },
  {
    id: 'holiday',
    title: '节日祝福',
    subtitle: '春节、中秋、节日问候。',
    dailyTopic: '今日推荐 · 节日祝福',
    lessons: [
      lesson('祝福', 'shadow', '节日快乐！', '“快乐”要清楚。', '先跟我读一句。'),
      lesson('问候', 'shadow', '祝你和家人平安幸福。', '“平安幸福”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你说一句节日祝福。', '说出“快乐”或“幸福”。', '现在轮到你。', ['快乐', '幸福']),
      lesson('自由聊', 'free', '你最喜欢哪个节日？', '说一个节日。', '最后自由回答。', ['喜欢']),
    ],
  },
  {
    id: 'cafe_chat',
    title: '咖啡店聊天',
    subtitle: '约见面，聊近况。',
    dailyTopic: '今日推荐 · 咖啡店聊天',
    lessons: [
      lesson('坐这里', 'shadow', '我们坐这边吧。', '“这边吧”要自然。', '先跟我读一句。'),
      lesson('最近忙吗', 'shadow', '你最近忙不忙？', '“忙不忙”要清楚。', '再读一句。'),
      lesson('你来说', 'prompt', '请你问朋友最近怎么样。', '说出“最近”。', '现在轮到你。', ['最近']),
      lesson('自由聊', 'free', '你喜欢安静的咖啡店还是热闹的？', '说一个选择。', '最后自由回答。', ['喜欢']),
    ],
  },
  {
    id: 'movie_plan',
    title: '约看电影',
    subtitle: '选电影、约时间、问感受。',
    dailyTopic: '今日推荐 · 约看电影',
    lessons: [
      lesson('想看什么', 'shadow', '你想看哪一部电影？', '“哪一部电影”要清楚。', '先跟我读一句。'),
      lesson('约时间', 'shadow', '我们晚上七点见吧。', '时间要读准。', '再读一句。'),
      lesson('你来说', 'prompt', '请你约朋友晚上看电影。', '说出“晚上……见”。', '现在轮到你。', ['晚上']),
      lesson('自由聊', 'free', '你更喜欢喜剧还是动作片？', '说一个选择。', '最后自由回答。', ['喜欢']),
    ],
  },
  {
    id: 'after_school',
    title: '放学后',
    subtitle: '聊下课、回家、吃什么。',
    dailyTopic: '今日推荐 · 放学后',
    lessons: [
      lesson('放学了', 'shadow', '我先回家了。', '“回家了”要自然。', '先跟我读一句。'),
      lesson('一起去吃', 'shadow', '要不要一起吃饭？', '“要不要”要自然。', '再读一句。'),
      lesson('你来说', 'prompt', '请你邀请同学一起吃饭。', '说出“一起吃饭”。', '现在轮到你。', ['一起吃饭']),
      lesson('自由聊', 'free', '你放学后最想做什么？', '说一个活动。', '最后自由回答。', ['放学后']),
    ],
  },
];

function loadKhmerTranslationMap() {
  try {
    const filePath = path.join(config.rootDir, 'data', 'dialogue-khmer-translation-template.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return new Map(
      (Array.isArray(data) ? data : []).map((topic) => [topic.id, Array.isArray(topic.translations) ? topic.translations : []])
    );
  } catch (error) {
    console.warn('Failed to load dialogue Khmer translations:', error.message);
    return new Map();
  }
}

const KHMER_TRANSLATION_MAP = loadKhmerTranslationMap();

function toStage(mode) {
  if (mode === 'shadow') return '跟我读';
  if (mode === 'prompt') return '你来说';
  return '自由聊';
}

function createScenario(definition) {
  const translations = KHMER_TRANSLATION_MAP.get(definition.id) || [];
  return {
    id: definition.id,
    title: definition.title,
    subtitle: definition.subtitle,
    dailyTopic: definition.dailyTopic,
    coachName: 'Bunson',
    stages: DIALOGUE_STAGES,
    lessons: definition.lessons.map((item, index) => {
      const translation = translations[index] || {};
      return {
        id: `${definition.id}-lesson-${index + 1}`,
        label: item.label,
        mode: item.mode,
        stage: toStage(item.mode),
        target: item.target,
        targetKm: translation.targetKm || '',
        focus: item.focus,
        focusKm: translation.focusKm || '',
        prompt: item.prompt,
        promptKm: translation.promptKm || '',
        keywords: item.keywords || [],
      };
    }),
  };
}

const SCENARIOS = TOPIC_DEFINITIONS.map(createScenario);
const SCENARIO_MAP = new Map(SCENARIOS.map((scenario) => [scenario.id, scenario]));

function sanitizeScenario(scenario) {
  return {
    id: scenario.id,
    title: scenario.title,
    subtitle: scenario.subtitle,
    dailyTopic: scenario.dailyTopic,
    coachName: scenario.coachName,
    stages: scenario.stages,
  };
}

function hashString(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildDateKey(inputDate) {
  const date = inputDate instanceof Date ? inputDate : new Date(inputDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[，。！？、,.!?\s]/g, '')
    .trim();
}

function levenshteinDistance(source, target) {
  const rows = source.length + 1;
  const cols = target.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let col = 0; col < cols; col += 1) matrix[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = source[row - 1] === target[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      );
    }
  }

  return matrix[source.length][target.length];
}

function textSimilarity(source, target) {
  if (!source || !target) return 0;
  const distance = levenshteinDistance(source, target);
  return 1 - distance / Math.max(source.length, target.length, 1);
}

function passesLesson(lessonItem, transcript) {
  const normalizedTranscript = normalizeText(transcript);
  if (!normalizedTranscript) return false;

  if (lessonItem.mode === 'shadow') {
    const normalizedTarget = normalizeText(lessonItem.target);
    if (normalizedTranscript.includes(normalizedTarget) || normalizedTarget.includes(normalizedTranscript)) {
      return true;
    }
    return textSimilarity(normalizedTranscript, normalizedTarget) >= 0.7;
  }

  const hitCount = (lessonItem.keywords || []).filter((keyword) =>
    normalizedTranscript.includes(normalizeText(keyword))
  ).length;

  if (hitCount >= Math.max(1, Math.ceil((lessonItem.keywords || []).length / 2))) {
    return true;
  }

  return normalizedTranscript.length >= 5;
}

export function listDialogueScenarios() {
  return SCENARIOS.map(sanitizeScenario);
}

export function listDailyDialogueScenarios(inputDate = new Date()) {
  const total = SCENARIOS.length;
  const start = hashString(buildDateKey(inputDate)) % total;
  const indices = [start, (start + 17) % total, (start + 31) % total];
  return indices.map((index) => sanitizeScenario(SCENARIOS[index]));
}

export function getDialogueAvailability() {
  const missing = [];
  [
    ['DOUBAO_ASR_APP_ID', config.doubaoAsrAppId],
    ['DOUBAO_ASR_ACCESS_TOKEN', config.doubaoAsrAccessToken],
    ['ARK_API_KEY', config.arkApiKey],
    ['ARK_DOUBAO_FLASH_ENDPOINT_ID', config.arkDoubaoFlashEndpointId],
    ['DOUBAO_TTS_APP_ID', config.doubaoTtsAppId],
    ['DOUBAO_TTS_TOKEN', config.doubaoTtsToken],
    ['DOUBAO_TTS_CLUSTER', config.doubaoTtsCluster],
    ['DOUBAO_TTS_VOICE_TYPE', config.doubaoTtsVoiceType],
  ].forEach(([name, value]) => {
    if (!String(value || '').trim()) missing.push(name);
  });
  return { available: missing.length === 0, missing };
}

export function getCurrentLesson(session) {
  return session?.scenario?.lessons?.[session.lessonIndex] || null;
}

export function buildDialogueState(session) {
  const currentLesson = getCurrentLesson(session);
  return {
    lessonIndex: session.lessonIndex,
    totalLessons: session.scenario.lessons.length,
    passed: session.passed,
    skipped: session.skipped,
    retryCount: session.retryCount,
    isComplete: session.isComplete,
    currentLesson: currentLesson
      ? {
          id: currentLesson.id,
          label: currentLesson.label,
          stage: currentLesson.stage,
          target: currentLesson.target,
          targetKm: currentLesson.targetKm,
          focus: currentLesson.focus,
          focusKm: currentLesson.focusKm,
          prompt: currentLesson.prompt,
          promptKm: currentLesson.promptKm,
        }
      : null,
  };
}

export function buildDialogueSession({ scenarioId, learnerName, voiceType = '' }) {
  const availability = getDialogueAvailability();
  if (!availability.available) {
    throw badRequest('Dialogue configuration missing', 'DIALOGUE_CONFIG_MISSING');
  }

  const scenario = SCENARIO_MAP.get(scenarioId);
  if (!scenario) {
    throw badRequest('Unknown dialogue scenario', 'UNKNOWN_DIALOGUE_SCENARIO');
  }

  return {
    sessionId: randomUUID(),
    learnerName: learnerName || '学员',
    scenario,
    lessonIndex: 0,
    retryCount: 0,
    passed: 0,
    skipped: 0,
    isComplete: false,
    voiceType,
    startedAt: new Date().toISOString(),
  };
}

export function buildLessonIntroSpecs(session, { retrying = false } = {}) {
  const lessonItem = getCurrentLesson(session);
  if (!lessonItem) return [];

  if (lessonItem.mode === 'shadow') {
    return [{
      role: 'assistant',
      type: 'audio',
      text: retrying ? `再试一次：${lessonItem.target}` : lessonItem.target,
      khmerText: lessonItem.targetKm,
    }];
  }

  return [{
    role: 'assistant',
    type: 'audio',
    text: retrying ? `再说一次：${lessonItem.prompt}` : lessonItem.prompt,
    khmerText: lessonItem.promptKm,
  }];
}

export function buildStartSpecs(session) {
  return [
    { role: 'system', type: 'note', text: session.scenario.dailyTopic },
    {
      role: 'assistant',
      type: 'audio',
      text: `我们先练${session.scenario.title}。`,
      khmerText: `ថ្ងៃនេះយើងហាត់ប្រធានបទ${session.scenario.title}។`,
    },
    ...buildLessonIntroSpecs(session),
  ];
}

export function buildCompletionSpecs(session) {
  return [
    { role: 'system', type: 'note', text: `完成 · ${session.scenario.title}` },
    { role: 'assistant', type: 'audio', text: `今天的${session.scenario.title}练完了。你已经完成了这组练习，明天继续。`, khmerText: `មេរៀន${session.scenario.title}ថ្ងៃនេះបានបញ្ចប់ហើយ។ អ្នកបានបញ្ចប់ការហាត់នេះហើយ ថ្ងៃស្អែកបន្តទៀត។` },
  ];
}

export function applyTranscriptToSession(session, transcript) {
  const lessonItem = getCurrentLesson(session);
  if (!lessonItem) {
    session.isComplete = true;
    return {
      outcome: 'complete',
      lesson: null,
      state: buildDialogueState(session),
      evaluation: {
        passed: true,
        skipped: false,
        retryCount: session.retryCount,
        lessonIndex: session.lessonIndex,
        isComplete: session.isComplete,
      },
    };
  }

  const passed = passesLesson(lessonItem, transcript);
  let outcome = 'retry';

  if (passed) {
    session.passed += 1;
    session.lessonIndex += 1;
    session.retryCount = 0;
    session.isComplete = session.lessonIndex >= session.scenario.lessons.length;
    outcome = session.isComplete ? 'complete' : 'passed';
  } else {
    session.retryCount += 1;
    if (session.retryCount >= MAX_DIALOGUE_RETRIES) {
      session.skipped += 1;
      session.lessonIndex += 1;
      session.retryCount = 0;
      session.isComplete = session.lessonIndex >= session.scenario.lessons.length;
      outcome = 'skipped';
    }
  }

  return {
    outcome,
    lesson: lessonItem,
    state: buildDialogueState(session),
    evaluation: {
      passed: outcome === 'passed' || outcome === 'complete',
      skipped: outcome === 'skipped',
      retryCount: session.retryCount,
      lessonIndex: session.lessonIndex,
      isComplete: session.isComplete,
    },
  };
}
