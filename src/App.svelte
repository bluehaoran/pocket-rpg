<script lang="ts">
  import { onDestroy } from 'svelte';
  import { router, href, go } from './lib/router.svelte.ts';
  import { app, chipText, startNewSession } from './lib/session.svelte.ts';
  import { createWakeLock } from './lib/device.ts';
  import { resetPlay } from './lib/play.svelte.ts';
  import Sheet from './components/Sheet.svelte';
  import Icon from './components/Icon.svelte';
  import Track from './routes/Track.svelte';
  import Tools from './routes/Tools.svelte';
  import ToolPage from './routes/ToolPage.svelte';
  import PackDetails from './routes/PackDetails.svelte';
  import Welcome from './routes/Welcome.svelte';
  import History from './routes/History.svelte';
  import ManageList from './routes/ManageList.svelte';
  import ManageTools from './routes/ManageTools.svelte';

  let menuOpen = $state(false);
  let confirmNew = $state(false);
  let confirmTimer: ReturnType<typeof setTimeout> | undefined;
  const route = $derived(router.route);
  let mainEl: HTMLElement | undefined = $state();

  // A new screen starts at the top, as in the mockup.
  $effect(() => {
    void [route.tab, route.page, route.rest.join('/')];
    mainEl?.scrollTo?.(0, 0);
  });

  // Screen stays on while a session is in play. Dev builds can force it, since `started` needs the M4 wizard.
  const wake = createWakeLock();
  let forceWake = $state(false);
  $effect(() => wake.set(app.session?.started === true || forceWake));
  onDestroy(() => wake.dispose());

  function closeMenu() {
    menuOpen = false;
    confirmNew = false;
    clearTimeout(confirmTimer);
  }

  function openPage(path: string) {
    closeMenu();
    go(path);
  }

  // Two taps: the first arms the button for 4 seconds, the second replaces the session.
  async function newSession() {
    if (!confirmNew) {
      confirmNew = true;
      confirmTimer = setTimeout(() => (confirmNew = false), 4000);
      return;
    }
    await startNewSession();
    resetPlay();
    closeMenu();
    go('/track');
  }
</script>

<div class="app">
  <header class="top gutter">
    <div class="brand">Pocket<b>RPG</b></div>
    <div class="hdr">
      {#if app.ready && chipText(app.session)}
        <div class="chip">{chipText(app.session)}</div>
      {:else if app.ready}
        <a class="chip cta" href={href('/track/setup')}>No story in progress. Click to start</a>
      {/if}
      <button class="menubtn" aria-label="Menu" onclick={() => (menuOpen = true)}><i></i><i></i><i></i></button>
    </div>
  </header>

  <main class="gutter" bind:this={mainEl}>
    {#if !app.ready}
      <p class="hint">Loading…</p>
    {:else if route.page === 'welcome'}
      <Welcome />
    {:else if route.page === 'packs'}
      <PackDetails packId={route.rest[0]} />
    {:else if route.page === 'manage'}
      {#if route.rest[0]}
        {#key route.rest[0]}<ManageList listId={route.rest[0]} />{/key}
      {:else}
        <ManageTools />
      {/if}
    {:else if route.tab === 'tools'}
      {#if route.rest[0] === 'history'}
        <History which="tools" />
      {:else if route.rest[0]}
        {#key route.rest[0]}<ToolPage toolId={route.rest[0]} />{/key}
      {:else}
        <Tools />
      {/if}
    {:else}
      <Track />
    {/if}
  </main>

  <nav class="tabs gutter" aria-label="Main">
    <a href={href('/track')} aria-current={route.tab === 'track' && !route.page ? 'page' : undefined}><span class="n" aria-hidden="true"><Icon name="notes" size="26px" /></span>Track</a>
    <a href={href('/tools')} aria-current={route.tab === 'tools' ? 'page' : undefined}><span class="n" aria-hidden="true"><Icon name="d20" size="26px" /></span>Tools</a>
  </nav>
</div>

{#if menuOpen}
  <Sheet title="Session" onclose={closeMenu}>
    <button class="btn ghost" onclick={() => openPage('/welcome')}>Welcome</button>
    <button class="btn ghost" onclick={() => openPage('/packs')}>Pack details</button>
    <button class="btn ghost" onclick={() => openPage('/manage')}>Manage Tools</button>
    <button class="btn ghost" aria-pressed={confirmNew} onclick={newSession}>
      {confirmNew ? 'Tap again to confirm' : 'New session'}
    </button>
    {#if import.meta.env.DEV}
      <button class="btn ghost" aria-pressed={forceWake} onclick={() => (forceWake = !forceWake)}>
        Keep awake (dev): {forceWake ? 'on' : 'off'}
      </button>
    {/if}
    <button class="btn" onclick={closeMenu}>Close</button>
  </Sheet>
{/if}
