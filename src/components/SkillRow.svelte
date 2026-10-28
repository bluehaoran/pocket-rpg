<script lang="ts">
  // One row of a skill list: a button when it has an `onclick`, otherwise a plain div. The layout is a
  // grid of [glyph] [name + note] [level] [chevron | Roll | nothing]; `mods` adds variant classes
  // (root, child, earned, status, sroll).
  let {
    name, nameEmpty = false, note, level, unit, levelClass = '', glyph = '', trail = 'blank', mods = '', out = false, depth,
    disabled = false, onclick
  }: {
    name: string;
    /** Dim italic name, for a placeholder such as "Name this skill". */
    nameEmpty?: boolean;
    /** Small caps line under the name. */
    note?: string;
    level: string | number;
    /** Small text after the level, e.g. "d6". */
    unit?: string;
    levelClass?: string;
    /** Tree glyph before the name ("└", "!"). */
    glyph?: string;
    /** What ends the row: a › chevron, a Roll pill, or an empty cell. `none` also drops the glyph cell (root rows). */
    trail?: 'chev' | 'go' | 'blank' | 'none';
    mods?: string;
    out?: boolean;
    /** Indent level in a skill tree. */
    depth?: number;
    disabled?: boolean;
    onclick?: () => void;
  } = $props();

  const style = $derived(depth == null ? undefined : `--dep:${depth}`);
</script>

{#snippet body()}
  {#if trail !== 'none'}<span class="tw" aria-hidden="true">{glyph}</span>{/if}
  <span class="sn" class:empty={nameEmpty}>{name}{#if note}<small>{note}</small>{/if}</span>
  <span class="lv {levelClass}">{level}{#if unit}<small>{unit}</small>{/if}</span>
  {#if trail === 'chev'}<span class="chev" aria-hidden="true">›</span>{:else if trail === 'go'}<span class="go">Roll</span>{:else if trail === 'blank'}<span></span>{/if}
{/snippet}

{#if onclick}
  <button class="skill {mods}" class:out {style} {disabled} {onclick}>{@render body()}</button>
{:else}
  <div class="skill {mods}" class:out {style}>{@render body()}</div>
{/if}

<style>
  .skill{all:unset;box-sizing:border-box;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:10px;align-items:center;min-height:58px;padding:8px 0;border-top:1px solid var(--line);font:700 18px/1.25 var(--f-body)}
  .skill:first-child{border-top:0}
  .skill.root{grid-template-columns:minmax(0,1fr) auto}
  button.skill{cursor:pointer}
  button.skill:focus-visible{outline:var(--ring);outline-offset:2px;border-radius:6px}
  .skill .sn{min-width:0}
  .skill.child .sn{color:var(--accent)}
  .skill .sn.empty{color:var(--muted);font-style:italic;font-weight:400}
  .skill .tw{color:var(--muted);font:500 18px/1 var(--f-mono);padding-left:6px}
  .skill .lv{display:flex;align-items:baseline;gap:2px;padding:7px 10px;border-radius:9px;background:var(--sunk);font:700 20px/1 var(--f-mono)}
  .skill .lv small{font-size:12px;color:var(--muted)}
  .skill .chev{color:var(--muted);font:700 18px/1 var(--f-mono)}
  .skill .sn small{display:block;font:400 12px/1.3 var(--f-body);color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:2px}
  .skill.status .tw{color:var(--accent)}
  .skill .lv.neg{color:var(--accent)}
  .skill.sroll{cursor:pointer;grid-template-columns:auto minmax(0,1fr) auto auto;padding-left:calc(var(--dep,0) * 18px)}
  .skill.sroll .go{font:800 15px/1 var(--f-display);text-transform:uppercase;letter-spacing:.08em;color:var(--accent-ink);background:var(--accent);padding:9px 12px;border-radius:9px}
  .skill.sroll:disabled{opacity:.5;cursor:not-allowed}
  .skill.earned .tw{padding-left:calc((var(--dep,1) - 1) * 18px + 6px)}
  .skill.out .sn{text-decoration:line-through;color:var(--muted)}
  .skill.out .sn small{text-decoration:none}
</style>
