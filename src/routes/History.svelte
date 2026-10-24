<script lang="ts">
  import { href } from '../lib/router.svelte.ts';
  import { onDestroy } from 'svelte';
  import { app, mutate } from '../lib/session.svelte.ts';
  import { hhmm } from '../lib/format.ts';

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
  // Two taps, like New session: the first arms the button for 4 seconds, the second clears.
  let confirm = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => clearTimeout(timer));
  function clear() {
    if (!confirm) {
      confirm = true;
      timer = setTimeout(() => (confirm = false), 4000);
      return;
    }
    clearTimeout(timer);
    confirm = false;
    mutate(s => {
      if (which === 'track') s.trackHistory = [];
      else s.toolHistory = [];
    });
  }
  const empty = $derived(
    which === 'track'
      ? 'Rolls, XP, new skills, resource changes and edits appear here.'
      : 'Results you keep appear here. Leaving a tool keeps its result; Reroll discards it.'
  );
</script>

<section class="group">
  <h2>
    <a class="crumb" href={href(which === 'track' ? '/track' : '/tools')}>{which === 'track' ? 'Track' : 'Tools'}</a><span class="sep" aria-hidden="true">›</span>History
  </h2>
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

<button class="btn ghost" disabled={!rows.length} aria-pressed={confirm} onclick={clear}>
  {confirm ? 'Tap again to clear' : 'Clear history'}
</button>
