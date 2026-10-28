<script lang="ts">
  import { onDestroy } from 'svelte';
  import { router, href, go } from './lib/router.svelte.ts';
  import { app, chipText, startNewSession } from './lib/session.svelte.ts';
  import { createWakeLock } from './lib/device.ts';
  import { createConfirm } from './lib/confirm.svelte.ts';
  import { resetPlay } from './lib/play.svelte.ts';
  import Sheet from './components/Sheet.svelte';
  import Icon from './components/Icon.svelte';
  import Logo from './components/Logo.svelte';
  import Track from './routes/Track.svelte';
  import Tools from './routes/Tools.svelte';
  import ToolPage from './routes/ToolPage.svelte';
  import PackDetails from './routes/PackDetails.svelte';
  import Welcome from './routes/Welcome.svelte';
  import History from './routes/History.svelte';
  import ManageList from './routes/ManageList.svelte';
  import ManageTools from './routes/ManageTools.svelte';
  import About from './routes/About.svelte';

  let menuOpen = $state(false);
  let menuView = $state<'root' | 'data'>('root');
  const confirmNew = createConfirm();
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
    menuView = 'root';
    confirmNew.reset();
  }

  function openPage(path: string) {
    closeMenu();
    go(path);
  }

  const newSession = () =>
    confirmNew.trigger(async () => {
      await startNewSession();
      resetPlay();
      closeMenu();
      go('/track');
    });
</script>

<div class="app">
  <header class="top gutter">
    <Logo />
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
    {:else if route.page === 'about'}
      <About />
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
  <Sheet title={menuView === 'data' ? 'Data' : 'Session'} onclose={closeMenu}>
    {#if menuView === 'data'}
      <button class="btn secondary" onclick={() => openPage('/manage')}>Manage Tools</button>
      <button class="btn secondary" onclick={() => openPage('/packs')}>Pack details</button>
      <button class="btn ghost" onclick={() => (menuView = 'root')}>‹ Back</button>
    {:else}
      <button class="btn secondary" onclick={() => openPage('/welcome')}>Welcome</button>
      <button class="btn secondary" aria-pressed={confirmNew.armed} onclick={newSession}>
        {confirmNew.armed ? 'Tap again to confirm' : 'New session'}
      </button>
      <button class="btn secondary more" onclick={() => (menuView = 'data')}>Data <span aria-hidden="true">›</span></button>
      {#if import.meta.env.DEV}
        <button class="btn secondary dev" aria-pressed={forceWake} onclick={() => (forceWake = !forceWake)}>
          Keep awake (dev): {forceWake ? 'on' : 'off'}
        </button>
      {/if}
      <button class="btn secondary" onclick={() => openPage('/about')}>About</button>
      <button class="btn ghost" onclick={closeMenu}>Close</button>
    {/if}
  </Sheet>
{/if}

<style>
  .app{height:100%;max-width:460px;margin:0 auto;display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:var(--bg)}
  @media (min-width:600px){.app{border-inline:1px solid var(--line)}}
  .top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-block:12px;border-bottom:1px solid var(--line)}
  .chip{font:500 12px/1.3 var(--f-mono);color:var(--muted);text-align:right;min-width:0}
  main{overscroll-behavior:contain;overflow-y:auto;padding-block:18px 28px;display:flex;flex-direction:column;gap:22px;-webkit-overflow-scrolling:touch}
  .menubtn{width:44px;height:44px;border-radius:12px;border:2px solid var(--line);background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;flex:none}
  .menubtn i{display:block;width:18px;height:2.5px;border-radius:2px;background:var(--ink)}
  .hdr{display:flex;align-items:center;gap:10px;min-width:0}
  .tabs{display:grid;grid-template-columns:repeat(2,1fr);border-top:1px solid var(--line);background:var(--surface)}
  .tabs a{min-height:64px;border-top:3px solid transparent;color:var(--muted);font:800 22px/1 var(--f-display);text-transform:uppercase;letter-spacing:.06em;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:10px;text-decoration:none}
  .tabs a .n{font-size:24px;line-height:1;letter-spacing:0}
  .tabs a[aria-current="page"]{color:var(--ink);border-top-color:var(--accent)}
  .chip.cta{color:var(--accent);text-decoration:none;font:700 13px/1.25 var(--f-body);display:flex;align-items:center;min-height:44px;max-width:13em}
  main > :global(*){flex:none}
</style>
