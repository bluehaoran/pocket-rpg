<script lang="ts">
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { kinFlavour } from '../lib/characters.ts';
  import { rollKinSkill } from '../lib/play.svelte.ts';
  import { kinSkills } from '../lib/rules/kintsugi.ts';
  import SkillChips from './SkillChips.svelte';
  import SkillRow from './SkillRow.svelte';

  let { ci, compact = false }: { ci: number; compact?: boolean } = $props();

  const s = $derived(app.session!);
  const pack = $derived(currentPack());
  const c = $derived(s.characters[ci]);
  const skills = $derived(c ? kinSkills(kinFlavour(pack), c) : []);
</script>

{#if c}
  {#if compact}
    <SkillChips skills={skills.map(sk => ({ key: sk.key, name: sk.name, level: String(sk.level), out: sk.out }))} onroll={key => rollKinSkill(ci, key)} />
  {:else}
    <div class="card skills">
      {#each skills as sk (sk.key)}
        <SkillRow mods="sroll" name={sk.name} note={sk.out ? 'Crossed out' : undefined} level={sk.level} out={sk.out} disabled={sk.out} trail="go"
          onclick={() => rollKinSkill(ci, sk.key)} />
      {/each}
    </div>
  {/if}
{/if}
