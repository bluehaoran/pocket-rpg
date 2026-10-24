<script lang="ts">
  import { app } from '../../lib/session.svelte.ts';
</script>

<section class="group">
  <div class="eyebrow">Track</div>
  <h2>In play</h2>
</section>
<div class="empty-card">Session started with {app.session?.characters.length} character(s). Play screens are milestone M5.</div>
