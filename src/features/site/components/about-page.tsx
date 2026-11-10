import { Link } from '@tanstack/react-router'
import { type ReactNode } from 'react'

import { Kbd, KeyCombo } from '@/components/ui/kbd'
import { KindTag } from '@/features/prompt-library/components/kind-mark'
import { PROMPT_KINDS } from '@/features/prompt-library/model/prompt-kinds'
import { type PromptKind } from '@/features/prompt-library/types'
import { PageSection, PageTitle, SiteShell } from '@/features/site/components/site-shell'
import { GUIDE_LIST } from '@/features/site/guides/guides'
import { SITE_GITHUB_URL } from '@/lib/site-config'

const KIND_COPY: Record<PromptKind, string> = {
  prompt:
    'A reusable instruction. Mark the parts that change as {{variables}} and promptrc turns them into blanks you fill in before you copy.',
  fragment:
    'A sentence or phrase that got the result you wanted, kept so you can drop it into a larger prompt.',
  sequence:
    'An ordered chain of instructions. You copy one step at a time, and promptrc keeps your place.',
  benchmark:
    'A test prompt with the result you expect and a log of how each model did, so you can run it again on the next model.',
}

/** Questions people ask before trying it. Also published as FAQ structured data. */
export const ABOUT_FAQ = [
  {
    question: 'Is promptrc free?',
    answer:
      'Yes. promptrc is free to use and open source under the MIT license. You can read the code or run your own copy from GitHub.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'No. Open the app and start saving prompts. They are stored in your browser. Signing in is optional and adds sync between browsers, share links and image attachments.',
  },
  {
    question: 'Where are my prompts stored?',
    answer:
      'Signed out, your prompts stay in your browser’s local storage on that device. Signed in, they are stored in your account so every browser you sign in from has them.',
  },
  {
    question: 'Which AI tools does it work with?',
    answer:
      'Any of them. promptrc copies plain text to your clipboard, so you can paste into ChatGPT, Claude, Gemini, a coding assistant or an API playground.',
  },
  {
    question: 'How is it different from keeping prompts in a notes app?',
    answer:
      'A notes app stores text. promptrc knows what a prompt is: it fills in variables before you copy, steps you through a sequence, logs benchmark runs per model, and finds any entry in a keystroke.',
  },
  {
    question: 'Does it work on a phone?',
    answer:
      'Yes. On a phone you see one pane at a time and the keyboard shortcuts become buttons. It is fastest with a keyboard.',
  },
] as const

/** `/about`: what promptrc is, for someone who has not opened it yet. */
export function AboutPage() {
  return (
    <SiteShell path="~/.promptrc/ABOUT" section="about">
      <PageTitle
        lede={
          <>
            promptrc is a free, open-source prompt manager for people who use ChatGPT, Claude and
            other AI tools every day. It keeps the prompts, phrasings, sequences and tests that
            worked, and gets them back to you in a keystroke.
          </>
        }
      >
        A prompt library that drives like a terminal
      </PageTitle>

      <p className="text-body">
        <Link className="link" to="/">
          Open promptrc
        </Link>
        . There is nothing to install and no account to create.
      </p>

      <Screenshot
        alt="promptrc showing a tree of projects and tags, a list of saved prompts, and a prompt open with one fill-in blank completed"
        src="/screenshots/library.webp"
      />

      <PageSection title="Four kinds of things worth keeping">
        <dl className="grid gap-x-[2ch] gap-y-3 sm:grid-cols-[14ch_minmax(0,1fr)]">
          {PROMPT_KINDS.map((kind) => (
            <div className="contents" key={kind}>
              <dt className="font-semibold text-fg">
                <KindTag kind={kind} />
              </dt>
              <dd className="text-fg-dim">{KIND_COPY[kind]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-fg-dim">
          Every entry lives in a project and can carry tags, a pin, and a note on why it works.
        </p>
      </PageSection>

      <PageSection title="Built for the keyboard">
        <ul className="flex flex-col gap-2 text-fg-dim">
          <Feature keys={<Kbd>c</Kbd>}>
            Capture a prompt in seconds, from anywhere in the app. The title comes from the first
            line if you skip it.
          </Feature>
          <Feature keys={<Kbd>y</Kbd>}>
            Copy the open entry to your clipboard with its blanks filled in.
          </Feature>
          <Feature keys={<KeyCombo keys={['Mod', 'K']} />}>
            Find any entry, project, tag or command, with a live preview.
          </Feature>
          <Feature keys={<Kbd>:</Kbd>}>
            Run commands as you would in vim, with completion and history: <code>:cd work</code>,{' '}
            <code>:sequences</code>, <code>:new benchmark</code>.
          </Feature>
          <Feature keys={<Kbd>?</Kbd>}>
            Read{' '}
            <Link className="link" to="/manual">
              the manual
            </Link>
            , which lists every key and command.
          </Feature>
        </ul>
      </PageSection>

      <Screenshot
        alt="The promptrc finder: search results on the left and a rendered preview of the highlighted entry on the right"
        src="/screenshots/finder.webp"
      />

      <PageSection title="Yours first, synced if you want">
        <p className="text-fg-dim">
          promptrc works without an account, and your library is stored in your browser on that
          device. Sign in when you want the same library in every browser, a read-only link to share
          a prompt, or images attached to an entry.
        </p>
      </PageSection>

      <PageSection title="Seven colorschemes">
        <p className="text-fg-dim">
          The default follows your system, dark or light. The others are phosphor and green-screen
          CRTs, tokyo-night, catppuccin and gruvbox. Switch with <code>:colorscheme</code>.
        </p>
        <Screenshot
          alt="A benchmark entry in promptrc’s light colorscheme, with the expected result and a log of runs per model"
          src="/screenshots/benchmark-daylight.webp"
        />
      </PageSection>

      <PageSection title="Guides">
        <ul className="flex flex-col gap-1">
          {GUIDE_LIST.map((guide) => (
            <li key={guide.slug}>
              <a className="link" href={`/guides/${guide.slug}`}>
                {guide.title}
              </a>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection id="faq" title="Questions">
        <dl className="flex flex-col gap-5">
          {ABOUT_FAQ.map((item) => (
            <div key={item.question}>
              <dt className="font-semibold text-fg">{item.question}</dt>
              <dd className="mt-1 text-fg-dim">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </PageSection>

      <PageSection title="Open source">
        <p className="text-fg-dim">
          promptrc is MIT licensed. The code, the issue tracker and the instructions for running
          your own copy are on{' '}
          <a className="link" href={SITE_GITHUB_URL} rel="noreferrer" target="_blank">
            GitHub
          </a>
          .
        </p>
        <p className="mt-6">
          <Link className="link" to="/">
            Open promptrc
          </Link>
        </p>
      </PageSection>
    </SiteShell>
  )
}

function Feature({ keys, children }: { keys: ReactNode; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[8ch_minmax(0,1fr)] items-baseline gap-x-[2ch]">
      <span>{keys}</span>
      <span>{children}</span>
    </li>
  )
}

function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      alt={alt}
      className="mt-8 w-full border border-line"
      height={956}
      loading="lazy"
      src={src}
      width={1600}
    />
  )
}
