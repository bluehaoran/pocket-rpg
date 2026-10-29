<script lang="ts">
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { exactText, lfFlavour, numberFieldId } from '../lib/characters.ts';
  import { poolSize, resourceState } from '../lib/rules/lasers-feelings.ts';
  import { adjust, play, rollCheck, toggle } from '../lib/play.svelte.ts';
  import Toggle from './Toggle.svelte';

  let { ci, compact = false }: { ci: number; compact?: boolean } = $props();

  const s = $derived(app.session!);
  const pack = $derived(currentPack());
  const f = $derived(lfFlavour(pack));
  const c = $derived(s.characters[ci]);
  const N = $derived(Number(c?.fields[numberFieldId(f)]));
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
  <div>
    {#if f.dice?.bonuses?.length}
      <div role="group" aria-label="Bonus dice">
        {#each f.dice.bonuses as b (b.id)}
          <Toggle label="+{b.dice}d {b.label}" on={!!play.bonuses[ci]?.[b.id]} onchange={() => toggle('bonuses', ci, b.id)} />
        {/each}
      </div>
    {/if}
    <div class="checks" class:compact>
      {#each f.checks as k (k.id)}
        <button class="chk" onclick={() => rollCheck(ci, k.id)}>
          <b>{k.label}</b><span>{pool}d6 · {k.roll} {N}</span>
          {#if !compact && k.hint}<small>{k.hint}</small>{/if}
        </button>
      {/each}
    </div>
    {#if !compact}
      <p class="hint">
        {exactText(f, N)}{f.help?.text ? ' Helping: ' + f.help.text : ''}
      </p>
    {/if}
  </div>
{/if}

<style>
  .checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .chk{min-height:112px;border-radius:16px;border:2px solid var(--accent);background:var(--surface);color:var(--ink);padding:12px 14px;text-align:left;display:flex;flex-direction:column;gap:6px;justify-content:space-between;min-width:0}
  .chk b{font:800 30px/1 var(--f-display);text-transform:uppercase;letter-spacing:.02em;overflow-wrap:anywhere}
  .chk span{font:700 14px/1.2 var(--f-mono)}
  .chk small{font-size:12px;line-height:1.3;opacity:.85}
  .res{display:grid;grid-template-columns:minmax(0,1fr) 52px 4.2ch 52px;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--line)}
  .res:first-child{border-top:0}
  .res button{min-height:52px;border-radius:12px;border:2px solid var(--line);background:var(--sunk);font:700 24px/1 var(--f-mono)}
  .res button:disabled{opacity:.35;cursor:not-allowed}
  .res output{font:700 22px/1 var(--f-mono);text-align:center;font-variant-numeric:tabular-nums}
  .res .st{display:block;font:400 13px/1.3 var(--f-body);color:var(--accent);text-transform:none;letter-spacing:0;margin-top:3px}
  .checks.compact .chk{min-height:76px;padding:10px 12px}
  .checks.compact .chk b{font-size:26px}
  .reslist .res{padding:4px 0;border-top:0;grid-template-columns:minmax(0,1fr) 44px 4.2ch 44px}
  .reslist .res button{min-height:44px;font-size:20px}
  .reslist .res output{font-size:19px}
</style>
