// About blurbs for the rule systems, shown from the "?" on the New session page.
// Official text, quoted with credit; see NOTICE.
import type { RulesId } from './content/types.ts';

export interface RulesInfo {
  /** Paragraphs, quoted from the official page. */
  paragraphs: string[];
  /** Optional numbered rules, quoted from the official page. */
  rules?: string[];
  credit: string;
  url: string;
}

export const RULES_INFO: Record<RulesId, RulesInfo> = {
  'lasers-feelings': {
    paragraphs: [
      'Lasers & Feelings is a quick-play roleplaying game, based on the songs of The Doubleclicks.',
      'You are the crew of the interstellar scout ship Raptor. Your mission is to explore uncharted regions of space, deal with aliens both friendly and deadly, and defend the Consortium worlds against space dangers.',
      'Captain Darcy has been overcome by the strange psychic entity known as Something Else, leaving you to fend for yourselves while he recovers in a medical pod.',
      'What happens next? Play to find out!'
    ],
    credit: 'Lasers & Feelings by John Harper',
    url: 'https://johnharper.itch.io/lasers-feelings'
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
