<script lang="ts">
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { skillTree, statuses } from '../lib/characters.ts';
  import { play, rollRfsSkill, toggle } from '../lib/play.svelte.ts';
  import SkillChips from './SkillChips.svelte';
  import Tog from './Tog.svelte';
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
    <ul class="chips" aria-label="Statuses for the next roll">
      {#each sts as t (t.field)}
        <li><Tog pressed={!!play.apply[ci]?.[t.field]} onclick={() => toggle('apply', ci, t.field)}>{t.level} {t.text}</Tog></li>
      {/each}
    </ul>
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
