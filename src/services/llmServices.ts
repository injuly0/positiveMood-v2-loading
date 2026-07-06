export const fetchQuestionFromLLM = async (text: string) => {
  // 模拟网络延迟 1.5 秒
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 简单的 Mock 逻辑
  return {
    framework: '逆境重评与复原力 (Resilience & Overcoming)',
    questions: [
      "为了达成这件事，你支付了极大的精力成本。现在回头看，在这个过程中你‘赚’到了什么以前没有的经验或力量？",
      "在处理这件事的过程中，哪一个瞬间你最想放弃，但最后是什么微小的念头让你咬牙挺过来了？"
    ]
  };
};
