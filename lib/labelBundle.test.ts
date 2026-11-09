import { describe, expect, it } from 'vitest';
import {
  blocksForTasks,
  bundleDropId,
  bundlePair,
  detachTask,
  joinBundle,
  planDrop,
  ritualBundleId,
  sharedLabelId,
  tint,
  withRitualPair,
} from '@/lib/labelBundle';

const persoonlijk = 'lbl-persoonlijk';

describe('labelbundels', () => {
  it('herkent het gedeelde label', () => {
    expect(sharedLabelId(['lbl-werk', persoonlijk], [persoonlijk])).toBe(persoonlijk);
    expect(sharedLabelId(['lbl-werk'], [persoonlijk])).toBeNull();
  });

  it('bundelt twee kaarten en laat de rest van de oude groep staan', () => {
    const start = bundlePair([], persoonlijk, 'sport', 'mediteren', ritualBundleId('2026-11-09'));
    const next = bundlePair(start, persoonlijk, 'sport', 'boodschappen', 'lbl-2');
    expect(next.find((bundle) => bundle.id === 'lbl-2')?.taskIds).toEqual(['boodschappen', 'sport']);
    expect(next.find((bundle) => bundle.id === ritualBundleId('2026-11-09'))?.taskIds).toEqual(['mediteren']);
  });

  it('maakt de rituele groep één keer', () => {
    const once = withRitualPair([], '2026-11-09', persoonlijk, 'mediteren', 'sport');
    const twice = withRitualPair(once, '2026-11-09', persoonlijk, 'mediteren', 'sport');
    expect(twice).toBe(once);
    const split = detachTask(once, 'sport');
    expect(withRitualPair(split, '2026-11-09', persoonlijk, 'mediteren', 'sport')).toBe(split);
  });

  it('toont een kleurblok om de leden, ook als er een andere kaart tussen stond', () => {
    const bundles = bundlePair([], persoonlijk, 'sport', 'mediteren', 'b1');
    const blocks = blocksForTasks(
      [
        { id: 'mediteren', title: 'Mediteren' },
        { id: 'mail', title: 'Mail' },
        { id: 'sport', title: 'Sport' },
      ],
      bundles,
    );
    expect(blocks.map((block) => (block.kind === 'bundle' ? block.tasks.map((task) => task.id) : block.task.id))).toEqual([
      ['mediteren', 'sport'],
      'mail',
    ]);
  });

  it('plant een bundel bij hetzelfde label en haalt een kaart eruit bij een gewone verplaatsing', () => {
    const bundles = bundlePair([], persoonlijk, 'sport', 'mediteren', 'b1');
    expect(planDrop('sport', [persoonlijk], 'boodschappen', [{ id: 'boodschappen', labels: [persoonlijk] }], bundles)).toEqual({
      type: 'bundle',
      labelId: persoonlijk,
    });
    expect(planDrop('sport', [persoonlijk], 'mail', [{ id: 'mail', labels: [] }], bundles)).toEqual({
      type: 'move',
      detach: true,
    });
    expect(planDrop('sport', [persoonlijk], 'mediteren', [{ id: 'mediteren', labels: [persoonlijk] }], bundles)).toEqual({
      type: 'bundle',
      labelId: persoonlijk,
    });
  });

  it('neemt een kaart zonder dat label op in een bestaand blok', () => {
    const bundles = bundlePair([], persoonlijk, 'sport', 'mediteren', 'b1');
    expect(planDrop('mail', [], 'mediteren', [{ id: 'mediteren', labels: [persoonlijk] }], bundles)).toEqual({
      type: 'join',
      bundleId: 'b1',
      labelId: persoonlijk,
    });
    expect(planDrop('mail', [], bundleDropId('b1'), [], bundles)).toEqual({
      type: 'join',
      bundleId: 'b1',
      labelId: persoonlijk,
    });
    const joined = joinBundle(bundles, 'b1', 'mail');
    expect(joined.find((bundle) => bundle.id === 'b1')?.taskIds).toEqual(['mediteren', 'sport', 'mail']);
  });

  it('maakt een doorzichtige tint van de labelkleur', () => {
    expect(tint('#7C3AED', 0.16)).toBe('rgba(124, 58, 237, 0.16)');
  });
});
