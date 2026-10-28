// The state and actions behind one Tools page: the current result, the remembered options, the optional
// follow-up draw, and keeping a result in Tools History. ToolPage only renders it.
import { registry } from './content/index.ts';
import { go } from './router.svelte.ts';
import { app, mutate } from './session.svelte.ts';
import { toolCtx, toolPack } from './toolctx.svelte.ts';
import { buzz } from './device.ts';
import { availableLetters } from './engine/table.ts';
import {
  allHidden, diceOpts, drawFollowUp, effectiveOpts, entriesOf, findTool, followOn, historyText, isEmptyList, modDefs, rollTool,
  type ToolOpts, type ToolResult
} from './tools.ts';

/** Run `fn` inside `mutate` (it may draw from the session's no-repeat memory) and hand back what it returned. */
function inMutate<T>(fn: () => T): T {
  let value!: T;
  mutate(() => {
    value = fn();
  });
  return value;
}

/** Call while a component initialises. `toolId` is read lazily, so a changing prop is followed. */
export function createToolRun(toolId: () => string) {
  const pack = $derived(toolPack());
  const tool = $derived(findTool(toolId(), registry, pack));
  const opts = $derived<ToolOpts>(app.session?.toolModifiers[toolId()] ?? {});
  const eff = $derived(tool ? effectiveOpts(tool, opts, toolCtx()) : {});
  const defs = $derived(tool ? modDefs(tool, toolCtx()) : []);

  let result = $state<ToolResult | null>(null);
  let followUp = $state<string | null>(null);
  let rolls = $state(0);
  let logged = false;

  const empty = $derived(tool ? isEmptyList(tool, toolCtx()) : false);
  const hidden = $derived(tool ? allHidden(tool, toolCtx()) : false);
  const hasToggles = $derived(tool?.kind === 'list' && (!!tool.parts?.length || !!tool.followUp));
  const countFirst = $derived(tool?.kind === 'list' && tool.countFirst === true);
  const modsFirst = $derived(tool?.kind === 'list' && tool.modifiersFirst === true);
  const dice = $derived(tool?.kind === 'dice' ? diceOpts(tool, opts) : null);
  const missing = $derived(defs.filter(d => d.required && !eff[d.key]));
  const letterSel = $derived.by(() => {
    const sel: Record<string, string> = {};
    for (const d of defs) if (d.key !== 'letter' && typeof eff[d.key] === 'string' && eff[d.key]) sel[d.key] = eff[d.key] as string;
    return sel;
  });

  const haveLetters = $derived(tool && tool.kind === 'list' ? availableLetters(entriesOf(tool, toolCtx()), letterSel) : new Set<string>());

  function roll() {
    if (!tool) return;
    result = inMutate(() => rollTool(tool, opts, toolCtx(), result));
    rolls++;
    if (result) buzz();
    followUp = result && tool.kind === 'list' && followOn(tool, opts) ? inMutate(() => drawFollowUp(tool, toolCtx(), null)) : null;
  }

  function setOpt(key: string, value: string | number | boolean, reroll = true) {
    mutate(s => {
      s.toolModifiers[toolId()] = { ...(s.toolModifiers[toolId()] ?? {}), [key]: value };
    });
    if (reroll) roll();
  }

  /** Turning the follow-up on or off leaves the main result alone. */
  function setFollow(on: boolean) {
    setOpt('followUp', on, false);
    followUp = on && result && tool?.kind === 'list' ? inMutate(() => drawFollowUp(tool, toolCtx(), null)) : null;
    rolls++;
  }

  function rerollFollow() {
    if (tool?.kind !== 'list') return;
    const prev = followUp;
    followUp = inMutate(() => drawFollowUp(tool, toolCtx(), prev));
    rolls++;
    buzz();
  }

  /** Replay the result's entrance animation, e.g. after an option changed how it reads. */
  function replay() {
    rolls++;
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
        tool: toolId(),
        label: tool.label,
        text: tool.kind === 'dice' ? `${r.text} (${r.kind === 'dice' ? r.note : ''})` : historyText(tool, r, followUp, opts),
        ...(Object.keys(modifiers).length ? { modifiers } : {}),
        ...(r.kind !== 'dice' && r.relaxed ? { relaxed: true } : {})
      });
    });
  }

  /** Keep the result and go back to the Tools hub. */
  function finish() {
    keep();
    go('/tools');
  }

  return {
    get pack() { return pack; },
    get tool() { return tool; },
    get opts() { return opts; },
    get eff() { return eff; },
    get defs() { return defs; },
    get result() { return result; },
    get followUp() { return followUp; },
    /** Bumps on every roll, so the result can replay its entrance animation. */
    get rolls() { return rolls; },
    get empty() { return empty; },
    get hidden() { return hidden; },
    get hasToggles() { return hasToggles; },
    get countFirst() { return countFirst; },
    get modsFirst() { return modsFirst; },
    get dice() { return dice; },
    /** Required modifiers still unset. */
    get missing() { return missing; },
    /** Letters that still have entries under the other filters. */
    get haveLetters() { return haveLetters; },
    roll, setOpt, setFollow, rerollFollow, replay, keep, finish
  };
}
