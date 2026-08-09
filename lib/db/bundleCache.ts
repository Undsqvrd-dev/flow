/** Vermijdt circulaire imports tussen settings- en board-store. */
let quickWinBundles: string[] = [];

export function setQuickWinBundleCache(bundles: string[]): void {
  quickWinBundles = bundles;
}

export function getQuickWinBundleCache(): string[] {
  return quickWinBundles;
}
