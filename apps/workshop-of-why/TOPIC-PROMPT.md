# Drafting an authored workshop investigation

Use the prompt below with an authoring assistant before shipping. The game never
calls an AI. A person checks the science, translations and play before accepting
generated content. Use lessons/sky-blue.json and lang/en.js as format examples.
Every valid lesson becomes a door in the selector after rebuilding.
Follow schema version 2 in CONTENT-FORMAT.md and the existing JSON example.

## Reusable prompt

Write an offline Workshop of Why investigation about [TOPIC] for ages [7–9 or
10–13]. Work from the attached lessons/sky-blue.json, build-lessons.mjs and
language dictionaries. Produce a new lessons/[unique-id].json plus dictionary
entries for lang/en.js. If requested, supply matching hu/ro entries for native
steward review. Never put prose directly into lesson JSON.

Keep Mira the craftsperson and Tavi the paper bird as story characters. Practice
AI is a separate tool, clearly labelled. Use only the existing window, mirror
and prism observations, or the basin illustration. If these cannot support the topic, explain what scene
work is needed rather than inventing an invisible observation. No network,
personal information, copyrighted characters or external assets.

Build a chain of small, answerable questions. For ages 7–9, use sentences under
10 words, one idea each. Begin with familiar observations; introduce one new
idea at a time. Do not ask the final science question before building its parts.
Each step needs:

- A unique id, place, prompt key, reply key and 2–4 distinct choices. Each choice
  has a label key and a boolean correct; exactly one choice is supported.
- An optional intro key that sets context without stating the answer. Set
  observe: true when a new scene observation is needed at the same object.
- For a basin trial, optional experiment: cw, ccw or both waits for completed
  trials in those directions. AI checks can override this through ai.experiment.
  Label the activity as an illustration; do not present programmed motion as
  independent proof, or infer Earth effects from a location control that is absent.
- A guide with prompt, hint and choices. It must address a likely misconception
  through a smaller question. A wrong choice must not reveal the main answer.
- An ai object with kind (wrong, partial or complete), place, text, coach,
  prompt, hint, reply and choices. Its check tests the suggestion against an
  available observation; its correct answer can differ from the main answer.

The top level is version: 2, a unique id, title key, summary key, objects, scenes
and steps. Each step references a scene. An optional ai.scene overrides the
scene during its evidence check. Every scene supplies an observation key for
each declared object and an effects array. Do not tie effects to step numbers.
Object definitions supply id, visual, label, go, x, y, button and bounds. Use
supported bundled visuals/effects only; follow the validator's numeric bounds.
Use 3–8 steps so wrong, partial and complete AI suggestions all appear. AI facts
should sometimes be wrong, sometimes true but insufficient, and sometimes
adequate for the question. Do not call an incomplete answer false. Do not demand
an exhaustive scientific explanation from a child.

Coach models a concrete check on either of the first two AI requests. Thereafter
the game omits the coach line. Each check must be answerable without it. Hints
direct attention to evidence without immediately giving the correct choice.
Reply explains what that check establishes. The game returns to the main
question automatically. Do not add a Next button, currencies or quotas; each
optional AI request already advertises one extra check.

For each main and check question, provide an author-only explanation of why its
correct choice follows, which visible observation supports it, and why each
distractor fails. List reputable primary science references and uncertainties.
Do not claim that a drawing is experimental proof or a measured simulation.

## Author review

Keep the explanations and references out of the child-facing dialogue. Review
all choices and smaller questions in context, especially the wrong-answer path.
Add matching dictionary keys and placeholders for every shipped language.
Rebuild with node apps/workshop-of-why/build-lessons.mjs, inspect skipped-file
warnings, then run the app tests and npm test. Malformed JSON, repeated properties
and invalid lesson structures are skipped as whole files. A skipped topic is
not a successfully added topic. Keep lessons.js with its JSON sources.
