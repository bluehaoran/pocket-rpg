// About text for the rule systems, shown from the "?" on the New session page.
import type { RulesId } from './content/types.ts';

export interface RulesInfo {
  /** Author named in the "by" line, linked to `url`. */
  by: string;
  url: string;
  /** Paragraphs; text between underscores is italic. */
  paragraphs: string[];
}

export const RULES_INFO: Record<RulesId, RulesInfo> = {
  'lasers-feelings': {
    by: 'John Harper',
    url: 'https://lasersandfeelings.com/',
    paragraphs: [
      '_Lasers & Feelings_ is a quick-play roleplaying game, based on the songs of The Doubleclicks.',
      'One number, two checks (Lasers or Feelings).',
      '1-3d6'
    ]
  },
  'roll-for-shoes': {
    by: 'Ben Wray',
    url: 'https://rollforshoes.com',
    paragraphs: [
      'Roll for Shoes is a tabletop RPG "micro system" with a unique, evolving skill tree.',
      'Opposed rolls against the DM, and XP for failure.'
    ]
  }
};

/** Split `_italic_` markup into plain and italic runs. */
export const runs = (text: string): { t: string; em: boolean }[] =>
  text.split('_').map((t, i) => ({ t, em: i % 2 === 1 })).filter(r => r.t);
