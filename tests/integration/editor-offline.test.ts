import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import type { Program } from '@tr-lab/contracts';
import { copyDay, resolveDay, targetSides } from '@tr-lab/domain';
import { LocalDatabase, records, saveLocally } from '../../apps/web/src/data/database';
import { program, session } from '../helpers/fixtures';

it('serie differenziate e copia persistono dopo riapertura; nuova versione non cambia lo snapshot precedente', async () => {
  const name = crypto.randomUUID();
  let db = new LocalDatabase(name);
  try {
    const p = program();
    const first = p.days[0]!.exercises[0]!;
    first.exercise.unilateral = true;
    first.accumulation = false;
    first.targets[0] = { ...first.targets[0]!, side: 'left', rir: 0, loadGrams: null };
    first.targets[1] = { ...first.targets[1]!, side: 'right', rir: 1, loadGrams: 12500 };
    first.targets.push({
      ...first.targets[0]!,
      id: crypto.randomUUID(),
      kind: 'warmup',
      side: 'both',
    });
    p.days = [...p.days, copyDay(p.days[0]!, () => crypto.randomUUID())];
    await saveLocally(
      'device',
      'SaveProgramDraft',
      { id: p.id, kind: 'program', revision: '0', data: p },
      [],
      db,
    );
    db.close();
    db = new LocalDatabase(name);
    const loaded = (await records('device', db)).find((r) => r.kind === 'program');
    expect(loaded?.data).toEqual(p);
    await saveLocally(
      'device',
      'ApproveProgram',
      { id: p.id, kind: 'program', revision: '1', data: { ...p, status: 'approved' } },
      [],
      db,
    );
    const approved: Program = { ...p, status: 'approved' };
    const oldSession = session(approved);
    await saveLocally(
      'device',
      'StartWorkout',
      { id: oldSession.id, kind: 'session', revision: '0', data: oldSession },
      [],
      db,
    );
    const before = structuredClone(oldSession.snapshot);
    const next = { ...p, id: crypto.randomUUID(), version: '2', name: 'Nuova versione' };
    next.days = structuredClone(p.days);
    next.days[0]!.exercises[0]!.targets[0]!.loadGrams = 20000;
    await saveLocally(
      'device',
      'SaveProgramDraft',
      { id: next.id, kind: 'program', revision: '0', data: next },
      [],
      db,
    );
    const previous = (await records('device', db)).find((r) => r.kind === 'session');
    expect(previous?.data).toHaveProperty('snapshot', before);
    const snapshot = resolveDay(approved, approved.days[0]!, 0).exercises[0]!;
    expect(snapshot.targets[0]!.kind).toBe('warmup');
    expect(
      targetSides(
        snapshot,
        snapshot.targets.find((t) => t.side === 'right')!,
      ),
    ).toEqual(['right']);
    expect(await db.outbox.count()).toBe(0);
    expect(await records('other-account', db)).toEqual([]);
  } finally {
    await db.delete();
  }
});
