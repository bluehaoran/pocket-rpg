// About blurbs for the rule systems, shown from the "?" on the New session page.
// Official text, quoted with credit; see NOTICE. A summary, where present, is PocketRPG's own wording.
import type { RulesId } from './content/types.ts';

export interface RulesInfo {
  /** Paragraphs, quoted from the official page. */
  paragraphs: string[];
  /** Optional numbered rules, quoted from the official page. */
  rules?: string[];
  /** PocketRPG's own plain-language summary, shown apart from the quoted text. */
  summary?: string;
  credit: string;
  url: string;
}

export const RULES_INFO: Record<RulesId, RulesInfo> = {
  'lasers-feelings': {
    paragraphs: ['Lasers & Feelings is an easy game to learn.'],
    summary:
      'Each character has one number from 2 to 5. Roll under it for Lasers (logic, technology, calm), over it for Feelings (intuition, people, passion). Each die that succeeds counts; more successes, better outcome.',
    credit: 'Lasers & Feelings: original game by John Harper, web app by Jake Hamilton',
    url: 'https://lasersandfeelings.com/'
  },
  'roll-for-shoes': {
    paragraphs: ['Roll for Shoes is a tabletop RPG "micro system" created by Ben Wray, with these simple rules:'],
    rules: [
      'Say what you do and roll a number of D6s, determined by the level of relevant skill you have.',
      'If the sum of your roll is higher than an opposing roll, the thing you wanted to happen, happens.',
      'At start, you have only one skill: Do Anything 1.',
      'If you roll all 6s, you get a new skill specific to the action, one level higher than the one you used.',
      'For every roll you fail, you get 1 XP.',
      'XP can be used to change a die into a 6 for advancement purposes only.'
    ],
    credit: 'Roll for Shoes by Ben Wray (CC0)',
    url: 'https://rollforshoes.com'
  }
};
