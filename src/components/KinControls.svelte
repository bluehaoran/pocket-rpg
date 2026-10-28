<script lang="ts">
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { kinFlavour } from '../lib/characters.ts';
  import { rollKinSkill } from '../lib/play.svelte.ts';
  import { kinSkills } from '../lib/rules/kintsugi.ts';

  let { ci, compact = false }: { ci: number; compact?: boolean } = $props();

  const s = $derived(app.session!);
  const pack = $derived(currentPack());
  const c = $derived(s.characters[ci]);
  const skills = $derived(c ? kinSkills(kinFlavour(pack), c) : []);
</script>

{#if c}
  {#if compact}
    <ul class="chips skchips" aria-label="Skills">
      {#each skills as sk (sk.key)}
        <li><button class="tog skchip" class:out={sk.out} disabled={sk.out} onclick={() => rollKinSkill(ci, sk.key)}>{sk.name} <small>{sk.level}</small></button></li>
      {/each}
    </ul>
  {:else}
    <div class="card skills">
      {#each skills as sk (sk.key)}
        <button class="skill sroll" class:out={sk.out} disabled={sk.out} onclick={() => rollKinSkill(ci, sk.key)}>
          <span class="tw" aria-hidden="true"></span>
          <span class="sn">{sk.name}{#if sk.out}<small>Crossed out</small>{/if}</span>
          <span class="lv">{sk.level}</span><span class="go">Roll</span>
        </button>
      {/each}
    </div>
  {/if}
{/if}
