<script lang="ts">
  import { orderedPacks } from '../lib/content/index.ts';
  import { RULES, type RulesId } from '../lib/content/types.ts';

  const packs = orderedPacks();
  const byRules = (r: RulesId) => packs.filter(p => p.flavour?.[r]);
</script>

<section class="group">
  <div class="eyebrow">Track</div>
  <h2>New session</h2>
</section>

<div class="empty-card">
  The setup wizard (Setup / Story / Players) is milestone M4. Content is bundled and ready:
</div>

{#each Object.entries(RULES) as [id, label] (id)}
  <section class="group">
    <div class="eyebrow">{label}</div>
    {#each byRules(id as RulesId) as p (p.id)}
      <div class="opt" aria-disabled="true">
        <span class="radio"></span>
        <span class="t">{p.genre ?? p.name}</span>
        <span class="m">Based on {p.name} v{p.version}</span>
      </div>
    {/each}
  </section>
{/each}
