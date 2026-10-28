<script lang="ts">
  import { href } from '../lib/router.svelte.ts';
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { charName, fieldsOf, isEmptyValue, isKin, isRfs, lfFlavour, numberFieldId, showValue, skillTree } from '../lib/characters.ts';
  import { play } from '../lib/play.svelte.ts';
  import RulesControls from './RulesControls.svelte';
  import InlineRoll from './InlineRoll.svelte';

  let { ci }: { ci: number } = $props();

  const s = $derived(app.session!);
  const pack = $derived(currentPack());
  const c = $derived(s.characters[ci]!);
  const rfs = $derived(isRfs(s.rulesId));
  const kin = $derived(isKin(s.rulesId));
  const name = $derived(charName(c, ci));
  const sub = $derived.by(() => {
    if (!rfs && !kin) return [showValue(c.fields.style), showValue(c.fields.role).toLowerCase()].filter(Boolean).join(' ');
    // Skip the field already standing in for a missing name.
    const f = fieldsOf(pack, s.rulesId).find(
      x => x.id !== 'name' && !isEmptyValue(c.fields[x.id]) && showValue(c.fields[x.id]).toLowerCase() !== name.toLowerCase()
    );
    return f ? showValue(c.fields[f.id]) : '';
  });
  const N = $derived(c.fields[numberFieldId(lfFlavour(pack))]);
</script>

<div class="pcard compact">
  <a class="prow" href={href(`/track/char/${ci}`)}>
    <span class="pn"><b>{name}</b><small>{sub}</small></span>
    <span class="stats">
      {#if kin}
        <span class="stat">Skills <b>{(c.skills ?? []).filter(k => !k.out).length + 1}</b></span>
      {:else if rfs}
        <span class="stat">XP <b>{c.xp ?? 0}</b></span><span class="stat">Skills <b>{skillTree(pack, c).length}</b></span>
      {:else}
        <span class="stat">N <b>{N}</b></span>
      {/if}
    </span>
    <span class="chev" aria-hidden="true">›</span>
  </a>
  <RulesControls {ci} compact />
  {#if play.mode === 'inline' && play.roll?.ci === ci}
    <InlineRoll roll={play.roll} />
  {/if}
</div>

<style>
  .pcard.compact{background:var(--surface);border:2px solid var(--line);border-radius:18px;padding:4px 14px 14px;gap:10px}
  .pcard.compact .prow{border-top:0;padding:10px 0 8px}
  .prow{all:unset;cursor:pointer;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 10px;align-items:center;padding:12px 0;border-top:1px solid var(--line);min-height:64px}
  .prow:first-child{border-top:0}
  .prow:focus-visible{outline:var(--ring);outline-offset:2px;border-radius:6px}
  .prow .pn b{display:block;font-size:20px}
  .prow .pn small{color:var(--muted);font-size:14px}
  .prow .stats{grid-column:1}
  .prow .chev{grid-column:2;grid-row:1/span 2;color:var(--muted);font:700 20px/1 var(--f-mono)}
  .pcard.compact :global(.tog){min-height:44px;font-size:14px;padding:0 12px}
</style>
