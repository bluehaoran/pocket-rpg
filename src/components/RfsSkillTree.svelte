<script lang="ts">
  // A Roll for Shoes character's skill tree and statuses. With `onedit`, unearned skills and statuses are tappable.
  import { app, currentPack } from '../lib/session.svelte.ts';
  import { skillTree, statuses } from '../lib/characters.ts';
  import type { FieldRef } from '../lib/fields.ts';
  import SkillRow from './SkillRow.svelte';

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
          <SkillRow mods="root" trail="none" name={sk.name} level={sk.level} unit="d6" />
        {:else if sk.earned != null}
          <SkillRow mods="child earned" glyph="└" depth={sk.depth} name={sk.name} note="Earned in play" level={sk.level} unit="d6" />
        {:else}
          {@const ref = sk.field ? { scope: 'char' as const, id: sk.field, ci: index } : { scope: 'skill' as const, id: String(sk.extra), ci: index }}
          <SkillRow mods="child" glyph="└" nameEmpty={!sk.name} name={sk.name || 'Name this skill'} note={sk.label} level={sk.level} unit="d6"
            trail={onedit ? 'chev' : 'blank'} onclick={onedit ? () => onedit(ref) : undefined} />
        {/if}
      {/each}
      {#each sts as t (t.field)}
        <SkillRow mods="child status" glyph="!" name={t.text} note={t.optional ? 'GM may apply' : undefined} level={t.level} levelClass="neg"
          trail={onedit ? 'chev' : 'blank'} onclick={onedit ? () => onedit({ scope: 'char', id: t.field, ci: index }) : undefined} />
      {/each}
    </div>
  </div>
  {#if onedit}
    <p class="hint">
      {tree.length > 1 ? 'Tap a skill to change it. ' : ''}New skills are earned in play: when every die shows 6, the player names a skill one level higher.
    </p>
  {/if}
</section>
