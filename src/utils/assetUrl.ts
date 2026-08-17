export const APP_BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
