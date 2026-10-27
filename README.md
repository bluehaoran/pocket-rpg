# PocketRPG

A phone tool for the GM of a story-heavy, crunch-light RPG played by conversation, for example in a car. The GM narrates; PocketRPG tracks the game state and supplies names, items, complications and dice results on demand, with no network.

- **Rules:** Lasers & Feelings (one data-driven engine covering its hacks) Roll for Shoes, and Kintsugi.
- **Content:** genre packs and a tools library as JSON in `content/`.
- **Platform:** installable, offline-first PWA.

Live: https://bluehaoran.github.io/pocket-rpg/ (deployed from `main`).

## Develop
```sh
npm install
npm run dev        # http://localhost:5173/pocket-rpg/
npm run ci         # validate content, typecheck, test, build
```
Node 22.18 or later.

## Docs
Specs and the build plan are in `docs/`. Start with `docs/06-build-plan.md`. A clickable mockup is at `docs/mockup/pocketrpg-mockup.html`.

## Licences
- **Code:** MIT (`LICENSE`).
- **Original content** (docs, tools library, Starfarers, base names): CC0 1.0 (`LICENSE-CONTENT`).
- **Third-party packs:** their own licences: Swords & Sorcery (CC BY-SA 4.0), Moon & Blood (CC BY 4.0), Roll for Shoes settings (CC0), Kintsugi (CC BY 4.0).

`NOTICE` has the details, attributions and changes. Two packs whose sources don't allow redistribution are kept out of the repo, in the gitignored `content/private/packs/`. Local builds include them when that folder exists.

Lasers & Feelings is by John Harper. Roll for Shoes is from rollforshoes.com. Kintsugi is by David Schirduan.
