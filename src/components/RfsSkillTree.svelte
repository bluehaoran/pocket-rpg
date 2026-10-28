<script lang="ts">
  // A Roll for Shoes character's skill tree and statuses. With `onedit`, unearned skills and statuses are tappable.
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { skillTree, statuses } from '../lib/characters.ts';
  import type { FieldRef } from '../lib/fields.ts';

  let { index, onedit }: { index: number; onedit?: (ref: FieldRef) => void } = $props();

  const c = $derived(app.session!.characters[index]);
  const tree = $derived(c ? skillTree(currentPack(), c) : []);
  const sts = $derived(c ? statuses(currentPack(), c) : []);
</script>

<section class="group">
  <div class="eyebrow">Skills</div>
  <div class="card">
    <div class="skills">
      {#each tree as sk (sk.key)}
        {#if sk.root}
          <div class="skill root"><span class="sn">{sk.name}</span><span class="lv">{sk.level}<small>d6</small></span></div>
        {:else if sk.earned != null}
          <div class="skill child earned" style="--dep:{sk.depth}">
            <span class="tw" aria-hidden="true">└</span>
            <span class="sn">{sk.name}<small>Earned in play</small></span>
            <span class="lv">{sk.level}<small>d6</small></span><span></span>
          </div>
        {:else}
          {@const ref = sk.field ? { scope: 'char' as const, id: sk.field, ci: index } : { scope: 'skill' as const, id: String(sk.extra), ci: index }}
          {#snippet skillInner()}
            <span class="tw" aria-hidden="true">└</span>
            <span class="sn" class:empty={!sk.name}>{sk.name || 'Name this skill'}{#if sk.label}<small>{sk.label}</small>{/if}</span>
            <span class="lv">{sk.level}<small>d6</small></span>
            {#if onedit}<span class="chev" aria-hidden="true">›</span>{:else}<span></span>{/if}
          {/snippet}
          {#if onedit}
            <button class="skill child" onclick={() => onedit(ref)}>{@render skillInner()}</button>
          {:else}
            <div class="skill child">{@render skillInner()}</div>
          {/if}
        {/if}
      {/each}
      {#each sts as t (t.field)}
        {#snippet statusInner()}
          <span class="tw" aria-hidden="true">!</span>
          <span class="sn">{t.text}{#if t.optional}<small>GM may apply</small>{/if}</span>
          <span class="lv neg">{t.level}</span>
          {#if onedit}<span class="chev" aria-hidden="true">›</span>{:else}<span></span>{/if}
        {/snippet}
        {#if onedit}
          <button class="skill child status" onclick={() => onedit({ scope: 'char', id: t.field, ci: index })}>{@render statusInner()}</button>
        {:else}
          <div class="skill child status">{@render statusInner()}</div>
        {/if}
      {/each}
    </div>
  </div>
  {#if onedit}
    <p class="hint">
      {tree.length > 1 ? 'Tap a skill to change it. ' : ''}New skills are earned in play: when every die shows 6, the player names a skill one level higher.
    </p>
  {/if}
</section>
