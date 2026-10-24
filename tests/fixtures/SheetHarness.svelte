<script lang="ts">
  import Sheet from '../../src/components/Sheet.svelte';
  let { onclose }: { onclose: () => void } = $props();
</script>

<button>outside</button>
<Sheet title="Test sheet" {onclose}>
  <button>first</button>
  <input aria-label="field" />
  <button>last</button>
</Sheet>
