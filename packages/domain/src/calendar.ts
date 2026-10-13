import { z } from 'zod';
import {
  planCycleSchema,
  type Program,
  type ScheduledSession,
  type TrainingCycle,
} from '@tr-lab/contracts';
function civilDate(value: string): Date {
  z.iso.date().parse(value);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year!, month! - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}
export function addCalendarDays(value: string, days: number): string {
  if (!Number.isInteger(days) || Math.abs(days) > 20000)
    throw new Error('Intervallo calendario non valido.');
  const date = civilDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return z.iso.date().parse(date.toISOString().slice(0, 10));
}
export function calendarWeekday(value: string): number {
  return civilDate(value).getUTCDay();
}
export function planCalendar(input: {
  program: Program;
  startDate: string;
  timeZone: string;
  weekdays: readonly number[];
  fromWeek: number;
  weeks: number;
  nextId: () => string;
  now: string;
}): { cycle: TrainingCycle; occurrences: ScheduledSession[] } {
  const { program } = input;
  if (program.status !== 'approved') throw new Error('Approva la scheda prima di pianificarla.');
  const weekdays = [...new Set(input.weekdays)].sort((a, b) => a - b);
  if (
    !weekdays.length ||
    weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
    !Number.isInteger(input.fromWeek) ||
    input.fromWeek < 0 ||
    !Number.isInteger(input.weeks) ||
    input.weeks < 1 ||
    input.fromWeek + input.weeks > program.weeks.length
  )
    throw new Error('Intervallo o giorni non validi.');
  if (input.weeks * program.days.length > 100)
    throw new Error('Pianifica al massimo 100 sedute per intervallo.');
  const cycle: TrainingCycle = {
    id: input.nextId(),
    name: program.name,
    programId: program.id,
    startDate: input.startDate,
    timeZone: input.timeZone,
    status: 'active',
  };
  let date = input.startDate;
  const occurrences: ScheduledSession[] = [];
  // Aritmetica su una data civile, mai somma di ore al fuso locale; il DST non sposta i giorni.
  for (let week = input.fromWeek; week < input.fromWeek + input.weeks; week++)
    for (const day of program.days) {
      while (!weekdays.includes(calendarWeekday(date))) date = addCalendarDays(date, 1);
      occurrences.push({
        id: input.nextId(),
        cycleId: cycle.id,
        programId: program.id,
        dayId: day.id,
        weekIndex: week,
        date,
        timeZone: input.timeZone,
        status: 'planned',
        sessionId: null,
        createdAt: input.now,
      });
      date = addCalendarDays(date, 1);
    }
  planCycleSchema.parse({ id: cycle.id, cycle, occurrences });
  return { cycle, occurrences };
}
