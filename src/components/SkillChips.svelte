<script lang="ts">
  // Compact skill buttons for the party card: tap one to roll it.
  let { skills, onroll }: {
    skills: { key: string; name: string; level: string; out?: boolean }[];
    onroll: (key: string) => void;
  } = $props();
</script>

<ul class="chips skchips" aria-label="Skills">
  {#each skills as sk (sk.key)}
    <li><button class="tog skchip" class:out={sk.out} disabled={sk.out} onclick={() => onroll(sk.key)}>{sk.name} <small>{sk.level}</small></button></li>
  {/each}
</ul>

<style>
  .skchip small{font:700 12px var(--f-mono);opacity:.75;margin-left:4px}
  .skchips .tog{border-color:var(--accent);color:var(--accent)}
  .skchip.out{text-decoration:line-through;color:var(--muted)}
  .skchip.out{opacity:.6}
</style>
