// Content types. Source of truth for the shapes: docs/02-data-model.md (packs) and docs/05-tools-library.md (tools).
// JSON Schemas in schemas/ check structure; validate.ts checks cross-references.

export type TagValue = string | string[];

export interface Entry {
  v: string;
  tags?: Record<string, TagValue>;
  src?: string;
  data?: Record<string, unknown>;
  /** Tool lists used as a `part` only: where the entry goes relative to the main result. */
  position?: 'before' | 'after';
}

export interface ModifierDecl {
  label: string;
  values: string[];
  valueLabels?: Record<string, string>;
  [extra: string]: unknown;
}

export interface ModifierUse {
  key: string;
  required?: boolean;
  default?: string;
}

export interface Generator {
  id: string;
  label: string;
  modifiers?: ModifierUse[];
  output: string;
}

export type FieldKind = 'pick' | 'pick-or-text' | 'multi' | 'number' | 'text';

export interface Field {
  id: string;
  label: string;
  kind: FieldKind;
  table?: string | null;
  generator?: string;
  examples?: string;
  hint?: string;
  note?: string;
  count?: number;
  range?: [number, number];
  randomise?: string;
  /** Field ids whose current values filter this field's table entries (modifier key = field id). */
  filterBy?: string[];
  /** Inline pick list. Only used by the built-in fallback flavours, never by pack JSON. */
  values?: string[];
  skill?: { level: number };
  status?: { level: number; format?: string; optional?: boolean };
}

export interface Check {
  id: string;
  label: string;
  roll: 'under' | 'over';
  hint?: string;
}

export interface Outcome {
  successes: number;
  label: string;
  text?: string;
  picks?: string[];
}

export interface Resource {
  id: string;
  label: string;
  start: number;
  max: number;
  appliesTo?: Record<string, string>;
  states?: { lost: number; label: string; text: string }[];
  [extra: string]: unknown;
}

export interface LasersFeelingsFlavour {
  checks: Check[];
  numberRange?: [number, number];
  numberLabel?: string;
  numberRoll?: { dice: string; reroll?: number[]; note?: string };
  sentence?: string;
  fields: Field[];
  derived?: { id: string; label: string; formula: string; note?: string }[];
  resources?: Resource[];
  dice?: { base: number; bonuses?: { id: string; label: string; dice: number }[]; min: number; max: number };
  outcomes?: Outcome[];
  exact?: {
    name?: string;
    countsAsSuccess?: boolean;
    checks?: string;
    text?: string;
    options?: { id: string; label: string; text: string }[];
    questions?: string | string[];
  };
  help?: { text: string };
  /** Legacy location; read as a fallback, flagged by validation. */
  groupFields?: Field[];
  [extra: string]: unknown;
}

export interface RollForShoesFlavour {
  rootSkill?: string;
  fields: Field[];
  sentence?: string;
  starterSkills?: { table?: string; count?: number; max?: number; level?: number };
}

export interface Story {
  questions?: { id: string; text: string; table?: string | null }[];
  segments?: { name: string; text: string; tables?: string[] }[];
  note?: string;
}

export interface Seed {
  columns: { label: string; table: string; case?: 'lower' }[];
  template: string;
  [extra: string]: unknown;
}

export interface Pack {
  id: string;
  name: string;
  genre?: string;
  version: string;
  library?: boolean;
  nameSetting?: string;
  extends?: string[];
  provenance?: Record<string, unknown>;
  setting?: { premise?: string };
  modifiers?: Record<string, ModifierDecl>;
  tables: Record<string, Entry[]>;
  generators?: Generator[];
  seed?: Seed | null;
  story?: Story;
  groupFields?: Field[];
  flavour?: {
    'lasers-feelings'?: LasersFeelingsFlavour;
    'roll-for-shoes'?: RollForShoesFlavour;
  };
}

export interface ToolList {
  id: string;
  label: string;
  version: string;
  provenance?: Record<string, unknown>;
  modifiers: Record<string, ModifierDecl>;
  entries: Entry[];
  notes?: string;
}

export interface ToolPart {
  key: string;
  label: string;
  list: string;
  join?: string;
  default?: boolean;
  filterBy?: string[];
  order?: { label: string; default: boolean };
}

export interface ToolDef {
  id: string;
  label: string;
  kind: 'dice' | 'list';
  list?: string;
  dice?: { types: number[]; count: { min: number; max: number; default: number }; defaultType: number };
  modifiers?: ModifierUse[];
  parts?: ToolPart[];
  followUp?: { label: string; tool: string; join?: string; default?: boolean };
  count?: { min: number; max: number; default: number };
  join?: string;
  display?: 'text' | 'glyph';
}

export interface Registry {
  version: string;
  tools: ToolDef[];
}

export const RULES = {
  'lasers-feelings': 'Lasers & Feelings',
  'roll-for-shoes': 'Roll for Shoes'
} as const;
export type RulesId = keyof typeof RULES;
