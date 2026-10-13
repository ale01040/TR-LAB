import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { addCalendarDays, calendarWeekday, planCalendar } from '@tr-lab/domain';
import { program, now } from '../helpers/fixtures';
it('conserva i giorni civili durante entrambi i cambi d’ora e gli anni bisestili', () => {
  expect(addCalendarDays('2026-03-28', 1)).toBe('2026-03-29');
  expect(addCalendarDays('2026-03-29', 1)).toBe('2026-03-30');
  expect(addCalendarDays('2026-10-25', 1)).toBe('2026-10-26');
  expect(addCalendarDays('2028-02-28', 1)).toBe('2028-02-29');
  expect(addCalendarDays('0099-12-31', 1)).toBe('0100-01-01');
  expect(() => addCalendarDays('2026-02-30', 1)).toThrow();
});
it('segue i giorni disponibili senza confondere settimana del ciclo e settimana ISO', () => {
  const p = program();
  p.status = 'approved';
  p.days = [p.days[0]!, { ...p.days[0]!, id: randomUUID(), name: 'B' }];
  p.weeks = [p.weeks[0]!, { ...p.weeks[0]!, name: 'Seconda' }];
  const value = planCalendar({
    program: p,
    startDate: '2026-10-24',
    timeZone: 'Europe/Rome',
    weekdays: [1],
    fromWeek: 0,
    weeks: 2,
    nextId: randomUUID,
    now,
  });
  expect(value.occurrences.map((o) => o.date)).toEqual([
    '2026-10-26',
    '2026-11-02',
    '2026-11-09',
    '2026-11-16',
  ]);
  expect(value.occurrences.map((o) => o.weekIndex)).toEqual([0, 0, 1, 1]);
  expect(value.occurrences.every((o) => calendarWeekday(o.date) === 1)).toBe(true);
  expect(p.weeks).toHaveLength(2);
});
it('rifiuta bozze, giorni vuoti, intervalli oltre il ciclo e batch oltre 100', () => {
  const p = program();
  const input = {
    program: p,
    startDate: '2026-10-13',
    timeZone: 'Europe/Rome',
    weekdays: [1],
    fromWeek: 0,
    weeks: 1,
    nextId: randomUUID,
    now,
  };
  expect(() => planCalendar(input)).toThrow();
  p.status = 'approved';
  expect(() => planCalendar({ ...input, weekdays: [] })).toThrow();
  expect(() => planCalendar({ ...input, weeks: 53 })).toThrow();
  p.weeks = Array.from({ length: 52 }, () => p.weeks[0]!);
  p.days = Array.from({ length: 3 }, (_, i) => ({
    ...p.days[0]!,
    id: randomUUID(),
    name: String(i),
  }));
  expect(() => planCalendar({ ...input, weeks: 34 })).toThrow('100');
});
