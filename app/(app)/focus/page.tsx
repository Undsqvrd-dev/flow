import { PomodoroTimer } from '@/components/focus/PomodoroTimer';
import { FocusTaskPicker, LinkedTaskChecklist } from '@/components/focus/FocusTaskPicker';

export default function FocusPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 px-4 py-10">
      <PomodoroTimer />
      <FocusTaskPicker />
      <LinkedTaskChecklist />
    </div>
  );
}
