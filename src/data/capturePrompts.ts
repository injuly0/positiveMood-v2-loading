export interface CapturePromptGroup {
  id: string;
  themeLabel: string;
  questions: string[];
}

export interface CapturePromptSelection {
  groupId: string;
  themeLabel: string;
  question: string;
}

export const CAPTURE_PROMPT_GROUPS: CapturePromptGroup[] = [
  {
    id: 'concrete-life',
    themeLabel: '注意让自己感觉好的瞬间',
    questions: [
      '今天，哪一个瞬间让你感觉很好？',
      '今天，有什么小事比想象中更顺利？',
      '今天，哪一刻让你觉得生活也还不错？',
      '今天，有什么平常的东西重新被你看见？',
      '今天，哪一种声音、气味或光线值得记住？',
    ],
  },
  {
    id: 'more-like-myself',
    themeLabel: '发现更像自己的选择',
    questions: [
      '哪个选择，让你更像自己？',
      '今天，你在哪一刻没有辜负自己的感受？',
      '今天，你做了哪件自己真正愿意做的事？',
      '哪一刻，你觉得自己正成为想成为的人？',
      '今天的你，有哪一点值得未来的你认出来？',
    ],
  },
  {
    id: 'gratitude-for-life',
    themeLabel: '感激具体的人、事和生活',
    questions: [
      '今天，谁或什么轻轻托住了你？',
      '今天，有什么并非理所当然？',
      '哪一件小事，让你愿意感谢具体的生活？',
      '今天，有什么好意抵达了你？',
      '哪个寻常的瞬间，值得说一声谢谢？',
    ],
  },
  {
    id: 'evidence-of-living',
    themeLabel: '建立现在与未来自己的联系',
    questions: [
      '今天，有什么可以证明你真实地生活过？',
      '如果只能留下今天的一小部分，你会留下什么？',
      '今天的哪一刻，不应该就这样消失？',
      '未来的你，会想念今天的哪个普通瞬间？',
      '今天，你想为自己保存什么？',
    ],
  },
  {
    id: 'difficult-day',
    themeLabel: '积累关于自我力量的真实证据',
    questions: [
      '如果今天并不容易，你是怎样走到这里的？',
      '今天，有没有一刻让你稍微松了一口气？',
      '今天，你保护了自己的哪一种感受？',
      '哪怕很小，今天有什么没有被困难拿走？',
      '今天的你，还为自己保留了什么？',
    ],
  },
];

const pickRandomItem = <T,>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

export function pickCapturePrompt(excludedGroupId?: string): CapturePromptSelection {
  const availableGroups = excludedGroupId
    ? CAPTURE_PROMPT_GROUPS.filter((group) => group.id !== excludedGroupId)
    : CAPTURE_PROMPT_GROUPS;
  const group = pickRandomItem(availableGroups);

  return {
    groupId: group.id,
    themeLabel: group.themeLabel,
    question: pickRandomItem(group.questions),
  };
}
