# Adding a workshop investigation

The game discovers compiled investigations and creates their doors automatically.
There are no per-topic branches in the movement or conversation controller.
All JSON is build-time authored data; the browser loads only bundled local files.

1. Copy lessons/sky-blue.json to a new kebab-case filename in lessons/.
2. Set a unique id, title and summary keys. Add your text keys to the language
   dictionaries (including each shipped language, with matching placeholders).
3. Configure objects, scenes and questions as below. Keep only observations and
   behaviours supported by the actual room illustration.
4. Run node apps/workshop-of-why/build-lessons.mjs. Read skipped-file warnings.
   Keep the generated lessons.js with the source. Reload to see the new door.
5. Test all wrong/uncertain paths, optional AI checks, language switching and
   phone layouts, then run the app tests and npm test. Seek human text review.

## Version 2 fields

- version: 2; id: unique kebab-case; title/summary: dictionary keys.
- objects: 1–8 definitions. Each has a unique id, a bundled visual (window,
  mirror, prism, table or basin), label/go dictionary keys, a bird destination x/y, a button
  position [x,y], and hitbox bounds [left,right,top,bottom]. Positions are
  percentages of the room. Destinations must be inside their hitboxes and within
  x 5–95/y 10–95. Button centres must be within 10–90. Match controls/hitboxes to
  the drawing; JSON does not move the base artwork. Keep controls unobstructed.
- scenes: named definitions. Each contains observations (object id to text key,
  covering every object) and effects (an array containing daylight, air, vision and/or basin,
  or empty). Effects refer to bundled diagrams, not executable expressions.
- steps: 3–8 entries. Each has id, place, scene, prompt, reply, choices, guide
  and ai. Optional intro sets context; optional observe: true requires a fresh
  object visit on first entering the step. It does not repeat that gate on retry.
- choices: 2–4 {label,correct} entries, unique label keys, exactly one true.
- guide: prompt, hint and choices for a smaller answerable checkpoint.
- ai: kind (wrong, partial or complete), place, text, coach, prompt, hint, reply
  and choices. Optional scene switches the evidence setup while checking the AI;
  otherwise it uses the step's scene. Include all three kinds across the lesson.
- Optional step.experiment or ai.experiment: cw, ccw or both. It requires
  completed stir-then-drain trials in those directions before reply buttons
  unlock. Use it with a basin object and a scene with the basin effect. AI
  checks inherit the step's requirement unless they override it. Refill retains
  previous trial evidence; replay/restart or choosing another door resets it.

## Vision effect

The vision effect shows the mirror-to-table beam and several paths scattered
from the table, including a path towards Mira's eye. Use table or mirror as the
active object's visual. Like the other ray diagrams, it is illustrative.

## Basin component

The basin is a reusable authored illustration. Its controls choose a starting
direction, drain the water and refill the same basin. The marker moves inward
and faster while draining. It is not a fluid simulation or measurement, and it
does not independently prove its programmed behaviour. Reduced-motion users get
the same direction/result text without animation. A trial counts only after
draining finishes. A new topic can reuse this component through JSON.

Clicking the basin opens its close view; Room view returns to the shared room.
During a typed reply, completed trial evidence waits for the current dialogue
turn. Switching doors or restarting cancels pending component animation.

Example: a step using scene: daylight displays that scene's observations and
daylight diagram. Move it later in the steps array and it keeps those properties.
Change its ai.scene to ordinary and checking uses ordinary until the child
returns to the main question. Text history keeps its original keys when scenes
or language change. Opening a different door starts a fresh conversation.

## Validation and scope

Malformed JSON, duplicate properties, bad references, unsupported fields/effects,
invalid positions, duplicate step IDs or missing English text invalidate the
whole source file. It is skipped with an author warning; other valid doors stay.
Duplicate lesson IDs keep the first valid file in filename order. Up to eight
valid lessons are compiled; further files are reported as skipped. The app-wide
300KB/60-file limits still apply. All shipped dictionaries must have key parity.

New dialogue, question order, labels, observation mappings and existing diagram
combinations are data changes. A lamp or new simulation needs original
art and a reusable scene component first. Do not fake unsupported observations
or insert scripts, raw HTML, external resources or live AI in the JSON.
