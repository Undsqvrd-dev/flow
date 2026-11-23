'use client';

import { create } from 'zustand';

export interface CalendarEvent {
  id: string;
  googleEventId: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  eventDate: string;
  endDate: string;
  location: string | null;
  meetLink: string | null;
  htmlLink: string | null;
  status: string;
  done: boolean;
  updatedAt: string;
}

interface CalendarState {
  ready: boolean;
  unavailable: boolean;
  events: CalendarEvent[];
}

export const useCalendarStore = create<CalendarState>()(() => ({
  ready: false,
  unavailable: false,
  events: [],
}));
