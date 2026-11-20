'use client';

import { create } from 'zustand';
import type { RecurringTask } from '@/lib/recurring';

export type RecurringStatus = 'idle' | 'ready' | 'unavailable';

interface RecurringState {
  status: RecurringStatus;
  items: RecurringTask[];
}

export const useRecurringStore = create<RecurringState>()(() => ({
  status: 'idle',
  items: [],
}));
