<script lang="ts">
  import { go } from '../lib/router.svelte.ts';
  import { startNewSession } from '../lib/session.svelte.ts';
  import { createConfirm } from '../lib/confirm.svelte.ts';
  import { resetPlay } from '../lib/play.svelte.ts';
  import Sheet from './Sheet.svelte';

  let { onclose, forceWake = $bindable() }: { onclose: () => void; forceWake: boolean } = $props();

  let view = $state<'root' | 'data'>('root');
  const confirmNew = createConfirm();

  function close() {
    confirmNew.reset();
    onclose();
  }

  function openPage(path: string) {
    close();
    go(path);
  }

  const newSession = () =>
    confirmNew.trigger(async () => {
      await startNewSession();
      resetPlay();
      close();
      go('/track');
    });
</script>

<Sheet title={view === 'data' ? 'Data' : 'Session'} onclose={close}>
  {#if view === 'data'}
    <button class="btn secondary" onclick={() => openPage('/manage')}>Manage Tools</button>
    <button class="btn secondary" onclick={() => openPage('/packs')}>Pack details</button>
    <button class="btn ghost" onclick={() => (view = 'root')}>‹ Back</button>
  {:else}
    <button class="btn secondary" onclick={() => openPage('/welcome')}>Welcome</button>
    <button class="btn secondary" aria-pressed={confirmNew.armed} onclick={newSession}>
      {confirmNew.armed ? 'Tap again to confirm' : 'New session'}
    </button>
    <button class="btn secondary more" onclick={() => (view = 'data')}>Data <span aria-hidden="true">›</span></button>
    {#if import.meta.env.DEV}
      <button class="btn secondary dev" aria-pressed={forceWake} onclick={() => (forceWake = !forceWake)}>
        Keep awake (dev): {forceWake ? 'on' : 'off'}
      </button>
    {/if}
    <button class="btn secondary" onclick={() => openPage('/about')}>About</button>
    <button class="btn ghost" onclick={close}>Close</button>
  {/if}
</Sheet>

<style>
  .secondary{background:var(--sunk);color:var(--ink);border-color:var(--sunk)}
  .secondary[aria-pressed="true"]{border-color:var(--accent);color:var(--accent)}
  /* Rows that open a sub-menu: label stays centred like the others, the chevron hangs off the right edge. */
  .more{position:relative}
  .more span{position:absolute;right:20px}
  /* Dev-only controls never ship in a production build. */
  .dev{border:2px dashed var(--dev);color:var(--dev)}
  .dev[aria-pressed="true"]{background:var(--dev-soft)}
</style>
