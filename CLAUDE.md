# Building the final version of Blood Level Zero

You're picking up a playable vertical slice of a horror-vampire sandbox and taking it to a real, finishable game. This file is your brief. Read `README.md` first for how the project is built, then `docs/design-doc.md` for the original creative brief, then this file for what's left to do.

Play the current build (`index.html`) before changing anything, and run `npm test` so you know what "still passing" means before you start.

## Heads-up before you touch content: rename the Disciplines

`Obfuscate`, `Potence`, and `Auspex` — and the term "Discipline" itself for vampire powers — are distinctive terminology from White Wolf/Paradox Interactive's *Vampire: The Masquerade*. The original design doc didn't reference that game, and this project isn't a licensed tie-in, so carrying those exact names into a public GitHub repo is a real (if modest) trademark-flavored risk, not just a style nitpick.

Default to renaming them to original terms as you expand the power system — e.g. `Obfuscate → Fade` or `Hollow Step`, `Potence → Grave Strength`, `Auspex → Wake-Sense` (or your own equivalents) — and keep whatever generic umbrella term you like ("Disciplines" is a plain enough word on its own; it's the specific power names that are the risk). Update `src/story.twee`, `src/engine.js`'s `SystemCheck`-equivalent logic, and `web/template.html`'s discipline tag rendering together. If the repo owner would rather keep the Vampire: The Masquerade-flavored names for a private, non-commercial project, that's their call to make explicitly — don't assume it silently either way if you're unsure; a code comment flagging the decision is enough if you keep them.

## What exists now

- `src/story.twee` — the whole narrative graph, ~56 content passages, in real [Twee3](https://github.com/iftechfoundation/twine-specs/blob/master/twee-3-specification.md)/[SugarCube 2](https://www.motoslave.net/sugarcube/2/docs/) syntax. One tutorial feed, a hub (`TheCityHub`), three districts (Midtown Lights, The Docks, Ashgrove Hollow), three NPCs (Mira, Kestrel, Detective Okafor), three Disciplines, a frenzy failure state, a hunter-ambush failure state, and a soft "nightly summary" checkpoint (`NightReflection`) that loops back to the hub. **There is no real ending** — the sandbox just continues indefinitely.
- `src/engine.js` — the hand-written interpreter. It supports exactly: `<<set $x to EXPR>>`, `<<run STMT>>`, `<<if>>/<<elseif>>/<<else>>/<</if>>`, `<<print EXPR>>`, `<<include "Passage">>`, naked `$var`/`$var.prop` interpolation, `''bold''`, `[[Text->Target]]` links, and raw HTML passthrough. Nothing else. If you write a macro it doesn't know, it's silently skipped — that's a footgun, not a feature; extend the interpreter in lockstep with new syntax you introduce, and prefer real SugarCube syntax so the `.twee` stays importable into actual Twine.
- `web/template.html` — the whole UI: fonts (Spectral + JetBrains Mono via Google Fonts), the dark case-file/terminal visual language, the Hunger/Humanity/Notoriety tick-gauges, the Disciplines tag row, choice buttons, the ambient grain overlay.
- `tools/*.js` — link/include validation, full-passage render coverage (with all flags forced on), simulated careful/reckless/random playthroughs, and a Playwright smoke test that actually clicks through the built page in headless Chromium. All four currently pass clean. **Extend these as you add content — don't let them go stale.** A broken link or an unreachable ending is exactly the class of bug these scripts exist to catch before a human ever has to find it by playing.

Nothing here talks to a backend. It's a static site — keep it that way unless you have a specific, justified reason not to (see Images below for the one place a build step is worth adding).

## The job: take it to completion

### 1. Finish the story, with multiple real endings

Right now there's no arc — just a sandbox loop. Give it one, without losing the sandbox feel during play. A workable shape:

- Track story-length pacing explicitly — e.g. a `$nightsPassed` counter incremented each time the player passes through `NightReflection` (rename/restructure that passage as needed). Somewhere around night 5–8, or sooner if a stat crosses a critical threshold first (Humanity hits 0, Heat hits 100 and survives, a faction standing maxes out), the game should transition into a converging "endgame" sequence rather than looping forever.
- Build toward **at least six to eight distinct endings**, gated by the state the player has actually accumulated — not a menu choice bolted on at the end. Suggested spread (rename/adjust freely, but keep the variety of *tone*, not just difficulty):
  - **The Beast** — Humanity collapses to near 0 (repeated frenzies, no restraint). You stop being someone who happens to be a vampire.
  - **Destroyed** — Heat maxes out and the player *loses* the climactic hunter confrontation. This needs a real failure state — right now `HunterAmbush` always ends in the player escaping (at a cost); the endgame version should have genuine stakes if the player is under-prepared (low Discipline count, no allies, Heat left unchecked too long).
  - **Court-Bound** — high standing with the Hollow Court; the player submits to/joins them, becomes bound to a hierarchy instead of free.
  - **Kestrel's Childe** — Kestrel standing maxed; formal induction into wider Kindred society, with the obligations that come with it.
  - **The Anchor** — Humanity stays high, strong bond with a mortal (Mira and/or the new sibling NPC below); the player chooses to protect what's left of who they were over raw power.
  - **Ghost** — heavy investment in the stealth/Obfuscate-equivalent Discipline, low Heat; the player vanishes from every system that was tracking them. Ambiguous, unresolved-on-purpose.
  - **Throne Room** — high Heat *and* high power, the player wins rather than hides — defeats or supplants the Hollow Court rival and claims territory outright.
  - **Open Road** — a balanced or ambiguous stat spread. This one matters as much as the extreme endings: a player who didn't lean hard into any one system deserves a real, specific epilogue, not "sorry, no ending qualified."
- Every ending should read as a consequence of specific choices, not a stat-check dead end. Write toward the ending states, don't just gate a generic "The End" screen behind different numbers.
- Extend `tools/test_harness.js` (or add a dedicated script) to confirm **every ending is actually reachable** by some combination of choices, and wire that into `npm test`.

### 2. Give territory and factions real mechanical weight

Right now districts are flavor plus a feeding location. Make "claimed/contested/unclaimed" mean something:

- Let the player actually contest or claim ground (Midtown at minimum) once they've built enough standing/Heat-management there — claimed territory could reduce Heat gain from feeding there, unlock unique encounters, or attract rival attention.
- Turn the Hollow Court from a one-off encounter into a recurring faction thread with its own standing variable (distinct from the current one-shot `hollowResolved` flag) that develops across multiple nights and feeds into the Court-Bound / Throne Room endings.
- If it serves the sandbox feel, a faction thread for Okafor's investigation (escalating from "rumors" to "active pursuit" to the endgame confrontation) is a natural second axis — she's underused as a one-encounter obstacle right now.

### 3. Expand the cast

Three recurring NPCs (Mira, Kestrel, Okafor) isn't enough for a cast that's supposed to have "their own agendas, memory, and reactions." Grow it to **5–8 named recurring characters**, each with a small arc and a real stake in at least one ending. Beyond deepening the existing three, consider:

- A rival fledgling — embraced around the same time, unknown sire, competing for the same hunting grounds. A mirror for what an unchecked reckless path looks like.
- Someone from the player's old life who doesn't know what happened to them (a sibling, a partner, a close friend) — raises the stakes on Humanity and gives "The Anchor" ending an emotional anchor beyond Mira alone.
- A named Hollow Court enforcer/rival (currently just "the enforcer") and, gating the higher-tier Court endings, someone who actually leads the Court.
- Keep the existing content boundary from the design doc: **no sexual content**, and no NPC — mortal or Kindred, major or one-scene — is purely disposable. Even a one-passage victim gets a name, a detail, a consequence.

### 4. Expand the power system (post-rename)

Three powers is thin for a game about "rising in power." Grow to **5–6**, each with 2–3 tiers so growth feels continuous rather than three binary unlocks. Keep the existing unlock philosophy — powers surface from *how you played*, not a skill-point shop — and keep announcing unlocks through the diegetic System-pulse UI, which is the whole visual identity of this game; don't replace it with a conventional XP bar.

### 5. Integrate stock images — carefully, and not at the cost of leaking keys or breaking offline play

Photography for district headers, key NPC "portraits" (moody, non-literal — think silhouette/environmental, not stock headshots pretending to be your named characters), and maybe System-chrome texture would sell the "grounded urban horror" tone a lot harder than CSS alone.

**Do this at build time, not runtime.** A client-side game calling an image API live means shipping an API key to every visitor's browser (instantly stolen/rate-limited) and means the game breaks offline or if the API is down. Instead:

1. Get free developer API keys from [Unsplash](https://unsplash.com/developers) and/or [Pexels](https://www.pexels.com/api/) (both free; Unsplash's demo tier is rate-limited to 50 requests/hour, production approval raises that to 1,000/hour; Pexels' free tier's limits can be lifted by providing attribution). Store keys in a local `.env` (already covered by `.gitignore` — see below), never commit them, never hardcode them into any file that ships to the browser.
2. Write a build-time script (e.g. `tools/fetch-images.js`, run manually or as a separate `npm run fetch-images`, *not* part of the default `npm run build`) that queries curated search terms per scene/character/district, lets you pick or pins specific photo IDs, downloads the chosen images into `public/images/`, and writes an attribution manifest (`public/images/CREDITS.md` or `.json`) with photographer name + link per photo.
3. **Attribution matters and differs by source:** Unsplash's general photo license doesn't require attribution to use a photo, but Unsplash's *API* Guidelines require attribution (photographer + Unsplash) and pinging the API's download-tracking endpoint as a condition of using the API at all — do both if you use the Unsplash API. Pexels doesn't require attribution but asks for it "when possible" (e.g. "Photo by [name] on Pexels") in exchange for lifted rate limits. Build the credits file either way; surface it somewhere in the game (an "about/credits" passage or footer link is enough).
4. Reference only the local downloaded files from `src/story.twee`/`web/template.html` — never a live API URL — so the shipped game has zero runtime network dependency and zero exposed secrets.
5. **Ship a no-image-key fallback.** Not everyone picking this repo up will want to set up API keys before they can even build it. If `public/images/` is empty or a given scene has no matching downloaded image, fall back to the current CSS-only atmospheric treatment (grain overlay, gradients, type) rather than a broken `<img>` tag. The game must build and play with zero external services configured.
6. Keep images purposeful and sparse — this is a text-forward horror game with a deliberately clinical/literary visual identity (see `web/template.html`'s existing design language: Spectral serif + JetBrains Mono, deep oxidized reds, cold desaturated teal-grey system chrome, sharp edges, no rounded cards). Don't let stock photography turn it into a generic photo-collage; a handful of well-chosen, desaturated/duotoned district and mood images will do more than a photo on every passage.

Add a `.env.example` (with `UNSPLASH_ACCESS_KEY=` / `PEXELS_API_KEY=` placeholders, no real values) and confirm `.env` itself is git-ignored.

### 6. Search online as needed

You have web search — use it for:

- Sourcing and picking the actual stock images (above).
- Grounding specific factual details you introduce (police procedure flavor for Okafor's thread, real-world texture for the city) — enough to sound credible, not a research paper; this is fiction.
- Checking current API terms/rate limits for whichever image service(s) you use, since those change over time and the summary above is a snapshot from when this brief was written.

Don't research vampire fiction tropes to copy dialogue or plot beats from existing IP — the tone (grounded, not campy, power-with-cost) is specified in `docs/design-doc.md`; write toward that brief, not toward any particular existing show/game/book.

## Non-negotiables (carried over from the original design doc)

- No sexual content.
- No NPC is purely disposable prey — mortal or Kindred, named or one-scene.
- Grounded horror tone: predatory tension, not camp, not romanticized. Power costs something, always.
- Stays a static site buildable with `npm run build` and playable by opening `index.html` — no required account, backend, or live network call to play.
- The `.twee` source stays honest Twee3/SugarCube syntax importable into real Twine — don't drift the engine and the story out of sync with each other, and don't invent macro syntax that only your interpreter understands without a strong reason.

## QA — extend, don't skip

Before you consider anything done:

- `npm test` (link/include validation + full-passage render coverage + simulated playthroughs) passes with zero errors.
- Every ending is confirmed reachable by at least one automated playthrough path.
- `npm run smoke` (real headless-browser click-through) passes with zero console/page errors on a fresh build.
- New passages follow the existing pattern: stat mutations at the top of the destination passage via `<<set>>`, not inline in links; shared unlock/warning logic lives in an `<<include>>`d passage like the current `SystemCheck`, not copy-pasted everywhere.
- If you add the image pipeline, confirm the game still builds and plays with no `.env`/API keys configured at all (the fallback path).

## Wrapping up

Update `README.md` to reflect the real state of the game once it's done (drop the "vertical slice" framing, list the actual ending count, cast, and Discipline-equivalent roster). Leave this file (`CLAUDE.md`) in place as project history rather than deleting it — future work on the repo benefits from knowing what the brief was and why the Discipline names changed.
