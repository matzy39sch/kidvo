# Workshop of Why

An offline science workshop for kidvo, where children investigate a question
and practise checking AI suggestions. Mira the craftsperson and Tavi the paper
bird are original story characters. Practice AI is a separate labelled tool
with entirely prewritten answers.

## Playing and learning

Choose a door, move Tavi to an object, and follow small conversational questions.
A mistaken or uncertain reply opens a smaller checkpoint. A correct reply
continues the story. There is no timer or score penalty.

| Investigation | Steps | What the child explores |
| --- | --- | --- |
| Why is the sky blue? | 7 | Daylight, prism colours, blue/red scattering |
| How does a mirror bounce light? | 6 | Metal coating, glass, mirror → table → eyes |
| Why does water form a whirlpool? | 6 | Stirring, draining, refilling and comparing directions |

Drag with a mouse, tap the scene, use arrow keys or the labelled object buttons.
The basin opens a close view with stirring, Drain and Refill controls.
Doors returns to the selector without recording a completion.
English, Hungarian and Romanian are included, with a printable A4 parents'
guide for each. Both declared age bands (7–9 and 10–13) use the same simple
investigations; there is no separate harder mode.

## AI literacy and child agency

The manifest names two skills:

- **ai-can-be-wrong:** compare suggestions with clues and distinguish wrong,
  useful-but-incomplete and adequate answers.
- **when-to-ask:** think first, then choose ordinary free guidance or optional
  AI help that adds a checking task.

AI becomes available after a first reply or “not sure” choice. Its button
advertises **one extra check**. There is no spark currency or help quota.
The child answers that evidence-check question before returning to the main
question. Mira models the first two requested checks, then offers less coaching.
Successful checks receive recognition. The inline flag alone does not earn
evidence credit. A finished investigation emits kidvo's done event once;
abandoning it does not.

**Maintainer design decision:** the advertised effort cost replaces the
reference game's spendable sparks. Whether that satisfies charter rule 3
requires maintainer judgement; passing automated checks is not acceptance.

## Run and review

From the repository root, using Node 22 (the CI version):

```sh
npm ci
npx playwright install chromium webkit
node apps/workshop-of-why/build-lessons.mjs
npm run dev
```

Open localhost:8080/#workshop-of-why in a browser. Play inside the kidvo shell, which
supplies sandboxing, language changes and completion events.

Before submission or after changing content:

```sh
node --test apps/workshop-of-why/workshop.test.mjs
npm test
```

The first command runs the app's validation, guided dialogue, AI-check,
experiment-gate and reset tests. Repository npm test runs static/safety checks
and Chromium/WebKit smoke tests; it does not invoke the app-specific Node tests.
[TESTING.md](TESTING.md) provides a repeatable interactive review walkthrough.

## Implementation

Plain HTML, CSS and JavaScript; no framework, backend, API key or app-specific
package dependencies. The game uses the existing kidvo SDK and practice-AI panel.
It makes no live AI calls, external requests or personal-data prompts, and uses
no cookies or browser storage. Shared shell files are unchanged.

| Files | Responsibility |
| --- | --- |
| index.html / style.css | Original SVG room, controls and responsive layout |
| game.js | Input, doors, language rendering and shared-panel integration |
| engine.js | Questions, checkpoints, AI checks and completion state |
| basin.js | Reusable trial state and cancellable basin illustration |
| lessons/*.json | Metadata, object mappings, scenes and authored questions |
| lang/en.js, hu.js, ro.js | All child-facing text and shared control labels |
| build-lessons.mjs | Validate JSON sources and compile the browser bundle |
| lessons.js | Generated bundle, included with its sources |
| parents/*.html | Script-free printable guides for each shipped language |
| workshop.test.mjs | App-specific Node tests |

Messages capture text keys so changing language preserves their original
meaning. Movement during typing is queued against the current lesson state.
Restart/Doors wait for typing to finish. Basin animation is cancelled on
restart/exit; trial evidence survives Refill and resets for a new round or door.

AI assisted the coding, topic drafting and translations, including Gemini
drafts followed by revisions and automated checks. This is an authoring
workflow, not runtime AI. Native-language and educational reviews remain needed.

## Extending the game

1. Add a uniquely named JSON file under lessons/ with a unique lesson id.
2. Add title, summary, observations and dialogue keys in each dictionary.
3. Reference supported objects/effects and author main, guide and AI-check choices.
4. Run the builder. Every valid lesson automatically appears as a door.
5. Run both test commands and play all wrong/uncertain and AI-check paths.

No controller edit or per-topic switch statement is needed for a variation
using existing capabilities. Scene effects follow JSON references rather than
step numbers. Genuinely new artwork or physical behaviours need a reusable
component first; JSON cannot invent a simulation.

Bundled visuals: window, mirror, prism, table and basin.
Effects: daylight, air, vision and basin. Basin requirements cw, ccw and both
can gate a step or AI check until the relevant trials finish.
See [CONTENT-FORMAT.md](CONTENT-FORMAT.md) for schema-v2 fields, and
[TOPIC-PROMPT.md](TOPIC-PROMPT.md) for a reusable authoring prompt.

Malformed JSON, repeated properties, invalid references or missing English keys
skip the whole bad file with an author warning, preserving other valid files.
Duplicate ids keep the first valid file in filename order. Up to eight lessons
are compiled; further files are reported as skipped. Keep lessons.js current,
retain translation parity and stay within kidvo's 300KB/60-file app budget.

## Scientific scope and review status

The ray diagrams illustrate ideas, not measured ray counts or calibrated
optics. Blue is compared with red, rather than claimed to scatter most of all
colours. The prism separates existing colours. The mirror lesson introduces
silver/aluminium coating, partial reflection from glass, and rough wood
scattering some light towards the eyes.

The basin is a programmed illustration, not experimental proof or a fluid
simulation. It follows chosen initial motion and illustrates inward speed-up.
Real ordinary drain direction also depends on initial motion and container
geometry. Earth's rotation is not modelled or claimed never to matter.

Background: NASA Space Place, Why Is the Sky Blue?; NASA Science, Wave Behaviors;
MIT Ask an Engineer, mirror versus white paper; OpenStax University Physics,
The Law of Reflection; Matt Bobrowsky, NSTA Science and Children,
Why Does Water Swirl When it Goes Down a Drain?

Prepared for review. Maintainer charter judgement, language-steward review,
educational review and child playtesting remain. All characters/artwork are
original; no third-party characters, brands or external assets are included.
Code is offered under MIT and text/art under CC BY 4.0, following kidvo's charter.
