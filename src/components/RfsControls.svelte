<script lang="ts">
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { skillTree, statuses } from '../lib/characters.ts';
  import { play, rollRfsSkill, toggle } from '../lib/play.svelte.ts';
  import SkillChips from './SkillChips.svelte';
  import Toggle from './Toggle.svelte';
  import SkillRow from './SkillRow.svelte';

  let { ci, compact = false }: { ci: number; compact?: boolean } = $props();

  const s = $derived(app.session!);
  const pack = $derived(currentPack());
  const c = $derived(s.characters[ci]);
  const tree = $derived(c ? skillTree(pack, c) : []);
  const sts = $derived(c ? statuses(pack, c) : []);
</script>

{#if c}
  {#if sts.length}
    <div role="group" aria-label="Statuses for the next roll">
      {#each sts as t (t.field)}
        <Toggle label="{t.level} {t.text}" on={!!play.apply[ci]?.[t.field]} onchange={() => toggle('apply', ci, t.field)} />
      {/each}
    </div>
  {/if}
  {#if compact}
    <SkillChips skills={tree.filter(sk => sk.name).map(sk => ({ key: sk.key, name: sk.name, level: `${sk.level}d6` }))} onroll={key => rollRfsSkill(ci, key)} />
  {:else}
    <div class="card skills">
      {#each tree as sk (sk.key)}
        <SkillRow mods="sroll" depth={sk.depth} disabled={!sk.name} name={sk.name || 'Unnamed skill'} glyph={sk.depth ? '└' : ''} level={sk.level} unit="d6"
          trail="go" onclick={() => rollRfsSkill(ci, sk.key)} />
      {/each}
    </div>
  {/if}
{/if}
