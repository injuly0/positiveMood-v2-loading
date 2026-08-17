import {
  pickRandomFrameworkId,
  type FrameworkDrawResult,
} from '../data/reflectionQuestions';

export interface LlmFrameworkResult {
  frameworkId: string;
}

/**
 * 本地开发阶段的 Qwen 适配边界。
 * 真实接入时只替换函数内部实现，并保持仅返回 frameworkId 的契约。
 */
export async function fetchFrameworkFromLLM(text: string): Promise<LlmFrameworkResult> {
  void text;
  await new Promise((resolve) => setTimeout(resolve, 1800));
  return { frameworkId: pickRandomFrameworkId() };
}

export function getFallbackFramework(): FrameworkDrawResult & { isFallback: true } {
  const frameworkId = pickRandomFrameworkId();
  return {
    frameworkId,
    seenFrameworkIds: [frameworkId],
    cycleReset: false,
    isFallback: true,
  };
}
