/**
 * Creates a UUID for client-side records.
 *
 * `crypto.randomUUID()` is unavailable on HTTP origins and in some older
 * browsers. Record IDs only need to be unique within this local archive, so a
 * timestamp and random fallback keeps the app usable in those environments.
 */
export const createId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const timestamp = Date.now().toString(36);
  const randomPart = Array.from({ length: 20 }, () =>
    Math.floor(Math.random() * 36).toString(36),
  ).join('');

  return `${timestamp}-${randomPart}`;
};
