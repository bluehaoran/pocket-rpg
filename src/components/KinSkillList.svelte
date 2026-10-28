<script lang="ts">
  // A Kintsugi character's skills. The rows are read-only; `editable` only adds the rules hint.
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { kinFlavour } from '../lib/characters.ts';
  import { kinSkills } from '../lib/rules/kintsugi.ts';

  let { index, editable = false }: { index: number; editable?: boolean } = $props();

  const c = $derived(app.session!.characters[index]);
  const kf = $derived(kinFlavour(currentPack()));
  const skills = $derived(c ? kinSkills(kf, c) : []);
</script>

<section class="group">
  <div class="eyebrow">Skills</div>
  <div class="card">
    <div class="skills">
      {#each skills as sk (sk.key)}
        <div class="skill" class:out={sk.out}>
          <span class="tw" aria-hidden="true"></span>
          <span class="sn">{sk.name}{#if sk.out}<small>Crossed out</small>{:else if !sk.root}<small>Earned in play</small>{/if}</span>
          <span class="lv">{sk.level}</span><span></span>
        </div>
      {/each}
    </div>
  </div>
  {#if editable}
    <p class="hint">Roll a die at or under a skill to succeed. Failing "{kf.rootSkill ?? 'Do Anything'}" teaches a new skill; failing any other skill raises it by one, and at 6 it is crossed out.</p>
  {/if}
</section>
