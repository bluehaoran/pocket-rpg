<script lang="ts">
  import { app } from '../lib/session.svelte.ts';
  import { randomGmSkill, setGmSkill } from '../lib/play.svelte.ts';
  import Die from './Die.svelte';
  import Seg from './Seg.svelte';

  const options = [0, 1, 2, 3, 4, 5, 6].map(n => ({ value: n, label: n ? String(n) : 'Off' }));
  const skill = $derived(app.session?.gmSkill ?? 0);
</script>

<div class="group">
  <div class="eyebrow">Opposed by GM · skill</div>
  <div class="gmrow">
    <Seg class="gmseg" label="GM skill" {options} bind:value={() => skill, setGmSkill} />
    <button class="dice" aria-label="Random GM skill" onclick={randomGmSkill}><Die value={skill || 5} size="sm" /></button>
  </div>
</div>
