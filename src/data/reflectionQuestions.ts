import type { FrameworkId, QuestionItem } from '../store/useRecordStore';

export const FRAMEWORK_IDS: FrameworkId[] = [
  'framework1',
  'framework2',
  'framework3',
  'framework4',
  'framework5',
];

export interface FrameworkConfig {
  name: string;
  englishName: string;
  psychologicalGoal: string;
  questions: QuestionItem[];
}

export const FRAMEWORKS: Record<FrameworkId, FrameworkConfig> = {
  framework1: {
    name: '逆境重评与复原力',
    englishName: 'Resilience & Cognitive Reappraisal',
    psychologicalGoal: '不否认事情本身的辛苦，而是帮助用户重新看见自己在困难中的行动、选择、资源和应对能力。',
    questions: [
      { id: 'framework1-q01', text: '在处理 [这件事] 的过程中，对你来说真正最难的部分是什么？' },
      { id: 'framework1-q02', text: '有没有哪个瞬间，你真的很想算了？最后是什么让你又往前走了一点？' },
      { id: 'framework1-q03', text: '如果把整件事分成“越来越难”和“开始变好”两个阶段，中间的转折点发生了什么？你当时做了什么？' },
      { id: 'framework1-q04', text: '这件事里，有哪些部分其实不由你决定？又有哪些部分，是你确实做出了影响的？' },
      { id: 'framework1-q05', text: '如果暂时不把结果归因于运气，你做过的哪一个选择，对最后的结果影响最大？' },
      { id: 'framework1-q06', text: '回头看，当时的你靠着什么撑过来了——耐心、责任感、求助、幽默感，还是别的什么？' },
      { id: 'framework1-q07', text: '你不需要一定从这段辛苦里得到成长。但现在回头看，有没有什么东西是经历之前的你还不知道，而现在知道了？' },
      { id: 'framework1-q08', text: '这次你用了哪些办法是真的有效的？以后再次遇到类似的困难，你最想把哪一个办法带走？' },
      { id: 'framework1-q09', text: '如果不把 [这件事] 只叫作“一段很累的经历”，现在的你还会怎样描述它？' },
    ],
  },
  framework2: {
    name: '内在力量与优势确立',
    englishName: 'Strength Spotting & Agency',
    psychologicalGoal: '帮助用户从“事情做成了”，走向“我看见了自己是怎么把它做成的”，强化胜任感、主体性和对自身优势的识别。',
    questions: [
      { id: 'framework2-q01', text: '[这件事] 最后能够发生，有哪一部分是因为你的行动才发生的？' },
      { id: 'framework2-q02', text: '回头看，你当时做对了哪一个很小、却很关键的决定？' },
      { id: 'framework2-q03', text: '如果一定要感谢自己身上的一个特点，这一次你最想感谢自己的什么？' },
      { id: 'framework2-q04', text: '如果你的好朋友刚刚完成了和你一样的 [这件事]，你会真心夸他/她什么？\n\n如果把这句话送给自己呢？' },
      { id: 'framework2-q05', text: '如果有人说：“这只是运气好而已。”\n\n你会拿什么具体的细节告诉他：“不，这里面确实有一部分是我做到的。”' },
      { id: 'framework2-q06', text: '整个过程中，有没有哪个瞬间让你突然产生一种：“好像我真的可以处理这件事。”的感觉？\n\n当时发生了什么？' },
      { id: 'framework2-q07', text: '这次帮助你的这个能力，以前有没有在别的事情里出现过？\n\n你第一次意识到自己有这种能力，大概是什么时候？' },
      { id: 'framework2-q08', text: '别人只看到了最后的结果，但有哪些努力只有你自己知道？' },
      { id: 'framework2-q09', text: '如果今天证明了你身上确实存在一种力量，你接下来最想把它用在哪件事情上？' },
    ],
  },
  framework3: {
    name: '意义建构与价值对齐',
    englishName: 'Meaning-Making & Values Alignment',
    psychologicalGoal: '帮助用户从“这件事让我开心”，继续看到“它为什么对我重要”，从日常经验中识别自己的需要、价值观和想要的生活方式。',
    questions: [
      { id: 'framework3-q01', text: '一天里发生了那么多事情，为什么偏偏是 [这件事] 被你记了下来？\n\n它有什么不一样？' },
      { id: 'framework3-q02', text: '当 [这件事] 发生时，它好像满足了你心里的什么需要？\n\n是自由、安静、被理解、掌控、美、连接，还是别的什么？' },
      { id: 'framework3-q03', text: '假如没有任何人知道 [这件事] 发生过，它对你来说还会重要吗？\n\n为什么？' },
      { id: 'framework3-q04', text: '从你这么喜欢 [这件事] 这件事里，好像可以看出你其实很在乎什么？' },
      { id: 'framework3-q05', text: '在这个瞬间里，有没有哪一部分让你产生：“嗯，这样的生活挺像我的。”的感觉？' },
      { id: 'framework3-q06', text: '表面上看，[这件事] 可能只是一件很普通的小事。\n\n但对你来说，它真正特别在哪里？' },
      { id: 'framework3-q07', text: '如果生活里以后能多出现一点像 [这件事] 这样的时刻，你希望自己的生活会因此变成什么样？' },
      { id: 'framework3-q08', text: '假如五年后的你偶然想起今天，你希望他/她还能记得这个瞬间里的什么？' },
      { id: 'framework3-q09', text: '[这件事] 好像提醒了你一种自己珍惜的东西。\n\n接下来有没有一件很小的事情，可以让这种东西在你的生活里多一点？' },
    ],
  },
  framework4: {
    name: '感恩与联结',
    englishName: 'Gratitude & Relational Connection',
    psychologicalGoal: '帮助用户意识到积极体验并不完全来自个人努力，也来自人与人之间的支持、环境的馈赠和世界中那些容易被忽略的善意。',
    questions: [
      { id: 'framework4-q01', text: '在 [这件事] 能够发生的背后，有没有一个人其实默默做了些什么？' },
      { id: 'framework4-q02', text: '如果你想感谢这个人，你真正想感谢的不是“他/她很好”，而是哪一个具体的动作或细节？' },
      { id: 'framework4-q03', text: '如果当时没有那个人、那句话或那个帮助，这一刻可能会有什么不同？' },
      { id: 'framework4-q04', text: '当别人对你好时，你通常更习惯马上回报，还是能够安心地接受？\n\n这一次呢？' },
      { id: 'framework4-q05', text: '这次经历里，有没有哪一个细节让你觉得：“原来有人注意到了我。”\n\n或者：“原来我不是一个人在处理这些。”' },
      { id: 'framework4-q06', text: '经过 [这件事]，你有没有对某个人产生一点和以前不同的认识？' },
      { id: 'framework4-q07', text: '除了最明显的那个人之外，这件好事背后还有没有一些平时很少被注意到的支撑？\n\n可能是一个人、一种环境、一项服务，甚至只是天气刚刚好。' },
      { id: 'framework4-q08', text: '如果你不用把感谢说得漂亮，只需要非常具体地说一句话，你最想对谁说什么？' },
      { id: 'framework4-q09', text: '这份善意不需要偿还。\n\n但如果有一天它自然地从你这里继续流向另一个人，你希望它会以什么方式发生？' },
    ],
  },
  framework5: {
    name: '纯粹品味与心流延展',
    englishName: 'Savoring & Positive Emotion',
    psychologicalGoal: '不急着解释、分析或者总结快乐，而是帮助用户重新进入积极体验，让注意力停留得更久、更具体。',
    questions: [
      { id: 'framework5-q01', text: '如果要把 [这件事] 发生的那个瞬间拍成一张照片，你最想让照片里留下什么？' },
      { id: 'framework5-q02', text: '现在重新回到那个瞬间。\n\n你最先想起来的是一种颜色、声音、气味、触感，还是某个很小的画面？' },
      { id: 'framework5-q03', text: '当时你第一次意识到：“我现在真的挺开心的。”身体是什么感觉？\n\n是肩膀松了、嘴角起来了、呼吸变慢了，还是别的什么？' },
      { id: 'framework5-q04', text: '如果可以把那个瞬间放慢十秒钟，你最想停在哪一秒？\n\n那一秒发生了什么？' },
      { id: 'framework5-q05', text: '你还记得自己的心情是从哪个小小的细节开始变好的吗？' },
      { id: 'framework5-q06', text: '如果不用急着去做下一件事，你最舍不得 [这件事] 里的哪一种感觉消失？' },
      { id: 'framework5-q07', text: '如果现在重新经历一次，你觉得自己会注意到什么第一次没有注意到的东西？' },
      { id: 'framework5-q08', text: '如果现在可以把这个瞬间原封不动地分享给一个人，你最想让谁也感受一下？\n\n你希望他/她看到其中的什么？' },
      { id: 'framework5-q09', text: '如果想给今天的这个瞬间留下一枚小小的“书签”，让未来的自己一看到它就能想起来，你会选择什么？\n\n可以是一句话、一首歌、一个物品、一种味道，或者一个画面。' },
    ],
  },
};

export interface QuestionDrawResult {
  questions: QuestionItem[];
  seenQuestionIds: string[];
  cycleReset: boolean;
}

export interface FrameworkDrawResult {
  frameworkId: FrameworkId;
  seenFrameworkIds: FrameworkId[];
  cycleReset: boolean;
}

export function isFrameworkId(value: string): value is FrameworkId {
  return FRAMEWORK_IDS.includes(value as FrameworkId);
}

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export function drawQuestionSet(
  frameworkId: FrameworkId,
  seenQuestionIds: readonly string[] = [],
  currentQuestionIds: readonly string[] = [],
  count = 3,
): QuestionDrawResult {
  const bank = FRAMEWORKS[frameworkId].questions;
  const bankIds = new Set(bank.map((question) => question.id));
  const normalizedSeen = unique(seenQuestionIds.filter((id) => bankIds.has(id)));
  const unseen = bank.filter((question) => !normalizedSeen.includes(question.id));
  const cycleReset = unseen.length < count;
  const recentIds = currentQuestionIds.length > 0
    ? currentQuestionIds
    : normalizedSeen.slice(-count);
  const recentIdSet = new Set(recentIds);
  let pool = cycleReset
    ? bank.filter((question) => !recentIdSet.has(question.id))
    : unseen;

  if (pool.length < count) {
    const poolIds = new Set(pool.map((question) => question.id));
    pool = [
      ...pool,
      ...bank.filter((question) => !poolIds.has(question.id)),
    ];
  }

  const questions = shuffled(pool)
    .slice(0, Math.min(count, bank.length))
    .map((question) => ({
      ...question,
      text: question.text.replaceAll('[这件事]', '这件事'),
    }));
  const selectedIds = questions.map((question) => question.id);

  return {
    questions,
    seenQuestionIds: cycleReset
      ? selectedIds
      : unique([...normalizedSeen, ...selectedIds]),
    cycleReset,
  };
}

export function pickRandomFrameworkId(): FrameworkId {
  return FRAMEWORK_IDS[Math.floor(Math.random() * FRAMEWORK_IDS.length)];
}

export function pickNextFrameworkId(
  currentFrameworkId: FrameworkId,
  seenFrameworkIds: readonly FrameworkId[],
): FrameworkDrawResult {
  const normalizedSeen = unique(seenFrameworkIds.filter(isFrameworkId));
  let pool = FRAMEWORK_IDS.filter((frameworkId) => (
    frameworkId !== currentFrameworkId
    && !normalizedSeen.includes(frameworkId)
  ));
  const cycleReset = pool.length === 0;
  const cycleSeen = cycleReset ? [currentFrameworkId] : normalizedSeen;

  if (cycleReset) {
    pool = FRAMEWORK_IDS.filter((frameworkId) => frameworkId !== currentFrameworkId);
  }

  const frameworkId = pool[Math.floor(Math.random() * pool.length)];
  return {
    frameworkId,
    seenFrameworkIds: unique([...cycleSeen, frameworkId]),
    cycleReset,
  };
}
