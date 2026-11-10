Most prompts you reuse are the same instructions with a few facts swapped in: the file to review, the audience, the tone. A prompt template keeps the instructions fixed and marks the parts that change as variables. You fill the variables in each time and send the result.

## What a template looks like

A variable is a name inside double braces.

```text
Review {{file}} for {{focus | correctness}}.

Quote each line you object to, say what breaks, and propose the smallest fix.
```

The first variable has no default, so you supply a file every time. The second has a fallback after the bar. Leave it empty and the prompt says "correctness".

## How to choose what becomes a variable

- **Make a variable for each fact that changes between uses.** The diff, the customer's name, the word limit.
- **Keep the instructions out of variables.** If you rewrite the instruction through a variable every time, you have two prompts and should save both.
- **Give a fallback to anything with a usual value.** Tone, audience and length often have one. With a fallback, the common case needs no typing.
- **Use one name for one thing.** A variable that appears three times is filled in once.
- **Name a variable for what it holds.** `incident_notes` tells you what to paste. `input` does not.

## Keep pasted material apart from the instructions

A long paste in the middle of a sentence makes it hard for the model to tell your instructions from the text it should work on. Give the variable its own lines and label it or wrap it in tags.

```text
Write an executive summary of the incident notes for a VP who has 30 seconds.

Lead with the decision they need to make. Separate confirmed facts from guesses.

<notes>
{{incident_notes}}
</notes>
```

## When you need literal braces

Sometimes the prompt itself has to contain double braces, for example when you ask a model to write a template for you. Put them in a code span or a code block. promptrc shows braces inside code as written, offers no blank for them, and copies them unchanged.

## Templates in promptrc

In promptrc, a prompt's variables show up as blanks inside the text, and you type straight into them.

- Every blank with the same name shares one value, so you fill it once.
- Press `y` to copy. The clipboard gets the prompt with your values in place. An empty blank uses its fallback. With no fallback, the variable is copied as written, so you can see what you missed.
- promptrc remembers what you typed for each prompt in your browser. The next visit starts where you left off.
- The status line counts the blanks, for example `1/2 blanks`.
- Press `r` to switch to the raw source with line numbers. The blanks stay live there too.
