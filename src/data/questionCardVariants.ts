import { assetUrl } from '../utils/assetUrl';

export type QuestionCardVariant = 'pink' | 'green' | 'blue';

export type QuestionCardNumber = 1 | 2 | 3;

export interface QuestionCardConfig {
  number: QuestionCardNumber;
  variant: QuestionCardVariant;
  frameClassName: string;
  paperSrc: string;
  textureSrc: string;
  numberSrc: string;
  textureOpacity: number;
  defaultZIndex: number;
  uprightRotation: string;
}

const ASSET_ROOT = assetUrl('question-selection');

export const QUESTION_CARD_CONFIGS: readonly QuestionCardConfig[] = [
  {
    number: 1,
    variant: 'pink',
    frameClassName: 'qs-rack-card--one',
    paperSrc: `${ASSET_ROOT}/card-1-pink.webp`,
    textureSrc: `${ASSET_ROOT}/card-1-texture.webp`,
    numberSrc: `${ASSET_ROOT}/number-1.webp`,
    textureOpacity: 0.6,
    defaultZIndex: 50,
    uprightRotation: '-5deg',
  },
  {
    number: 2,
    variant: 'green',
    frameClassName: 'qs-rack-card--two',
    paperSrc: `${ASSET_ROOT}/card-2-green.webp`,
    textureSrc: `${ASSET_ROOT}/card-2-texture.webp`,
    numberSrc: `${ASSET_ROOT}/number-2.webp`,
    textureOpacity: 0.4,
    defaultZIndex: 30,
    uprightRotation: '3deg',
  },
  {
    number: 3,
    variant: 'blue',
    frameClassName: 'qs-rack-card--three',
    paperSrc: `${ASSET_ROOT}/card-3-blue.webp`,
    textureSrc: `${ASSET_ROOT}/card-3-texture.webp`,
    numberSrc: `${ASSET_ROOT}/number-3.webp`,
    textureOpacity: 0.4,
    defaultZIndex: 20,
    uprightRotation: '-6deg',
  },
];

export function isQuestionCardVariant(value: unknown): value is QuestionCardVariant {
  return value === 'pink' || value === 'green' || value === 'blue';
}

export function getQuestionCardVariantByIndex(
  index: number,
): QuestionCardVariant | null {
  return QUESTION_CARD_CONFIGS[index]?.variant ?? null;
}
