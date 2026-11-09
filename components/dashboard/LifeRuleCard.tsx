'use client';

import { useEffect, useState } from 'react';
import { useGoalsStore } from '@/stores/useGoalsStore';

/** Eén willekeurige leefregel, stabiel zolang de lijst niet wijzigt. */
export function LifeRuleCard() {
  const rules = useGoalsStore((s) => s.lifeRules ?? []);
  const [ruleId, setRuleId] = useState<string | null>(null);

  useEffect(() => {
    if (rules.length === 0) return;
    if (ruleId && rules.some((rule) => rule.id === ruleId)) return;
    const pick = rules[Math.floor(Math.random() * rules.length)];
    setRuleId(pick?.id ?? null);
  }, [rules, ruleId]);

  const rule = rules.find((item) => item.id === ruleId);

  return (
    <div className="flex h-full flex-col rounded-panel border border-line bg-surface px-4 py-3 text-left shadow-soft-sm">
      <p className="text-[11px] font-semibold text-muted">Leefregel</p>
      <p className="mt-1.5 text-[15px] font-medium leading-snug text-txt">
        {rule?.text ?? 'Nog geen leefregel.'}
      </p>
    </div>
  );
}
