import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { currentSession, newSession, saveSession } from '../src/lib/db.ts';

describe('session store', () => {
  it('saves and returns the latest session', async () => {
    expect(await currentSession()).toBeUndefined();
    const a = newSession('starfarers', 'lasers-feelings');
    await saveSession(a);
    const b = { ...newSession('the-heist', 'roll-for-shoes'), createdAt: new Date(Date.now() + 1000).toISOString() };
    await saveSession(b);
    const cur = await currentSession();
    expect(cur?.id).toBe(b.id);
    expect(cur?.toolHistory).toEqual([]);
  });
});
