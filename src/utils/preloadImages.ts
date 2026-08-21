const pendingImages = new Map<string, Promise<void>>();

/**
 * Starts loading a set of images before the destination route is mounted.
 * A failed optional visual should not prevent navigation, so load errors settle
 * the promise just like successful loads do.
 */
export function preloadImages(sources: readonly string[]): Promise<void> {
  return Promise.all(sources.map((source) => {
    const existing = pendingImages.get(source);
    if (existing) return existing;

    const promise = new Promise<void>((resolve) => {
      const image = new Image();
      const settle = () => {
        image.onload = null;
        image.onerror = null;
        resolve();
      };

      image.onload = settle;
      image.onerror = settle;
      image.decoding = 'async';
      image.src = source;

      if (image.complete) settle();
    });

    pendingImages.set(source, promise);
    return promise;
  })).then(() => undefined);
}
