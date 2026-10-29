<script lang="ts">
  import { onMount } from 'svelte';
  import { href } from '../lib/router.svelte.ts';
  import { createToolRun } from '../lib/toolrun.svelte.ts';
  import { countOpt, followOn, glyphRows, partOn, partOrderOn, segments, valueLabel } from '../lib/tools.ts';
  import Sheet from '../components/Sheet.svelte';
  import Crumb from '../components/Crumb.svelte';
  import Chips from '../components/Chips.svelte';
  import OnOff from '../components/OnOff.svelte';
  import Seg from '../components/Seg.svelte';
  import Stepper from '../components/Stepper.svelte';
  import Die from '../components/Die.svelte';
  import Icon from '../components/Icon.svelte';
  import Dock from '../components/Dock.svelte';

  let { toolId }: { toolId: string } = $props();

  const run = createToolRun(() => toolId);
  const { roll, setOpt, setFollow, rerollFollow } = run;
  const pack = $derived(run.pack);
  const tool = $derived(run.tool);
  const opts = $derived(run.opts);
  const eff = $derived(run.eff);
  const defs = $derived(run.defs);
  const result = $derived(run.result);
  const followUp = $derived(run.followUp);
  const rolls = $derived(run.rolls);
  const empty = $derived(run.empty);
  const hidden = $derived(run.hidden);
  const hasToggles = $derived(run.hasToggles);
  const countFirst = $derived(run.countFirst);
  const modsFirst = $derived(run.modsFirst);
  const dice = $derived(run.dice);
  const missing = $derived(run.missing);
  const haveLetters = $derived(run.haveLetters);

  let lettersOpen = $state(false);
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  onMount(() => {
    if (tool && !empty) roll();
  });
</script>

{#if !tool}
  <Crumb parent="Tools" href={href('/tools')} current="Unknown" />
  <div class="empty-card">No tool with id <code>{toolId}</code> in <code>content/tools/registry.json</code> or the active pack.</div>
{:else}
  <Crumb parent="Tools" href={href('/tools')} current={tool.label} />
  {#if tool.kind === 'gen'}
    <p class="hint">{pack?.genre ?? pack?.name} pack</p>
  {:else if tool.description}
    <p class="hint">{tool.description}</p>
  {/if}

{#snippet toggleGroups()}
{#if tool?.kind === 'list'}
  <div class="toggles">
    {#each tool.parts ?? [] as part (part.key)}
      <OnOff label={part.label} on={partOn(part, opts)} onchange={on => setOpt(part.key, on)} />
    {/each}
    {#if tool.followUp}
      <OnOff label={tool.followUp.label} on={followOn(tool, opts)} onchange={setFollow} />
    {/if}
  </div>
{/if}
{/snippet}

{#snippet countPicker()}
  {#if tool?.kind === 'list' && tool.count}
    <div class="group">
      <div class="eyebrow">How many</div>
      <Stepper compact label="how many" min={tool.count.min} max={tool.count.max}
        bind:value={() => countOpt(tool, opts), v => setOpt('count', v)} />
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
  {#if countFirst}{@render countPicker()}{/if}
  {#if modsFirst}{@render modifierGroups()}{/if}

  {#if empty}
    {#if hidden}
      <div class="empty-card">All entries are hidden. Unhide some in <a href={href(`/manage/${tool.kind === 'list' ? tool.list : ''}`)}>Manage Tools</a>.</div>
    {:else}
      <div class="empty-card">No entries yet. Add them to <code>content/tools/{tool.kind === 'list' ? tool.list : ''}.json</code>.</div>
    {/if}
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
          {#if result.kind === 'list' && result.caption}<div class="eyebrow">{result.caption}</div>{/if}
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
                onchange={e => { setOpt(orderPart.key + ':order', e.currentTarget.checked, false); run.replay(); }} />
              {orderPart.order.label}?
            </label>
          {/if}
          {#if tool.followUp && followUp}
            <button class="mini-btn" onclick={rerollFollow}>New {tool.followUp.label.toLowerCase()} <Icon name="reroll" /></button>
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

    {#if tool.kind === 'list' && !countFirst}{@render countPicker()}{/if}
  {/if}

  <Dock one>
    <button class="btn reroll" onclick={roll} disabled={empty || (tool.kind === 'gen' && missing.length > 0)}>Reroll <Icon name="reroll" /></button>
    <button class="btn" aria-label="Keep result" onclick={run.finish} disabled={!result}>
      <Icon name="check" size="30px" stroke={4} />
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

<style>
  .dock-note{grid-column:1/-1;margin:0;text-align:center;font-size:13px;line-height:1.3;color:var(--muted)}
  .d20{width:50px;height:50px;display:grid;place-items:center;border-radius:11px;background:var(--sunk);border:1px solid var(--line);font:700 20px/1 var(--f-mono)}
  .tres{background:var(--surface);border:2px solid var(--ink);border-radius:18px;padding:22px 18px 16px;display:flex;flex-direction:column;gap:12px;min-height:150px;justify-content:center;-webkit-user-select:none;user-select:none}
  .tbig{font:700 34px/1.2 var(--f-body);text-wrap:balance;overflow-wrap:anywhere}
  .tbig.num{font:700 72px/1 var(--f-mono);font-variant-numeric:tabular-nums}
  .tbig .xtra{color:var(--accent)}
  .tbig .ul{text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:6px}
  .rfoot{font:500 12px/1.3 var(--f-mono);color:var(--muted);display:flex;gap:4px 12px;flex-wrap:wrap}
  .rfoot .relax{color:var(--accent)}
  .underres{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 12px;margin-top:-12px}
  .underres .mini-btn{margin-left:auto}
  .letterbtn{all:unset;box-sizing:border-box;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;border:2px solid var(--line);border-radius:14px;background:var(--surface);padding:0 16px;min-height:58px;font:400 17px/1.3 var(--f-body)}
  .letterbtn:focus-visible{outline:var(--ring);outline-offset:2px}
  .letterbtn .v{font-size:20px;font-weight:700}
  .letterbtn .chev{color:var(--muted);font:700 18px/1 var(--f-mono)}
  .letters{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
  .letters button{min-height:50px;border-radius:10px;border:2px solid var(--line);background:var(--surface);font:700 19px var(--f-mono)}
  .letters button.any{grid-column:span 2;font-family:var(--f-body);font-size:16px}
  .letters button[aria-pressed="true"]{background:var(--sel);border-color:var(--sel);color:var(--sel-ink)}
  .letters button:disabled{opacity:.3;cursor:not-allowed}
  .checkrow{display:flex;align-items:center;gap:10px;min-height:44px;font-size:15px;color:var(--muted);cursor:pointer}
  .checkrow input{width:22px;height:22px;margin:0;accent-color:var(--sel);flex:none}
  .toggles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;align-items:start}
  .glyphs{display:flex;flex-direction:column;align-items:center;gap:.12em;font-size:clamp(44px,16vw,72px);line-height:1.15}
  .glyphs .grow{display:flex;justify-content:center;gap:.3em}
</style>
