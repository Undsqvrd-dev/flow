'use client';

import { useCallback, useRef } from 'react';
import type { Settings } from './types';

type AlarmSound = Settings['alarmSound'];

function playTone(ctx: AudioContext, opts: {
  freq: number; start: number; duration: number; type: OscillatorType; gain: number;
}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = opts.type;
  osc.frequency.value = opts.freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + opts.start);
  gain.gain.exponentialRampToValueAtTime(opts.gain, ctx.currentTime + opts.start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + opts.start + opts.duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + opts.start);
  osc.stop(ctx.currentTime + opts.start + opts.duration + 0.05);
}

/** Pomodoro-alarm via de Web Audio API — geen audio-assets nodig. */
export function useAlarm() {
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback((sound: AlarmSound) => {
    ctxRef.current ??= new AudioContext();
    const ctx = ctxRef.current;
    if (ctx.state === 'suspended') void ctx.resume();

    if (sound === 'piep') {
      [0, 0.25, 0.5].forEach((start) =>
        playTone(ctx, { freq: 880, start, duration: 0.15, type: 'square', gain: 0.12 }),
      );
    } else if (sound === 'bel') {
      playTone(ctx, { freq: 1318.5, start: 0, duration: 1.4, type: 'sine', gain: 0.22 });
      playTone(ctx, { freq: 1975.5, start: 0, duration: 1.0, type: 'sine', gain: 0.08 });
      playTone(ctx, { freq: 1318.5, start: 0.6, duration: 1.4, type: 'sine', gain: 0.16 });
    } else {
      // gong: laag, lange staart met boventonen
      playTone(ctx, { freq: 196, start: 0, duration: 3.2, type: 'sine', gain: 0.3 });
      playTone(ctx, { freq: 392, start: 0, duration: 2.4, type: 'sine', gain: 0.12 });
      playTone(ctx, { freq: 587, start: 0, duration: 1.6, type: 'triangle', gain: 0.05 });
    }
  }, []);

  const notify = useCallback((title: string, body: string) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      void Notification.requestPermission();
    }
  }, []);

  return { play, notify };
}
