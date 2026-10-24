<script lang="ts">
  import { packs } from '../lib/content/index.ts';
  import { href } from '../lib/router.svelte.ts';
  import { app } from '../lib/session.svelte.ts';
  import { charName, isEmptyValue, isRfs, lfFlavour, rfsFlavour, showValue, skillTree } from '../lib/characters.ts';
  import { closeRoll, play } from '../lib/play.svelte.ts';
  import LfControls from './LfControls.svelte';
  import RfsControls from './RfsControls.svelte';
  import RollResult from './RollResult.svelte';

  let { ci }: { ci: number } = $props();

  const s = $derived(app.session!);
  const pack = $derived(packs[s.packIds[0] ?? '']!);
  const c = $derived(s.characters[ci]!);
  const rfs = $derived(isRfs(s.rulesId));
  const name = $derived(charName(c, ci));
  const sub = $derived.by(() => {
    if (!rfs) return [showValue(c.fields.style), showValue(c.fields.role).toLowerCase()].filter(Boolean).join(' ');
    // Skip the field already standing in for a missing name.
    const f = rfsFlavour(pack).fields.find(
      x => x.id !== 'name' && !isEmptyValue(c.fields[x.id]) && showValue(c.fields[x.id]).toLowerCase() !== name.toLowerCase()
    );
    return f ? showValue(c.fields[f.id]) : '';
  });
  const N = $derived(c.fields[lfFlavour(pack).fields.find(x => x.kind === 'number')?.id ?? 'number']);
</script>

<div class="pcard compact">
  <a class="prow" href={href(`/track/char/${ci}`)}>
    <span class="pn"><b>{name}</b><small>{sub}</small></span>
    <span class="stats">
      {#if rfs}
        <span class="stat">XP <b>{c.xp ?? 0}</b></span><span class="stat">Skills <b>{skillTree(pack, c).length}</b></span>
      {:else}
        <span class="stat">N <b>{N}</b></span>
      {/if}
    </span>
    <span class="chev" aria-hidden="true">›</span>
  </a>
  {#if rfs}<RfsControls {ci} compact />{:else}<LfControls {ci} compact />{/if}
  {#if play.mode === 'inline' && play.roll?.ci === ci}
    <div class="result"><RollResult roll={play.roll} /><button class="btn ghost" onclick={closeRoll}>Done</button></div>
  {/if}
</div>
