// About text for the rule systems, shown from "Learn more?" on the New session page.
import type { RulesId } from './content/types.ts';

export interface RulesInfo {
  /** One line under the system's name on the New session page. */
  short: string;
  /** A longer plain-language description, shown under `short`. */
  more: string;
  /** Author named in the "by" line, linked to `url`. */
  by: string;
  url: string;
  /** Paragraphs; text between underscores is italic. */
  paragraphs: string[];
}

export const RULES_INFO: Record<RulesId, RulesInfo> = {
  'lasers-feelings': {
    short: 'One number, two checks · 1–3d6',
    more: 'Roll under your number for Lasers (logic, tech), over it for Feelings (people, instinct). Quick to learn; one-shot friendly. Genre hacks included.',
    by: 'John Harper',
    url: 'https://lasersandfeelings.com/',
    paragraphs: [
      '_Lasers & Feelings_ is a quick-play roleplaying game, based on the songs of The Doubleclicks.',
      'One number, two checks (Lasers or Feelings).',
      '1-3d6'
    ]
  },
  'roll-for-shoes': {
    short: 'Skill tree · level = d6 vs GM · XP on fail',
    more: 'Roll as many d6 as your skill level against the GM. All sixes earns a new skill; a miss earns XP. Settings are short, ready-made scenarios.',
    by: 'Ben Wray',
    url: 'https://rollforshoes.com',
    paragraphs: [
      'Roll for Shoes is a tabletop RPG "micro system" with a unique, evolving skill tree.',
      'Opposed rolls against the DM, and XP for failure.'
    ]
  },
  kintsugi: {
    short: 'One d6 at or under a skill · fail to grow',
    more: 'Play a robot, golem or mutant who can\'t die. Roll a d6 at or under a skill to succeed; failing teaches you new skills and strengthens old ones, until they wear out.',
    by: 'David Schirduan',
    url: 'https://technicalgrimoire.com/kintsugi',
    paragraphs: [
      '_Kintsugi_ is a Roll for Shoes hack where you play a robot, magical golem or mutant who can\'t die and quickly learns new skills.',
      'Roll one d6 at or under a skill. Failing grows you stronger. Licensed CC BY 4.0.'
    ]
  }
};

/** Split `_italic_` markup into plain and italic runs. */
export const runs = (text: string): { t: string; em: boolean }[] =>
  text.split('_').map((t, i) => ({ t, em: i % 2 === 1 })).filter(r => r.t);
