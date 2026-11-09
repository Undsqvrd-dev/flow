'use client';

import { PrincipleColumn } from './PrincipleColumn';
import { useGoalsStore } from '@/stores/useGoalsStore';

export function ValuesPage() {
  const values = useGoalsStore((s) => s.values);
  const lifeRules = useGoalsStore((s) => s.lifeRules);
  const addValue = useGoalsStore((s) => s.addValue);
  const updateValue = useGoalsStore((s) => s.updateValue);
  const removeValue = useGoalsStore((s) => s.removeValue);
  const addLifeRule = useGoalsStore((s) => s.addLifeRule);
  const updateLifeRule = useGoalsStore((s) => s.updateLifeRule);
  const removeLifeRule = useGoalsStore((s) => s.removeLifeRule);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <div className="grid items-start gap-8 md:grid-cols-2">
        <PrincipleColumn
          title="Waarden"
          hint="Wat voor jou telt."
          items={values}
          addLabel="Waarde toevoegen"
          placeholder="Bijvoorbeeld: eerlijkheid"
          emptyLabel="Nog geen waarden."
          onAdd={addValue}
          onUpdate={updateValue}
          onRemove={removeValue}
        />
        <PrincipleColumn
          title="Leefregels"
          hint="Hoe je wilt leven."
          items={lifeRules ?? []}
          addLabel="Leefregel toevoegen"
          placeholder="Bijvoorbeeld: ik kies werk dat bij me past"
          emptyLabel="Nog geen leefregels."
          onAdd={addLifeRule}
          onUpdate={updateLifeRule}
          onRemove={removeLifeRule}
        />
      </div>
    </div>
  );
}
