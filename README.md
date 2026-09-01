# Blood Level Zero

A first-person, System-driven vampire sandbox. You wake up newly Embraced, with no sire, no coven, and a hunger that won't quit — a diegetic "System" tracks your Hunger, Humanity, and Notoriety as you feed your way through a fictional modern city. See [`docs/design-doc.md`](docs/design-doc.md) for the full creative brief.

**Status: playable vertical slice.** One tutorial + a hub city with three districts (Midtown Lights, The Docks, Ashgrove Hollow), three recurring NPCs, three unlockable Disciplines, and reactive Hunger/Humanity/Heat systems — but the story doesn't yet run to a real ending, the cast and systems are intentionally minimal, and there's no artwork. **[`CLAUDE.md`](CLAUDE.md) is the brief for building the full version** — read that if you're picking this project up.

## Play it

Open `index.html` in any browser — it's a single self-contained file, no server or build step required to *play*. Or run `npm run dev` to build fresh and serve it locally.

## How it's built

The story lives in [`src/story.twee`](src/story.twee), written in real [Twee3](https://github.com/iftechfoundation/twine-specs/blob/master/twee-3-specification.md) notation using a subset of [SugarCube 2](https://www.motoslave.net/sugarcube/2/docs/) macros (`<<set>>`, `<<if>>/<<elseif>>/<<else>>/<</if>>`, `<<run>>`, `<<print>>`, `<<include>>`, naked `$variable` interpolation, `[[Link->Target]]` links). That means:

- It can be **imported directly into [Twine 2](https://twinery.org/)** (desktop or web) via *Import From File* and edited visually there, using the bundled SugarCube story format.
- It's also interpreted by a small hand-written engine, [`src/engine.js`](src/engine.js) — a ~300-line parser/runtime for exactly that macro subset — so the same source file also runs standalone with no Twine runtime dependency and no external libraries.

[`web/template.html`](web/template.html) is the page shell (fonts, CSS, the stat-gauge/choice-button UI, the controller script). [`tools/build.js`](tools/build.js) stitches `src/engine.js` + `src/story.twee` + `web/template.html` into the single-file `index.html` at the repo root.

**Keep authoring in real SugarCube syntax.** If you add a macro `engine.js` doesn't understand, both the custom interpreter *and* real Twine will silently misbehave differently — check `src/engine.js`'s macro list before reaching for new syntax, and extend the interpreter alongside the story content.

## Scripts

```
npm run build         # rebuild index.html from src/ + web/template.html
npm run validate       # every [[link]] and <<include>> resolves to a real passage; <<if>>/<</if>> balance
npm run coverage       # render every passage directly (with all discipline/relationship flags forced on) and catch macro/expression errors
npm run playthroughs   # simulate careful / reckless / random playthroughs (headless, no browser) and catch dead ends or runtime errors
npm run smoke          # load the built index.html in headless Chromium (Playwright) and click through it for real, catching console/page errors
npm test               # validate + coverage + playthroughs
```

Run `npm test` (and ideally `npm run smoke`, which needs Playwright + a Chromium binary) after any change to `src/story.twee` or `src/engine.js`, and before committing.

## Repo layout

```
src/story.twee        canonical narrative source (Twee3 / SugarCube subset)
src/engine.js          the interpreter that runs it standalone
web/template.html       page shell: CSS, HTML structure, controller JS
tools/build.js          assembles index.html
tools/validate_links.js, coverage_check.js, test_harness.js, smoke_test.js   QA scripts, see above
index.html              built output — the actual playable game (generated, but committed for GitHub Pages / direct download)
docs/design-doc.md      original creative brief
docs/screenshot-*.png   reference screenshots of the current build
CLAUDE.md               brief for building the full version — read this first if extending the project
```

## License

Private project — all rights reserved. Not currently licensed for reuse.
