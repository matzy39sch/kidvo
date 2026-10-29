# Reviewer walkthrough

Launch instructions and test commands are in README.md. Play through the kidvo
shell at localhost:8080/#workshop-of-why, not index.html opened from disk.
Use the shell language buttons to repeat checks in EN, HU and RO.

## Automated checks

From the repository root:

    node apps/workshop-of-why/build-lessons.mjs
    node --test apps/workshop-of-why/workshop.test.mjs
    npm test

Expect three valid lessons and no skipped files. The app tests cover malformed
JSON, duplicate keys, reference/position validation, dictionary parity, bundle
freshness, all bundled guided/AI paths, one completion, trial state and reset.
The repository suite covers safety, startup and phone layout in both browser
engines. It does not fully play this game's authored conversations.

## Three-door review

1. Open each door and complete it using your own answers without requesting AI.
   At required object visits, reply buttons should appear after exploring.
2. Choose a mistaken reply, then a wrong smaller-checkpoint answer. The game
   should offer a hint and another try, not reveal the main solution or advance.
3. Answer the checkpoint correctly and retry the main question. The lesson
   should return directly to the question, without a Next command.
4. After a first attempt/uncertain reply, request practice AI. Confirm the button
   advertises one extra check. Check a wrong, partial and adequate suggestion.
   Wrong checks should remain retryable; successful checks return to the main
   question. Incomplete answers must not be called false.
5. Flag a suggestion. Flagging alone should not complete its evidence question.
6. Switch language midway through the prism step and after an AI reply. History
   and current buttons should translate while retaining their original meaning.
7. Return to Doors midway through a lesson, then open another. Its conversation
   and trial evidence should start fresh. Only a real completion should grow Vo;
   restarting or abandoning an investigation should not do so.

## Specific scene checks

- Sky: daylight, prism colours and blue/red air diagram appear at the relevant
  scene references. New observations remain required where configured.
- Mirror: the last step visits the table. The mirror beam reaches the table;
  several outgoing paths include one towards Mira's eye. Check the authored
  claim that eyes send light, then answer by following the arrow direction.
- Basin: answer the first question, then try draining before stirring. That
  control should be disabled. Finish a counterclockwise trial first: it must not
  unlock a question requiring a clockwise trial. Refill and complete clockwise;
  the question should become answerable. The earlier opposite trial should still
  count when required later. Questions name their trial, not merely the last run.

## Movement, timing and accessibility

- Drag Tavi, tap the room, use arrow keys and activate native object buttons.
  Repeated object taps repeat clues. Table/prism buttons select their own targets
  even where hitboxes overlap. Free placement chooses the nearer target.
- Move to another object during a typed reply. The next observation should use
  the current question, not an obsolete prompt. Doors/restart wait for typing.
- Leave while the basin drains, then reopen another investigation. The old
  animation must not append results or completion to the new lesson. Restart
  must clear basin trials. Refill alone retains them.
- Enable reduced motion. Basin direction and completed trials should remain
  available as text without animated movement.
- At 360×640 and 740×360, check every reply and experiment control is reachable,
  the latest question can be read, there is no sideways scrolling, and visible
  buttons are at least 44px high. In short landscape, the basin close view uses
  its room column without overlapping controls/readouts.
- Print each parents' guide: one A4 page, with no scripts or clipped text.

## Extensibility review

In a temporary local copy, add a unique lesson JSON reusing supported objects
and existing dictionary keys. Rebuild and verify a new door appears without
controller edits. Reorder steps with different scene references: their effects
should follow the data. Add malformed JSON alongside it: the bad file should be
reported as skipped while valid doors remain. Remove temporary review content
before preparing a contribution.

Automated success does not replace native-language review, educational review,
child playtesting or maintainer judgement of the charter's visible-cost rule.
