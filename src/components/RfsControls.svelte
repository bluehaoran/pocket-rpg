<script lang="ts">
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { skillTree, statuses } from '../lib/characters.ts';
  import { play, rollRfsSkill, toggle } from '../lib/play.svelte.ts';

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
        <li><button class="tog" aria-pressed={!!play.apply[ci]?.[t.field]} onclick={() => toggle('apply', ci, t.field)}>{t.level} {t.text}</button></li>
      {/each}
    </ul>
  {/if}
  {#if compact}
    <ul class="chips skchips" aria-label="Skills">
      {#each tree.filter(sk => sk.name) as sk (sk.key)}
        <li><button class="tog skchip" onclick={() => rollRfsSkill(ci, sk.key)}>{sk.name} <small>{sk.level}d6</small></button></li>
      {/each}
    </ul>
  {:else}
    <div class="card skills">
      {#each tree as sk (sk.key)}
        <button class="skill sroll" style="--dep:{sk.depth}" disabled={!sk.name} onclick={() => rollRfsSkill(ci, sk.key)}>
          <span class="tw" aria-hidden="true">{sk.depth ? '└' : ''}</span>
          <span class="sn">{sk.name || 'Unnamed skill'}</span>
          <span class="lv">{sk.level}<small>d6</small></span><span class="go">Roll</span>
        </button>
      {/each}
    </div>
  {/if}
{/if}
