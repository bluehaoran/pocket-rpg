<script lang="ts">
  import { router, href, go } from './lib/router.svelte.ts';
  import Track from './routes/Track.svelte';
  import Tools from './routes/Tools.svelte';
  import ToolPage from './routes/ToolPage.svelte';
  import PackDetails from './routes/PackDetails.svelte';

  let menuOpen = $state(false);
  const route = $derived(router.route);

  function openPage(path: string) {
    menuOpen = false;
    go(path);
  }
</script>

<div class="app">
  <header class="top gutter">
    <div class="brand">Pocket<b>RPG</b></div>
    <div class="hdr">
      <div class="chip">no session</div>
      <button class="menubtn" aria-label="Menu" onclick={() => (menuOpen = true)}><i></i><i></i><i></i></button>
    </div>
  </header>

  <main class="gutter">
    {#if route.page === 'packs'}
      <PackDetails packId={route.rest[0]} />
    {:else if route.tab === 'tools'}
      {#if route.rest[0]}
        <ToolPage toolId={route.rest[0]} />
      {:else}
        <Tools />
      {/if}
    {:else}
      <Track />
    {/if}
  </main>

  <nav class="tabs gutter" aria-label="Main">
    <a href={href('/track')} aria-current={route.tab === 'track' && !route.page ? 'page' : undefined}><span class="n">≡</span>Track</a>
    <a href={href('/tools')} aria-current={route.tab === 'tools' ? 'page' : undefined}><span class="n">⚄</span>Tools</a>
  </nav>
</div>

{#if menuOpen}
  <button class="scrim" aria-label="Close menu" onclick={() => (menuOpen = false)}></button>
  <div class="sheet gutter" role="dialog" aria-modal="true" aria-labelledby="menu-title">
    <div class="eyebrow" id="menu-title">Session</div>
    <button class="btn ghost" onclick={() => openPage('/packs')}>Pack details</button>
    <button class="btn ghost" disabled>New session</button>
    <p class="hint">New session arrives with the setup wizard (M4).</p>
    <button class="btn" onclick={() => (menuOpen = false)}>Close</button>
  </div>
{/if}
