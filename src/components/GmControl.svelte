<script lang="ts">
  import { app } from '../lib/session.svelte.ts';
  import { setGm } from '../lib/play.svelte.ts';
  import Seg from './Seg.svelte';

  const options = [0, 1, 2, 3, 4].map(n => ({ value: n, label: n ? `${n}d6` : 'Off' }));
</script>

<div class="group">
  <div class="eyebrow">Opposed by GM</div>
  <Seg class="gmseg" label="Opposed by GM" {options} bind:value={() => app.session?.gmDice ?? 0, setGm} />
</div>
