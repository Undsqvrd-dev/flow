'use client';

import { AffirmationCard } from './AffirmationCard';
import { LifeRuleCard } from './LifeRuleCard';
import { MantraCard } from './MantraCard';

/** Mantra, één leefregel en affirmatie naast elkaar. */
export function QuoteAffirmationBlock() {
  return (
    <div className="grid items-stretch gap-3 sm:grid-cols-3">
      <MantraCard />
      <LifeRuleCard />
      <AffirmationCard />
    </div>
  );
}
