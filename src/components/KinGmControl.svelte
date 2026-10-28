<script lang="ts">
  import { app } from '../lib/session.svelte.ts';
  import { randomGmSkill, setGmSkill } from '../lib/play.svelte.ts';
  import DiceButton from './DiceButton.svelte';
  import Die from './Die.svelte';
  import InputRow from './InputRow.svelte';
  import Seg from './Seg.svelte';

  const options = [0, 1, 2, 3, 4, 5, 6].map(n => ({ value: n, label: n ? String(n) : 'Off' }));
  const skill = $derived(app.session?.gmSkill ?? 0);
</script>

<div class="group">
  <div class="eyebrow">Opposed by GM · skill</div>
  <InputRow variant="gmrow">
    <Seg label="GM skill" {options} bind:value={() => skill, setGmSkill} />
    <DiceButton label="Random GM skill" onclick={randomGmSkill}><Die value={skill || 5} size="sm" /></DiceButton>
  </InputRow>
</div>
