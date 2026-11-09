import type { LabelBundle } from '@/lib/labelBundle';

/** Vermijdt circulaire imports tussen settings- en board-store. */
let quickWinBundles: string[] = [];
let labelBundles: LabelBundle[] = [];

export function setQuickWinBundleCache(bundles: string[]): void {
  quickWinBundles = bundles;
}

export function getQuickWinBundleCache(): string[] {
  return quickWinBundles;
}

export function setLabelBundleCache(bundles: LabelBundle[]): void {
  labelBundles = bundles;
}

export function getLabelBundleCache(): LabelBundle[] {
  return labelBundles;
}
