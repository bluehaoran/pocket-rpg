<script lang="ts">
  import { href } from '../lib/router.svelte.ts';
  import { createConfirm } from '../lib/confirm.svelte.ts';
  import { app, mutate } from '../lib/session.svelte.ts';
  import { hhmm } from '../lib/format.ts';
  import Crumb from '../components/Crumb.svelte';

  let { which }: { which: 'tools' | 'track' } = $props();

  const KIND = { roll: 'Roll', progress: 'Progress', resource: 'Resource', edit: 'Edit' } as const;

  const rows = $derived.by(() => {
    const s = app.session;
    if (!s) return [];
    const items = which === 'track'
      ? s.trackHistory.map(h => ({ t: h.t, head: [KIND[h.kind], h.char].filter(Boolean).join(' · '), text: h.text }))
      : s.toolHistory.map(h => ({ t: h.t, head: h.label, text: h.text }));
    return items.slice().reverse();
  });
  const confirm = createConfirm();
  const clear = () =>
    confirm.trigger(() =>
      mutate(s => {
        if (which === 'track') s.trackHistory = [];
        else s.toolHistory = [];
      })
    );
  const empty = $derived(
    which === 'track'
      ? 'Rolls, XP, new skills, resource changes and edits appear here.'
      : 'Results you keep appear here. Leaving a tool keeps its result; Reroll discards it.'
  );
</script>

<section class="group">
  <Crumb parent={which === 'track' ? 'Track' : 'Tools'} href={href(which === 'track' ? '/track' : '/tools')} current="History" />
  <p class="hint">This session</p>
</section>
<div class="card">
  {#each rows as r, i (i)}
    <div class="hrow">
      <time datetime={r.t}>{hhmm(r.t)}</time>
      <div><span class="eyebrow">{r.head}</span><div class="lt">{r.text}</div></div>
    </div>
  {:else}
    <p class="empty-note">{empty}</p>
  {/each}
</div>

<button class="btn ghost" disabled={!rows.length} aria-pressed={confirm.armed} onclick={clear}>
  {confirm.armed ? 'Tap again to clear' : 'Clear history'}
</button>

<style>
  .hrow{display:grid;grid-template-columns:48px minmax(0,1fr);gap:10px;padding:10px 0;border-top:1px solid var(--line)}
  .hrow:first-child{border-top:0}
  .hrow time{font:500 12px/1.6 var(--f-mono);color:var(--muted)}
  .hrow .lt{font-weight:700;font-size:16px;line-height:1.35;overflow-wrap:anywhere}
</style>
