// @vitest-environment jsdom
// Style regression suite. Each scenario renders a screen and compares the resolved styles of every element
// with a committed baseline in tests/__snapshots__/styles/. Moving CSS between app.css and components
// must leave every baseline unchanged; an intended visual change shows up as a reviewable diff.
// Update with `npx vitest run tests/styles.test.ts -u`.
import 'fake-indexeddb/auto';
import '../src/app.css';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lists, packs } from '../src/lib/content/index.ts';
import { db, newSession } from '../src/lib/db.ts';
import { app, initSession } from '../src/lib/session.svelte.ts';
import { charCtx, ensureSetup, startPlay } from '../src/lib/setup.ts';
import { mulberry32, type Rng } from '../src/lib/engine/rng.ts';
import { play, resetPlay, setGm, setPlayRng } from '../src/lib/play.svelte.ts';
import { mediaInventory, styleSnapshot } from './helpers/styles.ts';
import App from '../src/App.svelte';
import Welcome from '../src/routes/Welcome.svelte';
import About from '../src/routes/About.svelte';
import Tools from '../src/routes/Tools.svelte';
import ToolPage from '../src/routes/ToolPage.svelte';
import History from '../src/routes/History.svelte';
import ManageTools from '../src/routes/ManageTools.svelte';
import ManageList from '../src/routes/ManageList.svelte';
import PackDetails from '../src/routes/PackDetails.svelte';
import Setup from '../src/routes/track/Setup.svelte';
import Setting from '../src/routes/track/Setting.svelte';
import Story from '../src/routes/track/Story.svelte';
import Players from '../src/routes/track/Players.svelte';
import Play from '../src/routes/track/Play.svelte';
import CharPage from '../src/routes/track/CharPage.svelte';
import AddEntrySheet from '../src/components/AddEntrySheet.svelte';
import ImportSheet from '../src/components/ImportSheet.svelte';

type Rules = 'lasers-feelings' | 'roll-for-shoes' | 'kintsugi';

const dice = (...faces: number[]): Rng => {
  let i = 0;
  return { next: () => (faces[i++ % faces.length]! - 1 + 0.5) / 6 };
};
const click = (el: HTMLElement) => fireEvent.click(el);
const settle = async () => {
  await tick();
  await new Promise(r => setTimeout(r, 10));
};
const snap = async (name: string) => {
  await settle();
  await expect(styleSnapshot()).toMatchFileSnapshot(`./__snapshots__/styles/${name}.txt`);
};

async function begin(packId: string, rulesId: Rules, players = 1, started = true) {
  await db.sessions.clear();
  app.session = undefined;
  await initSession();
  const s = app.session!;
  Object.assign(s, newSession(packId, rulesId), { id: s.id, createdAt: s.createdAt });
  s.players = players;
  ensureSetup(s, charCtx(s, packs[packId]!, mulberry32(1)));
  if (started) startPlay(s, 'test');
  s.characters.forEach((c, i) => (c.fields.name = ['Ada', 'Bo', 'Cy', 'Di'][i]!));
}

beforeEach(() => {
  const r = mulberry32(7);
  vi.spyOn(Math, 'random').mockImplementation(() => r.next());
  resetPlay();
  play.mode = 'sheet';
  localStorage.clear();
  location.hash = '';
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('app shell', () => {
  it('fresh session: call-to-action chip, tabs', async () => {
    await begin('starfarers', 'lasers-feelings', 1, false);
    render(App);
    await snap('shell-fresh');
  });

  it('in play: header chip, menu sheet, data sub-menu', async () => {
    await begin('starfarers', 'lasers-feelings');
    render(App);
    await snap('shell-playing');
    await click(screen.getByRole('button', { name: 'Menu' }));
    await snap('shell-menu');
    await click(screen.getByRole('button', { name: /^New session/ }));
    await snap('shell-menu-armed');
    await click(screen.getByRole('button', { name: /^Data/ }));
    await snap('shell-menu-data');
  });

  it('welcome and about', async () => {
    await begin('starfarers', 'lasers-feelings');
    render(Welcome);
    await snap('welcome');
    cleanup();
    render(About);
    await snap('about');
  });
});

describe('tools', () => {
  beforeEach(async () => {
    await begin('starfarers', 'lasers-feelings');
  });

  it('tools list', async () => {
    render(Tools);
    await snap('tools-list');
  });

  it.each(['dice', 'names', 'items', 'emotions', 'complication', 'tilt', 'emoji'])('tool page: %s', async id => {
    render(ToolPage, { toolId: id });
    await snap(`tool-${id}`);
  });

  it('starting-letter sheet', async () => {
    render(ToolPage, { toolId: 'names' });
    await settle();
    await click(screen.getByRole('button', { name: /^Starting letter/ }));
    await snap('tool-letters');
  });

  it('pack generator', async () => {
    const gen = packs['starfarers']!.generators![0]!;
    render(ToolPage, { toolId: `pack:${gen.id}` });
    await snap('tool-pack-generator');
  });

  it('unknown tool', async () => {
    render(ToolPage, { toolId: 'nope' });
    await snap('tool-unknown');
  });

  it('history with entries, and empty', async () => {
    const t = new Date().toISOString();
    app.session!.toolHistory = [{ t, tool: 'items', label: 'Items', text: 'a lantern' }];
    app.session!.trackHistory = [{ t, kind: 'roll', char: 'Ada', text: 'Lasers 2d6 under 3: 1 success' }];
    render(History, { which: 'tools' });
    await snap('history-tools');
    cleanup();
    render(History, { which: 'track' });
    await snap('history-track');
    cleanup();
    app.session!.toolHistory = [];
    render(History, { which: 'tools' });
    await snap('history-empty');
  });
});

describe('manage', () => {
  beforeEach(async () => {
    await begin('starfarers', 'lasers-feelings');
  });

  it('manage tools, list, add and import sheets', async () => {
    render(ManageTools);
    await snap('manage-tools');
    cleanup();
    render(ManageList, { listId: 'tilts' });
    await snap('manage-list');
    await click(screen.getByRole('button', { name: 'Add entry' }));
    await snap('manage-add-sheet');
    cleanup();
    render(ManageList, { listId: 'tilts' });
    await click(screen.getByRole('button', { name: 'Import file or text' }));
    await snap('manage-import-sheet');
    cleanup();
    render(ManageList, { listId: 'nope' });
    await snap('manage-list-unknown');
  });

  it('sheets rendered on their own, with and without tag modifiers', async () => {
    render(AddEntrySheet, { list: lists.tilts!, onclose: vi.fn() });
    await snap('add-sheet-tags');
    cleanup();
    render(ImportSheet, { list: lists.tilts!, onclose: vi.fn() });
    const area = screen.getByLabelText('Paste text') as HTMLTextAreaElement;
    await fireEvent.input(area, { target: { value: 'one\ntwo\n' } });
    await snap('import-sheet-preview');
  });

  it('packs list and detail', async () => {
    render(PackDetails, {});
    await snap('packs-list');
    cleanup();
    render(PackDetails, { packId: 'starfarers' });
    await snap('packs-detail');
  });
});

describe('setup wizard', () => {
  beforeEach(async () => {
    await begin('starfarers', 'lasers-feelings', 2, false);
  });

  it('system step with the learn-more sheet', async () => {
    render(Setup);
    await snap('setup');
    await click(screen.getByRole('button', { name: 'Learn more about Roll for Shoes' }));
    await snap('setup-learn');
  });

  it('setting step for Lasers & Feelings and Roll for Shoes', async () => {
    render(Setting);
    await snap('setting-lf');
    cleanup();
    await begin('the-heist', 'roll-for-shoes', 1, false);
    app.session!.starterSkills = 1;
    render(Setting);
    await snap('setting-rfs');
  });

  it('story step: text, advanced, field sheet', async () => {
    render(Story);
    await snap('story-text');
    await click(screen.getByRole('tab', { name: 'Advanced' }));
    await snap('story-advanced');
    cleanup();
    await begin('the-heist', 'roll-for-shoes', 1, false);
    render(Story);
    await snap('story-rfs');
    const row = document.querySelector('.drow') as HTMLElement | null;
    if (row) {
      await click(row);
      await snap('story-field-sheet');
    }
  });

  it('players step with two players, and an open field sheet', async () => {
    render(Players);
    await snap('players-lf');
    await click(document.querySelector('.sentence .part') as HTMLElement);
    await snap('players-field-sheet');
    cleanup();
    await begin('the-heist', 'roll-for-shoes', 1, false);
    render(Players);
    await snap('players-rfs');
    cleanup();
    await begin('kintsugi', 'kintsugi', 1, false);
    render(Players);
    await snap('players-kin');
  });
});

describe('Lasers & Feelings in play', () => {
  beforeEach(async () => {
    await begin('moon-and-blood', 'lasers-feelings', 2);
    app.session!.characters[0]!.fields.number = 3;
  });

  it('track screen, roll as sheet, inline and page', async () => {
    setPlayRng(dice(1, 3, 5));
    render(Play);
    await snap('play-lf');
    await click(document.querySelector('.chk') as HTMLElement);
    await snap('play-lf-sheet');
    await click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Done' }));
    cleanup();
    play.mode = 'inline';
    setPlayRng(dice(3));
    render(Play);
    await click(document.querySelector('.chk') as HTMLElement);
    await snap('play-lf-inline-exact');
    cleanup();
    resetPlay();
    play.mode = 'page';
    setPlayRng(dice(1, 2));
    render(Play);
    await click(document.querySelector('.chk') as HTMLElement);
    await snap('play-lf-page');
  });

  it('character page', async () => {
    render(CharPage, { idx: 0 });
    await snap('char-lf');
  });
});

describe('Roll for Shoes in play', () => {
  beforeEach(async () => {
    await begin('the-heist', 'roll-for-shoes', 2);
    app.session!.starterSkills = 1;
    ensureSetup(app.session!, charCtx(app.session!, packs['the-heist']!, mulberry32(2)));
  });

  it('track screen, an every-die-a-six roll, a roll against GM dice, a failed roll', async () => {
    render(Play);
    await snap('play-rfs');
    setPlayRng(dice(6, 6, 6, 6, 6, 6));
    await click(document.querySelector('.skchip') as HTMLElement);
    await snap('play-rfs-allsix');
    cleanup();
    resetPlay();
    render(Play);
    setGm(2);
    await settle();
    setPlayRng(dice(5, 4, 1, 2, 3));
    await click(document.querySelector('.skchip') as HTMLElement);
    await snap('play-rfs-vs-gm');
    cleanup();
    resetPlay();
    setPlayRng(dice(1, 2, 1));
    render(Play);
    await click(document.querySelector('.skchip') as HTMLElement);
    await snap('play-rfs-fail');
  });

  it('character page', async () => {
    render(CharPage, { idx: 0 });
    await snap('char-rfs');
  });
});

describe('Kintsugi in play', () => {
  beforeEach(async () => {
    await begin('kintsugi', 'kintsugi', 2);
  });

  it('track screen and a failed roll that teaches a skill', async () => {
    render(Play);
    await snap('play-kin');
    setPlayRng(dice(5));
    await click(screen.getAllByRole('button', { name: /Do Anything/ })[0]!);
    await snap('play-kin-fail');
  });

  it('character page', async () => {
    render(CharPage, { idx: 0 });
    await snap('char-kin');
  });
});

describe('skill lists', () => {
  const setSkills = () => {
    const c = app.session!.characters[0]!;
    c.extra = ['Climb walls', ''];
    c.earned = [{ name: 'Tumble', level: 2, parent: 'r' }, { name: 'Roll out', level: 3, parent: 'e:0' }];
  };

  it('Roll for Shoes tree with setting skills, extras, earned skills and statuses', async () => {
    await begin('minimon', 'roll-for-shoes', 1);
    setSkills();
    render(CharPage, { idx: 0 });
    await snap('char-rfs-tree');
    cleanup();
    render(Play);
    await snap('play-rfs-tree');
    cleanup();
    await begin('minimon', 'roll-for-shoes', 1, false);
    setSkills();
    render(Players);
    await snap('players-rfs-tree');
  });

  it('Roll for Shoes optional status', async () => {
    await begin('outbreak-hotel', 'roll-for-shoes', 1);
    render(CharPage, { idx: 0 });
    await snap('char-rfs-optional-status');
  });

  it('Kintsugi skills, including a crossed-out one', async () => {
    await begin('kintsugi', 'kintsugi', 1);
    app.session!.characters[0]!.skills = [{ name: 'Kicking', level: 3 }, { name: 'Welded', level: 6, out: true }];
    render(CharPage, { idx: 0 });
    await snap('char-kin-skills');
    cleanup();
    render(Play);
    await snap('play-kin-skills');
    cleanup();
    await begin('kintsugi', 'kintsugi', 1, false);
    app.session!.characters[0]!.skills = [{ name: 'Kicking', level: 3 }];
    render(Players);
    await snap('players-kin-skills');
  });
});

describe('global inventory', () => {
  it('media queries and keyframes', async () => {
    await expect(mediaInventory()).toMatchFileSnapshot('./__snapshots__/styles/media-inventory.txt');
  });
});
