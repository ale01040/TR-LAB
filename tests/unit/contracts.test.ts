import { expect, it } from 'vitest';
import { nutritionSchema, revisionSchema, templateSchema } from '@tr-lab/contracts';
import { copyProgram } from '@tr-lab/domain';
import { now, program } from '../helpers/fixtures';
it('revisioni bigint non perdono precisione e non accettano padding/overflow', () => {
  expect(revisionSchema.parse('9007199254740993')).toBe('9007199254740993');
  expect(revisionSchema.safeParse('01').success).toBe(false);
  expect(revisionSchema.safeParse('9223372036854775808').success).toBe(false);
});
it('copia standard preserva contenuti e cambia tutti gli ID, resta bozza', () => {
  const p = program();
  p.status = 'approved';
  const q = copyProgram(
    templateSchema.parse({
      format: 'workout-program',
      schema_version: 1,
      kind: 'program_template',
      program: p,
    }).program,
    () => crypto.randomUUID(),
    now,
  );
  expect(q.status).toBe('draft');
  expect(q.days[0]?.id).not.toBe(p.days[0]?.id);
  expect(q.days[0]?.exercises[0]?.targets[0]?.id).not.toBe(p.days[0]?.exercises[0]?.targets[0]?.id);
  expect(q.weeks).toEqual(p.weeks);
});
it('non corregge silenziosamente macro incoerenti', () => {
  const n = {
    id: crypto.randomUUID(),
    calories: 2000,
    protein: 150,
    fat: 60,
    carbs: 215,
    effectiveFrom: '2026-10-11',
    method: 'manual',
    confirmedAt: now,
  };
  expect(nutritionSchema.safeParse(n).success).toBe(true);
  expect(nutritionSchema.safeParse({ ...n, carbs: 500 }).success).toBe(false);
  expect(nutritionSchema.safeParse({ ...n, protein: -1 }).success).toBe(false);
});
