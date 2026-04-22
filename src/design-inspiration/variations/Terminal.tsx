import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { type Prompt } from '../data'
import { type PromptDraft, filenameOf, parseTags, relativeTime, usePrompts } from '../usePrompts'
import './Terminal.css'

type Mode = 'view' | 'edit' | 'new'
type Draft = PromptDraft & { tagsInput: string }

const EMPTY_DRAFT: Draft = {
  title: '',
  category: '',
  body: '',
  tags: [],
  tagsInput: '',
}

export default function Terminal() {
  const { prompts, categories, add, update, remove, duplicate, incrementUses } = usePrompts()

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(prompts[0]?.id ?? null)
  const [mode, setMode] = useState<Mode>('view')
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [searchFocused, setSearchFocused] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const flashTimer = useRef<number | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return prompts
    return prompts.filter((p) =>
      (p.title + ' ' + p.body + ' ' + p.tags.join(' ')).toLowerCase().includes(q),
    )
  }, [prompts, query])

  const grouped = useMemo(() => {
    const out: Record<string, Prompt[]> = {}
    for (const p of filtered) {
      ;(out[p.category] ??= []).push(p)
    }
    return out
  }, [filtered])

  const catKeys = Object.keys(grouped)
  const flatIds = useMemo(
    () =>
      Object.values(grouped)
        .flat()
        .map((p) => p.id),
    [grouped],
  )

  // Reconcile selection when items are deleted or filter changes.
  useEffect(() => {
    if (selectedId && prompts.find((p) => p.id === selectedId)) return
    setSelectedId(prompts[0]?.id ?? null)
  }, [prompts, selectedId])

  const active = useMemo(
    () => prompts.find((p) => p.id === selectedId) ?? null,
    [prompts, selectedId],
  )

  const briefFlash = useCallback((msg: string) => {
    setFlash(msg)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 1600)
  }, [])

  // Auto-expire the delete confirmation.
  useEffect(() => {
    if (!confirmDel) return
    const t = window.setTimeout(() => setConfirmDel(null), 3000)
    return () => window.clearTimeout(t)
  }, [confirmDel])

  // ----- actions -----
  const startNew = useCallback(() => {
    setDraft(EMPTY_DRAFT)
    setMode('new')
    requestAnimationFrame(() => titleRef.current?.focus())
  }, [])

  const startEdit = useCallback((p: Prompt) => {
    setDraft({
      title: p.title,
      category: p.category,
      body: p.body,
      tags: p.tags,
      tagsInput: p.tags.map((t) => `#${t}`).join(' '),
    })
    setSelectedId(p.id)
    setMode('edit')
    requestAnimationFrame(() => titleRef.current?.focus())
  }, [])

  const cancelForm = useCallback(() => {
    setMode('view')
    setDraft(EMPTY_DRAFT)
  }, [])

  const saveForm = useCallback(() => {
    const input: PromptDraft = {
      title: draft.title,
      body: draft.body,
      category: draft.category,
      tags: parseTags(draft.tagsInput),
    }
    if (!input.title.trim() || !input.body.trim()) {
      briefFlash('title and body required')
      return
    }
    if (mode === 'new') {
      const p = add(input)
      setSelectedId(p.id)
      briefFlash(`wrote ${filenameOf(p.title)}.md`)
    } else if (mode === 'edit' && selectedId) {
      update(selectedId, input)
      briefFlash(`saved ${filenameOf(input.title)}.md`)
    }
    setMode('view')
    setDraft(EMPTY_DRAFT)
  }, [draft, mode, selectedId, add, update, briefFlash])

  const copyActive = useCallback(() => {
    if (!active) return
    navigator.clipboard?.writeText(active.body).catch(() => {})
    incrementUses(active.id)
    briefFlash(`copied → ${active.title}`)
  }, [active, incrementUses, briefFlash])

  const duplicateActive = useCallback(() => {
    if (!active) return
    const np = duplicate(active.id)
    if (np) {
      setSelectedId(np.id)
      briefFlash(`duplicated → ${np.title}`)
    }
  }, [active, duplicate, briefFlash])

  const deleteActive = useCallback(() => {
    if (!active) return
    if (confirmDel !== active.id) {
      setConfirmDel(active.id)
      briefFlash('press delete again to confirm')
      return
    }
    const idx = flatIds.indexOf(active.id)
    const nextId = flatIds[idx + 1] ?? flatIds[idx - 1] ?? null
    briefFlash(`removed → ${active.title}`)
    remove(active.id)
    setSelectedId(nextId)
    setConfirmDel(null)
  }, [active, confirmDel, flatIds, remove, briefFlash])

  // ----- keyboard -----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')

      if (e.key === 'Escape') {
        if (mode !== 'view') {
          e.preventDefault()
          cancelForm()
          return
        }
        if (typing) target.blur()
        return
      }

      if (mode !== 'view' && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        saveForm()
        return
      }

      if (typing) return

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        const sel = window.getSelection()?.toString()
        if (sel && sel.length > 0) return
        if (!active) return
        e.preventDefault()
        copyActive()
        return
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        case 'n':
          e.preventDefault()
          startNew()
          break
        case '/':
          e.preventDefault()
          searchRef.current?.focus()
          searchRef.current?.select()
          break
        case 'j': {
          if (!flatIds.length) break
          e.preventDefault()
          const i = selectedId ? flatIds.indexOf(selectedId) : -1
          const next = flatIds[Math.min(i + 1, flatIds.length - 1)] ?? flatIds[0]
          if (next) setSelectedId(next)
          break
        }
        case 'k': {
          if (!flatIds.length) break
          e.preventDefault()
          const i = selectedId ? flatIds.indexOf(selectedId) : 0
          const prev = flatIds[Math.max(i - 1, 0)] ?? flatIds[0]
          if (prev) setSelectedId(prev)
          break
        }
        case 'e':
          if (active) {
            e.preventDefault()
            startEdit(active)
          }
          break
        case 'd':
          if (active) {
            e.preventDefault()
            duplicateActive()
          }
          break
        case 'x':
          if (active) {
            e.preventDefault()
            deleteActive()
          }
          break
        case '?':
          e.preventDefault()
          briefFlash(
            'n · new  /  / · search  /  j k · move  /  e · edit  /  d · dup  /  x · delete  /  ⌘C · copy',
          )
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    mode,
    active,
    selectedId,
    flatIds,
    cancelForm,
    saveForm,
    startNew,
    startEdit,
    copyActive,
    duplicateActive,
    deleteActive,
    briefFlash,
  ])

  const shortcuts = [
    { keys: ['n'], label: 'new prompt', action: startNew },
    {
      keys: ['/'],
      label: 'focus search',
      action: () => {
        searchRef.current?.focus()
        searchRef.current?.select()
      },
    },
    {
      keys: ['j', 'k'],
      label: 'next · prev',
      action: () => {
        if (!flatIds.length) return
        const i = selectedId ? flatIds.indexOf(selectedId) : -1
        setSelectedId(flatIds[Math.min(i + 1, flatIds.length - 1)] ?? flatIds[0] ?? null)
      },
    },
    {
      keys: ['e'],
      label: 'edit selected',
      action: () => active && startEdit(active),
    },
    { keys: ['d'], label: 'duplicate', action: duplicateActive },
    { keys: ['⌘', 'C'], label: 'copy body', action: copyActive },
    { keys: ['x'], label: 'delete', action: deleteActive },
  ]

  return (
    <div className="v-terminal">
      <div className="term-chrome">
        <div className="term-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="term-path">
          <b>~/.promptrc</b> <span style={{ color: '#ffb454' }}>·</span> zsh
        </div>
        <div className="term-status">
          <span className="term-count">
            {prompts.length} {prompts.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      <div className="term-main">
        {/* LEFT: tree */}
        <aside className="term-tree">
          <div className="term-label">
            <span>tree ~/.promptrc</span>
            <span className="hi">
              {filtered.length} / {prompts.length}
            </span>
          </div>
          <div className="tree">
            <div style={{ color: '#8a8682' }}>~/.promptrc</div>
            {catKeys.length === 0 && (
              <div className="tree-empty">
                {prompts.length === 0 ? (
                  <>
                    no prompts yet · press <kbd>n</kbd>
                  </>
                ) : (
                  <>
                    no matches for <span className="amber">"{query}"</span>
                    <button onClick={() => setQuery('')} className="tree-empty-clear">
                      clear
                    </button>
                  </>
                )}
              </div>
            )}
            {catKeys.map((cat, ci) => (
              <div key={cat}>
                <div className="tree-cat">
                  <span className="tree-branch">{ci === catKeys.length - 1 ? '└── ' : '├── '}</span>
                  {cat.toLowerCase()}/
                </div>
                {grouped[cat].map((p, i) => {
                  const isLastCat = ci === catKeys.length - 1
                  const isLast = i === grouped[cat].length - 1
                  const vert = isLastCat ? '    ' : '│   '
                  const branch = isLast ? '└── ' : '├── '
                  return (
                    <div
                      key={p.id}
                      className={`tree-line ${p.id === selectedId ? 'active' : ''}`}
                      onClick={() => {
                        if (mode !== 'view') {
                          briefFlash('press esc to finish editing first')
                          return
                        }
                        setSelectedId(p.id)
                      }}
                    >
                      <span className="tree-branch">
                        {vert}
                        {branch}
                      </span>
                      <span className="tree-name">{filenameOf(p.title)}.md</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER: content */}
        <main className="term-content">
          <div className={`term-cmd ${searchFocused ? 'is-focused' : ''}`}>
            <span className="prompt">~/.promptrc</span>
            <span className="cmd">$ grep -r</span>
            <div className="term-cmd-field">
              <input
                ref={searchRef}
                placeholder="search title, body, or #tag — press / to focus"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {searchFocused && (
                <span className="term-cmd-ghost" aria-hidden="true">
                  <span className="ghost-text">{query}</span>
                  <span className="block-cursor" />
                </span>
              )}
            </div>
            <div className="term-kbd">
              <kbd>/</kbd>
            </div>
          </div>

          <div className="term-log">
            <span className="green">[ok]</span> matched{' '}
            <span className="amber">{flatIds.length}</span> of{' '}
            <span className="amber">{prompts.length}</span>
            <span className="dim">
              {' '}
              · press <kbd className="tkbd">n</kbd> to create · <kbd className="tkbd">?</kbd> for
              keys
            </span>
          </div>

          {mode === 'view' && active && (
            <article className="term-card">
              <div className="term-card-head">
                <div className="left">
                  <span>
                    <span className="amber">●</span> prompt
                  </span>
                  <span className="tag">@{active.category.toLowerCase()}</span>
                  {active.uses > 0 && (
                    <span className="green">
                      +{active.uses} {active.uses === 1 ? 'use' : 'uses'}
                    </span>
                  )}
                </div>
                <span title={new Date(active.updatedAt).toLocaleString()}>
                  updated {relativeTime(active.updatedAt)}
                </span>
              </div>
              <div className="term-card-body">
                <h2 className="term-card-title">{active.title}</h2>
                <div className="term-card-meta">
                  <span>
                    category:{' '}
                    <span style={{ color: '#7acc8e' }}>{active.category.toLowerCase()}</span>
                  </span>
                  {active.tags.length > 0 && (
                    <>
                      <span className="pipe">│</span>
                      <span>
                        tags:{' '}
                        {active.tags.map((t) => (
                          <span key={t} style={{ color: '#c0a4ff' }}>
                            #{t}{' '}
                          </span>
                        ))}
                      </span>
                    </>
                  )}
                  <span className="pipe">│</span>
                  <span>
                    created:{' '}
                    <span style={{ color: '#ffb454' }}>
                      {new Date(active.createdAt).toISOString().slice(0, 10)}
                    </span>
                  </span>
                </div>

                <div className="term-card-body-text">{active.body}</div>

                <div className="term-actions">
                  <button className="term-btn primary" onClick={copyActive}>
                    ⌘C · Copy prompt
                  </button>
                  <button className="term-btn" onClick={() => startEdit(active)}>
                    e · Edit
                  </button>
                  <button className="term-btn" onClick={duplicateActive}>
                    d · Duplicate
                  </button>
                  <button
                    className={`term-btn danger ${confirmDel === active.id ? 'confirm' : ''}`}
                    onClick={deleteActive}
                    style={{ marginLeft: 'auto' }}
                  >
                    {confirmDel === active.id ? 'press again to confirm' : '⌫ Delete'}
                  </button>
                </div>
              </div>
            </article>
          )}

          {mode === 'view' && !active && prompts.length === 0 && (
            <div className="term-empty">
              <div className="term-empty-head">// library is empty</div>
              <p>
                Press <kbd>n</kbd> to create your first prompt.
              </p>
              <div className="term-actions">
                <button className="term-btn primary" onClick={startNew}>
                  n · New prompt
                </button>
              </div>
            </div>
          )}

          {(mode === 'new' || mode === 'edit') && (
            <div className="term-compose">
              <div className="term-compose-head">
                <h3>
                  {mode === 'new' ? 'new.prompt.md' : filenameOf(draft.title || 'untitled') + '.md'}
                </h3>
                <span>
                  esc · cancel · <kbd className="tkbd">⌘</kbd>
                  <kbd className="tkbd">↵</kbd> save
                </span>
              </div>

              <div className="term-ffield">
                <label>title</label>
                <input
                  ref={titleRef}
                  placeholder="The Translator"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </div>

              <div className="term-ffield">
                <label>category</label>
                <input
                  placeholder="Writing"
                  list="term-cats"
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                />
                <datalist id="term-cats">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <div className="hint">choose an existing one or type a new name</div>
              </div>

              <div className="term-ffield">
                <label>tags</label>
                <input
                  placeholder="#writing #translation #stakeholder"
                  value={draft.tagsInput}
                  onChange={(e) => setDraft((d) => ({ ...d, tagsInput: e.target.value }))}
                />
                <div className="hint">comma or space separated · # optional</div>
              </div>

              <div className="term-ffield">
                <label>body</label>
                <textarea
                  placeholder="Translate this technical writeup for a non-engineer stakeholder..."
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                />
              </div>

              <div className="term-actions">
                <button className="term-btn primary" onClick={saveForm}>
                  ⌘↵ · {mode === 'new' ? 'write file' : 'save'}
                </button>
                <button className="term-btn" onClick={cancelForm}>
                  esc · cancel
                </button>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT: quick actions */}
        <aside className="term-help">
          <h4>Quick actions</h4>
          <div className="term-shortcuts">
            {shortcuts.map((s, i) => (
              <button
                key={i}
                className="term-shortcut-row"
                onClick={s.action}
                title="click, or press the shortcut"
              >
                <span className="term-shortcut-keys">
                  {s.keys.map((k, ki) => (
                    <kbd key={ki}>{k}</kbd>
                  ))}
                </span>
                <span className="term-shortcut-label">{s.label}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
      {flash && <div className="term-flash">{flash}</div>}
    </div>
  )
}
