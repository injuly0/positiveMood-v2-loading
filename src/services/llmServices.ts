import type { QuestionItem } from '../store/useRecordStore';

// ============================================================
// 五个心理学框架及其默认问题集
// ============================================================

interface FrameworkDef {
  name: string;
  questions: string[];
}

const FRAMEWORKS: Record<string, FrameworkDef> = {
  resilience: {
    name: '逆境重评与复原力 (Resilience & Overcoming)',
    questions: [
      "为了达成这件事，你支付了极大的精力成本。现在回头看，在这个过程中你'赚'到了什么以前没有的经验或力量？",
      "在处理这件事的过程中，哪一个瞬间你最想放弃，但最后是什么微小的念头让你咬牙挺过来了？",
      "搞定这件事绝不仅仅是运气好。如果必须归功于你自身的一个特质，你觉得是什么在起作用？",
    ],
  },
  strength: {
    name: '内在力量与优势确立 (Strength Spotting)',
    questions: [
      '如果用一个词来命名你今天在这件事中展现出来的超能力，你会叫它什么？',
      '如果你的好朋友做到了这件事，你会怎么真诚地夸奖他/她？现在，请把这句话送给自己。',
      '在做这件事的时候，你做对了哪一个极其关键、但别人可能注意不到的决定？',
    ],
  },
  meaning: {
    name: '意义建构与价值对齐 (Meaning-Making)',
    questions: [
      '抛开外界的眼光，这件事发生时，它恰好满足了你内心深处的哪一种渴望？',
      '如果五年后的你回看今天这件事的这个瞬间，你觉得它在你的人生拼图里代表着哪一种颜色或哪一块？',
      "在看似寻常的一天里，这件事是如何让你感觉到'我还活着，而且活得还不错'的？",
    ],
  },
  gratitude: {
    name: '感恩与联结 (Gratitude & Relational)',
    questions: [
      '在这件事背后，这个世界（或者某个具体的人）为你提供了怎样隐秘而温柔的支撑？',
      '面对这份来自外界的馈赠，你身体的哪个部分感觉到了最直接的放松或温暖？',
      '这份美好如果可以分享给一个人，你脑海中第一个浮现的是谁？为什么？',
    ],
  },
  savoring: {
    name: '纯粹品味与心流延展 (Savoring)',
    questions: [
      '如果要把这件事发生的瞬间拍成一张照片，你觉得画面里最亮眼的地方是什么？',
      '这个瞬间让你的身体产生了怎样的感觉？试着用三个身体感受的词语来描述它。',
      '如果这种感觉是一种颜色、一种声音或一种气味，它会是什么？',
    ],
  },
};

// ============================================================
// 工具函数
// ============================================================

function pickRandomFramework(): { key: string; def: FrameworkDef } {
  const keys = Object.keys(FRAMEWORKS);
  const key = keys[Math.floor(Math.random() * keys.length)];
  return { key, def: FRAMEWORKS[key] };
}

function buildResult(key: string, def: FrameworkDef): {
  framework: string;
  questions: QuestionItem[];
} {
  return {
    framework: def.name,
    questions: def.questions.map((text, i) => ({
      id: `${key}-${i}`,
      text,
    })),
  };
}

// ============================================================
// 对外 API
// ============================================================

/** 模拟调用 LLM：随机返回一个框架的问题集 */
export async function fetchQuestionFromLLM(
  _text: string,
): Promise<{ framework: string; questions: QuestionItem[] }> {
  // 模拟网络延迟，保证"思考中"的仪式感（最低 1.8s）
  await new Promise((resolve) => setTimeout(resolve, 1800));

  const { key, def } = pickRandomFramework();
  return buildResult(key, def);
}

/** AI 调用失败时的降级方案：随机返回默认问题集 */
export function getFallbackQuestions(): {
  framework: string;
  questions: QuestionItem[];
  isFallback: true;
} {
  const { key, def } = pickRandomFramework();
  return { ...buildResult(key, def), isFallback: true };
}
