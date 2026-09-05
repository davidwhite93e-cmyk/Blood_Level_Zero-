# Blood Level Zero

A first-person, System-driven vampire sandbox. You wake up newly Embraced, with no sire, no coven, and a hunger that won't quit — a diegetic "System" tracks your Hunger, Humanity, and Notoriety as you feed your way through a fictional modern city. See [`docs/design-doc.md`](docs/design-doc.md) for the original creative brief.

**Status: complete and finishable.** A full run is about six in-game nights, and it ends — there are **eight distinct endings**, reached according to how you fed, who you trusted, and what you were holding when the last night landed. Nothing is gated behind a menu choice at the end; every ending is the accumulated consequence of ordinary decisions made hours earlier.

## Play it

Open `index.html` in any browser. It's a single self-contained file — no server, no build step, no account, and no network call required to play. Or run `npm run dev` to build fresh and serve it locally.

Progress **saves automatically to your browser** at every step, so you can close the tab and pick the run back up later. Reopening offers *Continue* or *Start over*; finishing a run clears the checkpoint.

The only thing the page ever fetches at runtime is two webfonts from Google Fonts, and the CSS declares real fallback stacks — offline, the game plays identically in Georgia and your system monospace. The title-screen photography and portrait art are licensed images embedded directly in the file at build time (see [`web/assets/CREDITS.md`](web/assets/CREDITS.md)) — nothing is fetched from an image host while playing.

## What's in it

**Six nights, then a reckoning.** You hunt, feed, and manage three stats across a hub city. Dawn closes each night; by the sixth, everything you've set moving arrives at once. Crossing a critical threshold early — Humanity bottoming out, Notoriety maxing, the Court deciding about you — pulls the endgame forward.

**Eight endings.** The Beast, Destroyed, Court-Bound, Kestrel's Childe, The Anchor, Ghost, Throne Room, and The Open Road. That last one matters as much as the extremes: a player who didn't lean hard into any one system gets a real, specific epilogue rather than a shrug.

**Seven recurring characters,** each with an arc and a stake in at least one ending:

| | |
|---|---|
| **Mira Castellan** | Midtown bartender. Mortal. Will lie to a detective for you before she knows what you are. |
| **Kestrel** | An old Kindred loner on the Docks who lost a childe sixty years ago and has not taught anyone since. |
| **Det. Adaeze Okafor** | Major Crimes. Eleven survivors, no bodies, and nineteen years of patience. |
| **Junie** | Your younger sister, who has called nine times and does not know you died. |
| **Sable** | A rival fledgling embraced the same night, same way, by the same absent nobody. |
| **Voss** | The Hollow Court's enforcer. Keeps the borders. Better than you. |
| **Provost Ilse Corven** | Speaks for the Hollow Court. Does the crossword while she decides about you. |

No NPC is disposable — even one-scene victims have names, details, and consequences.

**Six powers, tiered.** They surface from *how you played*, never from a skill shop, and are announced through the System-pulse UI:

`Hollow Step` (I–III) · `Grave Strength` (I–III) · `Wake-Sense` (I–II) · `Still Voice` (I–II) · `Blood Memory` (I–II) · `Cold Vigil` (I–II)

> These replace the original slice's `Obfuscate` / `Potence` / `Auspex`, which were distinctive *Vampire: The Masquerade* terminology. The rename was made deliberately, at the repo owner's direction — see [`CLAUDE.md`](CLAUDE.md) for the reasoning.

**Territory and factions with weight.** Midtown can be claimed — contested first, then held the slow way or the fast way, with different costs — and claimed ground reduces the heat your feeding draws there. The Hollow Court is a standing you build across nights toward the Court-Bound and Throne Room endings, and Okafor's investigation escalates from chalk marks to a confrontation you can talk your way out of if you've built the voice for it.

**A choice of who you were, and how you look.** The title screen asks the System to reconstruct your prior occupation — ER nurse, line cook, or night security — and lets you pick a name and one of four subject-visual photographs. Both persist through the whole run and show up in the masthead.

**A phone, with real contacts.** A sidebar Phone button (`StoryMenu`, so it's genuinely persistent in real Twine, not just a UI overlay) opens a contacts list — Junie, Det. Okafor (once you have her card), Sable, and Mira each become reachable as the story unlocks them, with call outcomes that reflect what's actually happened (Sable's number goes dead if you told them to leave town; Okafor's case notes shift if you've already talked to her in person). Kestrel is listed too, correctly, as someone who doesn't carry a phone. It hides itself once the endgame starts — there's no one left to call mid-climax.

Content boundaries: grounded horror, predatory tension, and consequence. No sexual content.

## How it's built

**`src/story.twee` is the canonical deliverable.** It's written in real [Twee3](https://github.com/iftechfoundation/twine-specs/blob/master/twee-3-specification.md) notation and can be **imported directly into [Twine 2](https://twinery.org/)** (desktop or web) via *Import From File* — using the real, bundled SugarCube 2 story format, not a lookalike. Everything in it is standard SugarCube syntax: `<<set>>`, `<<if>>/<<elseif>>/<<else>>/<</if>>`, `<<run>>`, `<<print>>`, `<<include>>`, `<<textbox>>`, naked `$variable` interpolation, `[[Link->Target]]` links (including image links — several passages use `[[<img src="...">→Target]]` for the portrait picker), and the special `StoryCaption`/`StoryMenu` passages SugarCube itself recognizes for a persistent sidebar. All five embedded images (the title photo and four portraits) are inlined as base64 `data:` URIs directly in passage bodies — the `.twee` file has zero external file dependencies, in Twine or anywhere else.

That sidebar is real: `StoryCaption` renders your name, portrait, and live Hunger/Humanity/Notoriety/powers on every passage; `StoryMenu` carries the persistent "☎ Contacts" link into `PhoneContacts`, a hub passage that lists Junie/Okafor/Sable/Mira/Kestrel with state-driven availability — the same logic, expressed as plain `<<if>>` chains so it's inspectable as prose, not hidden in application code.

**A secondary, standalone build also exists**, for playing without Twine: [`src/engine.js`](src/engine.js) is a small hand-written interpreter for a *subset* of that same syntax, and [`tools/build.js`](tools/build.js) stitches it together with `src/story.twee` and the page shell in [`web/template.html`](web/template.html) into a single self-contained `index.html`. That subset doesn't include `<<textbox>>`, `StoryCaption`, or `StoryMenu` — real SugarCube features this project now uses for its sidebar and name entry — so in the standalone build those are silently inert (per the engine's documented behavior for unrecognized macros) and the equivalent UI is instead hand-built in `web/template.html`'s own JS controller. **If you're only keeping one file, keep `src/story.twee`** — it's complete on its own in real Twine; `index.html` is a convenience build for people who don't want to install Twine.

Endings are marked with a Twee `[ending]` tag. In real Twine that's just a passage tag; the standalone engine also surfaces passage tags, which is how its UI shows the end-of-run card and how the test suite knows a passage with no onward links is a legitimate terminal rather than a dead end.

**Keep authoring in real SugarCube syntax regardless of which build you extend.** If you add a macro `src/engine.js` doesn't understand, the standalone build will silently skip it (not crash) while real Twine renders it correctly — that divergence is expected for `StoryCaption`/`StoryMenu`/`<<textbox>>` already; check `src/engine.js`'s macro list before assuming new syntax will show up in both places.

## Scripts

```
npm run build          # rebuild index.html from src/ + web/template.html
npm run validate       # every [[link]] and <<include>> resolves; <<if>>/<</if>> balance
npm run coverage       # render every passage directly, in both unlocked and default state
npm run playthroughs   # simulate careful / reckless / random runs headless; every run must reach an ending
npm run endings        # prove all 8 endings are reachable, by driving the endgame from real state profiles
npm run smoke          # play the built index.html in headless Chromium for real, through to an ending
npm test               # validate + coverage + playthroughs + endings
```

Run `npm test` after any change to `src/story.twee` or `src/engine.js`, and before committing.

`npm run smoke` is the only script with a dependency — install it with `npm i -D playwright`. Everything else, including the build and the whole `npm test` suite, runs on a bare Node install with no packages at all. If your environment ships a Chromium that doesn't match the installed Playwright build, point the smoke test at it: `BLZ_CHROMIUM=/path/to/chrome npm run smoke`.

The test suite is load-bearing, not decorative: `playthroughs` fails if any simulated run wanders without converging on an ending, and `endings` fails if a newly added `[ending]` passage has no proven route to it. Extend them as you add content.

## Repo layout

```
src/story.twee          THE canonical deliverable — real Twine2/SugarCube2, 141 passages,
                        self-contained (5 images embedded as base64), importable as-is
src/engine.js           standalone-build interpreter (a SugarCube subset — see "How it's built")
web/template.html       standalone-build page shell: CSS, HTML structure, save system, controller JS
web/assets/             source images for the standalone build's embed step, + CREDITS.md
tools/build.js          assembles the standalone index.html (engine + story + template + images)
tools/validate_links.js, coverage_check.js, test_harness.js, endings_check.js, smoke_test.js   QA scripts
index.html              standalone build output (generated, but committed) — a convenience,
                        not the deliverable; src/story.twee is complete without it
docs/design-doc.md      original creative brief
CLAUDE.md               the brief this build was made against — kept as project history
```

## License

Private project — all rights reserved. Not currently licensed for reuse.
