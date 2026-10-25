<script lang="ts">
  import { onMount } from 'svelte';
  import { registry } from '../lib/content/index.ts';
  import { href, go } from '../lib/router.svelte.ts';
  import { app, mutate } from '../lib/session.svelte.ts';
  import { toolPack, toolCtx } from '../lib/toolctx.svelte.ts';
  import { buzz } from '../lib/device.ts';
  import { availableLetters } from '../lib/engine/table.ts';
  import {
    countOpt, diceOpts, glyphRows, drawFollowUp, effectiveOpts, entriesOf, findTool, followOn, historyText, isEmptyList,
    modDefs, partOn, partOrderOn, rollTool, segments, valueLabel, type ToolOpts, type ToolResult
  } from '../lib/tools.ts';
  import Sheet from '../components/Sheet.svelte';
  import Chips from '../components/Chips.svelte';
  import Seg from '../components/Seg.svelte';
  import Stepper from '../components/Stepper.svelte';
  import Die from '../components/Die.svelte';
  import Dock from '../components/Dock.svelte';

  let { toolId }: { toolId: string } = $props();

  const pack = $derived(toolPack());
  const tool = $derived(findTool(toolId, registry, pack));
  const opts = $derived<ToolOpts>(app.session?.toolModifiers[toolId] ?? {});
  const eff = $derived(tool ? effectiveOpts(tool, opts, toolCtx()) : {});
  const defs = $derived(tool ? modDefs(tool, toolCtx()) : []);
  const empty = $derived(tool ? isEmptyList(tool, toolCtx()) : false);
  const hasToggles = $derived(tool?.kind === 'list' && (!!tool.parts?.length || !!tool.followUp));
  const modsFirst = $derived(tool?.kind === 'list' && tool.modifiersFirst === true);

  let result = $state<ToolResult | null>(null);
  let followUp = $state<string | null>(null);
  let rolls = $state(0);
  let lettersOpen = $state(false);
  let logged = false;

  function roll() {
    if (!tool) return;
    mutate(() => {
      result = rollTool(tool, opts, toolCtx(), result);
    });
    rolls++;
    if (result) buzz();
    if (result && tool.kind === 'list' && followOn(tool, opts)) {
      mutate(() => (followUp = drawFollowUp(tool, toolCtx(), null)));
    } else followUp = null;
  }

  function setOpt(key: string, value: string | number | boolean, reroll = true) {
    mutate(s => {
      s.toolModifiers[toolId] = { ...(s.toolModifiers[toolId] ?? {}), [key]: value };
    });
    if (reroll) roll();
  }

  function setFollow(on: boolean) {
    // Turning the follow-up on or off leaves the main result alone.
    setOpt('followUp', on, false);
    followUp = on && result && tool?.kind === 'list' ? mutateDraw() : null;
    rolls++;
  }
  function mutateDraw(): string | null {
    let v: string | null = null;
    if (tool?.kind === 'list') mutate(() => (v = drawFollowUp(tool, toolCtx(), null)));
    return v;
  }
  function rerollFollow() {
    if (tool?.kind !== 'list') return;
    const prev = followUp;
    mutate(() => (followUp = drawFollowUp(tool, toolCtx(), prev)));
    rolls++;
    buzz();
  }

  /** Keep the result on screen in Tools History. Happens at most once per visit. */
  function keep() {
    if (logged || !tool || !result) return;
    logged = true;
    const r = result;
    const modifiers: Record<string, string> = {};
    if (r.kind !== 'dice') for (const [k, v] of Object.entries(r.mods)) if (v) modifiers[k] = v;
    mutate(s => {
      s.toolHistory.push({
        t: new Date().toISOString(),
        tool: toolId,
        label: tool.label,
        text: tool.kind === 'dice' ? `${r.text} (${r.kind === 'dice' ? r.note : ''})` : historyText(tool, r, followUp, opts),
        ...(Object.keys(modifiers).length ? { modifiers } : {}),
        ...(r.kind !== 'dice' && r.relaxed ? { relaxed: true } : {})
      });
    });
  }

  function done() {
    keep();
    go('/tools');
  }

  onMount(() => {
    if (tool && !empty) roll();
  });

  const letterSel = $derived.by(() => {
    const sel: Record<string, string> = {};
    for (const d of defs) if (d.key !== 'letter' && typeof eff[d.key] === 'string' && eff[d.key]) sel[d.key] = eff[d.key] as string;
    return sel;
  });
  const haveLetters = $derived(tool && tool.kind === 'list' ? availableLetters(entriesOf(tool, toolCtx()), letterSel) : new Set<string>());
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  const dice = $derived(tool?.kind === 'dice' ? diceOpts(tool, opts) : null);
  const missing = $derived(defs.filter(d => d.required && !eff[d.key]));
</script>

{#if !tool}
  <h2><a class="crumb" href={href('/tools')}>Tools</a><span class="sep" aria-hidden="true">›</span>Unknown</h2>
  <div class="empty-card">No tool with id <code>{toolId}</code> in <code>content/tools/registry.json</code> or the active pack.</div>
{:else}
  <h2><a class="crumb" href={href('/tools')}>Tools</a><span class="sep" aria-hidden="true">›</span>{tool.label}</h2>
  {#if tool.kind === 'gen'}
    <p class="hint">{pack?.genre ?? pack?.name} pack</p>
  {:else if tool.description}
    <p class="hint">{tool.description}</p>
  {/if}

{#snippet toggleGroups()}
{#if tool?.kind === 'list'}
  <div class="toggles">
    {#each tool.parts ?? [] as part (part.key)}
      <div class="group">
        <div class="eyebrow">{part.label}</div>
        <Chips label={part.label}
          items={[{ id: 'off', label: 'Off', pressed: !partOn(part, opts) }, { id: 'on', label: 'On', pressed: partOn(part, opts) }]}
          onpick={v => setOpt(part.key, v === 'on')} />
      </div>
    {/each}
    {#if tool.followUp}
      <div class="group">
        <div class="eyebrow">{tool.followUp.label}</div>
        <Chips label={tool.followUp.label}
          items={[{ id: 'off', label: 'Off', pressed: !followOn(tool, opts) }, { id: 'on', label: 'On', pressed: followOn(tool, opts) }]}
          onpick={v => setFollow(v === 'on')} />
      </div>
    {/if}
  </div>
{/if}
{/snippet}

{#snippet modifierGroups()}
  {#each defs as d (d.key)}
    {#if d.key === 'letter'}
      <div class="group">
        <div class="eyebrow">Starting letter</div>
        <button class="letterbtn" aria-label="Starting letter: {eff.letter || 'Any'}" onclick={() => (lettersOpen = true)}>
          <span class="v">{eff.letter || 'Any'}</span><span class="chev" aria-hidden="true">›</span>
        </button>
      </div>
    {:else}
      <div class="group">
        <div class="eyebrow">{d.label}{d.required ? ' · required' : ''}</div>
        <Chips label={d.label}
          items={[...(d.required ? [] : [{ id: '', label: 'Any' }]), ...d.values.map(v => ({ id: v, label: valueLabel(d, v) }))]
            .map(c => ({ ...c, pressed: (String(eff[d.key] ?? '')) === c.id }))}
          onpick={v => setOpt(d.key, v)} />
      </div>
    {/if}
  {/each}
{/snippet}

  {#if hasToggles}{@render toggleGroups()}{/if}
  {#if modsFirst}{@render modifierGroups()}{/if}

  {#if empty}
    <div class="empty-card">No entries yet. Add them to <code>content/tools/{tool.kind === 'list' ? tool.list : ''}.json</code>.</div>
  {:else if !result && tool.kind === 'gen' && missing.length}
    <div class="empty-card">Choose {missing.map(d => d.label.toLowerCase()).join(', ')} below to roll.</div>
  {:else if !result}
    <div class="empty-card">Nothing matches. Clear a filter below.</div>
  {:else}
    {#key rolls}
      <div class="tres fresh" aria-live="polite">
        {#if result.kind === 'dice'}
          <div class="tbig num">{result.text}</div>
          <div class="dicerow">
            {#each result.dice as v, i (i)}
              {#if result.sides === 6}<Die value={v} size="lg" />{:else}<span class="d20" role="img" aria-label="d{result.sides} showing {v}">{v}</span>{/if}
            {/each}
          </div>
          <div class="rfoot">{result.note}</div>
        {:else}
          {#if result.kind === 'list' && result.glyph}
            {@const rows = glyphRows(result.base.length)}
            <div class="glyphs" role="img" aria-label={result.text}>
              {#each rows as count, r (r)}
                {@const start = rows.slice(0, r).reduce((a, b) => a + b, 0)}
                <div class="grow">{#each result.base.slice(start, start + count) as g, i (i)}<span>{g}</span>{/each}</div>
              {/each}
            </div>
          {:else}
          <div class="tbig">
            {#each segments(tool, result, opts) as seg, i (i)}<span class:ul={seg.underline}>{seg.text}</span>{/each}{#if followUp && tool.kind === 'list' && tool.followUp}<span class="xtra">{tool.followUp.join ?? ' — '}{followUp}</span>{/if}
          </div>
          {/if}
          {#if result.kind === 'gen' && result.sub}<p class="rsub">{result.sub}</p>{/if}
          {#if result.relaxed}<div class="rfoot"><span class="relax">No exact match: some filters relaxed</span></div>{/if}
        {/if}
      </div>
    {/key}
    {#if tool.kind === 'list'}
      {@const orderPart = (tool.parts ?? []).find(p => p.order && partOn(p, opts))}
      {#if orderPart?.order || (tool.followUp && followUp)}
        <div class="underres">
          {#if orderPart?.order}
            <label class="checkrow">
              <input type="checkbox" checked={partOrderOn(orderPart, opts)}
                onchange={e => { setOpt(orderPart.key + ':order', e.currentTarget.checked, false); rolls++; }} />
              {orderPart.order.label}?
            </label>
          {/if}
          {#if tool.followUp && followUp}
            <button class="mini-btn" onclick={rerollFollow}>↻ New {tool.followUp.label.toLowerCase()}</button>
          {/if}
        </div>
      {/if}
    {/if}
  {/if}

  {#if tool.kind === 'dice' && dice}
    <div class="group">
      <div class="eyebrow">Number of dice</div>
      <Stepper label="dice" min={tool.dice?.count.min ?? 1} max={tool.dice?.count.max ?? 10}
        bind:value={() => dice.count, v => setOpt('count', v)} />
    </div>
    <div class="group">
      <div class="eyebrow">Type</div>
      <Seg class="dtype" label="Die type" options={(tool.dice?.types ?? []).map(n => ({ value: n, label: `d${n}` }))}
        bind:value={() => dice.type, v => setOpt('type', v)} />
    </div>
  {:else}
    {#if !modsFirst}{@render modifierGroups()}{/if}

    {#if tool.kind === 'list'}
      {#if tool.count}
        <div class="group">
          <div class="eyebrow">How many</div>
          <Stepper label="how many" min={tool.count.min} max={tool.count.max}
            bind:value={() => countOpt(tool, opts), v => setOpt('count', v)} />
        </div>
      {/if}
    {/if}
  {/if}

  <Dock one>
    <button class="btn" onclick={roll} disabled={empty || (tool.kind === 'gen' && missing.length > 0)}>Reroll</button>
    <button class="btn keep" aria-label="Keep result" onclick={done} disabled={!result}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" /></svg>
    </button>
    <p class="dock-note">✓ keeps this result in History. Reroll or Back discards it.</p>
  </Dock>
{/if}

{#if lettersOpen}
  <Sheet title="Starting letter" onclose={() => (lettersOpen = false)}>
    <div class="letters">
      <button class="any" aria-pressed={!eff.letter} onclick={() => { lettersOpen = false; setOpt('letter', ''); }}>Any</button>
      {#each LETTERS as L (L)}
        <button aria-pressed={eff.letter === L} disabled={!haveLetters.has(L)} onclick={() => { lettersOpen = false; setOpt('letter', L); }}>{L}</button>
      {/each}
    </div>
    <p class="hint">Greyed letters have no entries with your other settings.</p>
  </Sheet>
{/if}
