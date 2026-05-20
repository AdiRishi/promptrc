import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Kbd } from '@/components/ui/kbd'
import { Textarea } from '@/components/ui/textarea'
import { filenameOf } from '@/features/prompt-library/rendering/prompt-library-formatting'
import { type ComposerState, type PromptDraft } from '@/features/prompt-library/types'

type PromptComposerProps = {
  composer: ComposerState
  categories: string[]
  titleInputRef: React.RefObject<HTMLInputElement | null>
  onCancelComposer: () => void
  onSaveComposer: () => void
  onDraftChange: <TFieldName extends keyof PromptDraft>(
    field: TFieldName,
    value: PromptDraft[TFieldName],
  ) => void
}

export function PromptComposer({
  composer,
  categories,
  titleInputRef,
  onCancelComposer,
  onSaveComposer,
  onDraftChange,
}: PromptComposerProps) {
  const fileName =
    composer.mode === 'new'
      ? 'new.prompt.md'
      : `${filenameOf(composer.draft.title || 'untitled')}.md`

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-dashed border-border py-4">
        <CardTitle className="text-primary before:mr-2 before:text-accent-foreground before:content-['>']">
          {fileName}
        </CardTitle>
        <div className="text-[11px] text-muted-foreground">
          esc - cancel - <Kbd className="mx-1 align-middle">Cmd</Kbd>
          <Kbd className="align-middle">Enter</Kbd> save
        </div>
      </CardHeader>

      <CardContent className="px-6 py-6">
        <FieldSet>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="prompt-title">title</FieldLabel>
              <Input
                id="prompt-title"
                onChange={(event) => onDraftChange('title', event.target.value)}
                placeholder="The Translator"
                ref={titleInputRef}
                value={composer.draft.title}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-category">category</FieldLabel>
              <Input
                id="prompt-category"
                list="prompt-categories"
                onChange={(event) => onDraftChange('category', event.target.value)}
                placeholder="Writing"
                value={composer.draft.category}
              />
              <datalist id="prompt-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              <FieldDescription>choose an existing one or type a new name</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="prompt-tags">tags</FieldLabel>
              <Input
                id="prompt-tags"
                onChange={(event) => onDraftChange('tagsInput', event.target.value)}
                placeholder="#writing #translation #stakeholder"
                value={composer.draft.tagsInput}
              />
              <FieldDescription>comma or space separated - # optional</FieldDescription>
            </Field>

            <Field>
              <FieldTitle>body</FieldTitle>
              <Textarea
                id="prompt-body"
                onChange={(event) => onDraftChange('body', event.target.value)}
                placeholder="Translate this technical writeup for a non-engineer stakeholder..."
                value={composer.draft.body}
              />
            </Field>
          </FieldGroup>
        </FieldSet>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 px-6 pb-6">
        <Button onClick={onSaveComposer} size="sm" type="button">
          Cmd+Enter - {composer.mode === 'new' ? 'save Prompt' : 'save'}
        </Button>
        <Button onClick={onCancelComposer} size="sm" type="button" variant="outline">
          esc - cancel
        </Button>
      </CardFooter>
    </Card>
  )
}
