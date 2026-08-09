'use client';

import { useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteMoodboardImage, uploadMoodboardImage } from '@/lib/moodboard';
import { useSettingsStore } from '@/stores/useSettingsStore';

export function MoodboardEditor() {
  const images = useSettingsStore((s) => s.settings.moodboardImages);
  const update = useSettingsStore((s) => s.update);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = Math.max(0, 3 - images.length);
    if (room === 0) {
      setError('Je kunt maximaal drie foto’s toevoegen.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded = [];
      for (const file of Array.from(files).slice(0, room)) {
        uploaded.push(await uploadMoodboardImage(file));
      }
      update({ moodboardImages: [...images, ...uploaded] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload mislukt');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(id: string, path: string) {
    setError(null);
    const prev = images;
    update({ moodboardImages: images.filter((img) => img.id !== id) });
    try {
      await deleteMoodboardImage(path);
    } catch (err) {
      update({ moodboardImages: prev });
      setError(err instanceof Error ? err.message : 'Verwijderen mislukt');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-muted">
        Maximaal drie foto&apos;s van je droomleven. Elke foto wordt een tegel op het dashboard.
      </p>

      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            <li key={img.id} className="group relative overflow-hidden rounded-[10px] bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => void remove(img.id, img.path)}
                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-pill bg-surface/90 text-red opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                aria-label="Foto verwijderen"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => void onFiles(e.target.files)}
      />

      <Button
        type="button"
        variant="secondary"
        disabled={busy || images.length >= 3}
        onClick={() => inputRef.current?.click()}
      >
        <Plus size={15} strokeWidth={1.75} />
        {busy ? 'Uploaden…' : images.length >= 3 ? 'Maximum bereikt' : 'Foto’s toevoegen'}
      </Button>

      {error && <p className="text-[12px] text-red">{error}</p>}
    </div>
  );
}
