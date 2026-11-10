A prompt that works today can fail after a model update, and a prompt tuned on one model can fall apart on another. A prompt benchmark is a small test you can repeat: the same input every time, a written definition of a good answer, and a log of how each model did.

## The three parts

1. **A fixed test prompt.** Exactly what you send, word for word, every time. If you change the wording, you have started a new benchmark.
2. **An expected result.** What a good answer contains, written before you read any output.
3. **A run log.** One line per attempt: the model, the verdict, and a note on what happened.

## Write the rubric before you run anything

A rubric written after you have seen the output tends to describe the output. Write it first, in terms of things you can check by reading the answer.

- **Pass.** The first sentence is the decision. Facts and guesses are visibly separated. An owner is named.
- **Mixed.** Accurate, but the decision is buried or the owner is missing.
- **Fail.** Restates the timeline, or presents guesses as facts.

Three levels are enough. "Mixed" is the useful one, because it records an answer that is not wrong but would still need your edit.

## What is worth testing

- **Behaviour you rely on.** The model refuses to invent a citation, keeps to a word limit, or asks before it assumes.
- **Failures that have cost you.** The day a model gets something wrong in a way that matters, save the prompt that caused it as a benchmark.
- **Claims about a new model.** If a release says it follows instructions better, your own benchmark tells you whether that holds for your work.

Keep each benchmark to one behaviour. A test that checks five things gives you a verdict you cannot act on.

## Reading the results

- **Run each model more than once.** Answers vary from run to run, and one pass proves little.
- **Look at the pass rate.** Three passes out of five tells you more than the latest verdict.
- **Treat a mixed result as a question about the prompt.** The wording can be at fault as easily as the model. Rewrite it, save the new version as its own benchmark, and compare.
- **Run it again when a model changes.** That is the reason to keep it.

## Benchmarks in promptrc

promptrc has an entry kind for this.

- A benchmark holds the test prompt and the expected result side by side. Copying it gives you the test prompt exactly as saved.
- `:log claude-opus-5-5 pass asked for a link instead` records a run from the command line. The same form sits under the log in the reader.
- The log lists each run with its verdict, model, note and date, and shows the pass rate across them.
- A row of bars shows the recent verdicts at a glance, in the reader and beside the benchmark in the list.
