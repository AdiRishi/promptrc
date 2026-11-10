A prompt that asks for a plan, a critique and an implementation in one message usually gets all three done badly. Prompt chaining sends them as separate messages, in order, in the same conversation. Each step gets the model's full attention, and you read each result before you send the next step.

## When chaining helps

- **The task has stages that depend on each other.** Plan, then build. Gather, then decide.
- **You want the model to check its own work.** A critique works better as its own message than as a clause at the end of the first one.
- **You need to steer.** The pause between steps lets you correct a mistake before the next step builds on it.

Skip it when the task fits in one clear instruction. Every extra step is another message to wait for.

## Three chains worth keeping

### Plan, critique, build

For any piece of work where the first idea is rarely the best one.

```text
Step 1
Here is the task: {{task}}

Don't write code yet. Propose a plan as a numbered list of small, verifiable steps, and name the riskiest assumption.

Step 2
Now argue against your own plan. What breaks first, what did you over-engineer, and what would a reviewer push back on? Revise the plan.

Step 3
Implement the revised plan one step at a time. After each step, say how you verified it before moving on.
```

### Gather, weigh, compare

For research, where a model will summarise sources it has not found if you let it.

```text
Step 1
List the five most-cited sources on {{topic}}. Links only, no summaries.

Step 2
For each source, give the claim it is cited for and one sentence on how strong the evidence is.

Step 3
Where do the sources disagree? Name the disagreement and who is on each side.
```

### Draft, cut, reread

For writing, where the edit matters more than the draft.

```text
Step 1
Draft {{piece}} for {{reader}}. Get every fact in. Don't polish.

Step 2
Cut it by a third without losing a fact.

Step 3
Read it as {{reader}} would, cold. Fix every place they would stop or reread.
```

## How to write a good step

- **Give each step one job.** If a step says "and then", split it.
- **Say what not to do yet.** "Don't write code yet" keeps the plan from turning into an implementation.
- **Build on the last answer.** "Now argue against your own plan" works because the plan is already on the page.
- **Say what done looks like.** A numbered list, a diff, three sentences. A step with a clear end is easier to judge.

## Chains in promptrc

promptrc saves a chain as one entry called a sequence.

- The editor gives each step its own box, with controls to reorder and remove steps. In the source, a line containing `<!-- step -->` separates one step from the next.
- The reader shows the steps in order, each with its own copy action. `:y2` copies step 2.
- Steps you have copied are ticked and the next one is marked, so you keep your place while you switch between promptrc and the conversation.
- Plain `y` copies the whole chain, with each step labelled.
- Variables work inside steps, and one value fills every step that uses the name.
