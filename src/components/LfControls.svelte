<script lang="ts">
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { lfFlavour } from '../lib/characters.ts';
  import { poolSize, resourceState } from '../lib/rules/lasers-feelings.ts';
  import { adjust, play, rollCheck, toggle } from '../lib/play.svelte.ts';

  let { ci, compact = false }: { ci: number; compact?: boolean } = $props();

  const s = $derived(app.session!);
  const pack = $derived(currentPack());
  const f = $derived(lfFlavour(pack));
  const c = $derived(s.characters[ci]);
  const N = $derived(Number(c?.fields[f.fields.find(x => x.kind === 'number')?.id ?? 'number']));
  const pool = $derived(poolSize(f, play.bonuses[ci]));
  const res = $derived((f.resources ?? []).filter(r => c && c.resources[r.id] != null));
</script>

{#if c}
  {#if res.length}
    <div class={compact ? 'reslist' : 'card'}>
      {#each res as r (r.id)}
        {@const v = c.resources[r.id]!}
        {@const st = resourceState(r, v)}
        <div class="res">
          <span class="eyebrow">{r.label}{#if st}<span class="st">{st.label.charAt(0).toUpperCase() + st.label.slice(1)}: {st.text}</span>{/if}</span>
          <button aria-label="Lose 1 {r.label}" disabled={v <= 0} onclick={() => adjust(ci, r.id, -1)}>−</button>
          <output>{v}/{r.max}</output>
          <button aria-label="Gain 1 {r.label}" disabled={v >= r.max} onclick={() => adjust(ci, r.id, 1)}>+</button>
        </div>
      {/each}
    </div>
  {/if}
  <div class="rollbox">
    {#if f.dice?.bonuses?.length}
      <ul class="chips" aria-label="Bonus dice">
        {#each f.dice.bonuses as b (b.id)}
          <li><button class="tog" aria-pressed={!!play.bonuses[ci]?.[b.id]} onclick={() => toggle('bonuses', ci, b.id)}>+{b.dice}d {b.label}</button></li>
        {/each}
      </ul>
    {/if}
    <div class="checks" class:compact>
      {#each f.checks as k, j (k.id)}
        <button class="chk" class:alt={j > 0} onclick={() => rollCheck(ci, k.id)}>
          <b>{k.label}</b><span>{pool}d6 · {k.roll} {N}</span>
          {#if !compact && k.hint}<small>{k.hint}</small>{/if}
        </button>
      {/each}
    </div>
    {#if !compact}
      <p class="hint">
        Exactly {N}: {f.exact?.name ?? 'special effect'}{f.exact?.countsAsSuccess === false ? ' (not a success)' : ''}.{f.help?.text ? ' Helping: ' + f.help.text : ''}
      </p>
    {/if}
  </div>
{/if}
