import { indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView, keymap } from '@codemirror/view'
import { tags } from '@lezer/highlight'
import { basicSetup } from 'codemirror'

// Colors come from CSS custom properties defined in Playground.svelte so the
// editor follows Starlight's light/dark theme switch without reconfiguring.
const highlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.operatorKeyword, tags.modifier], color: 'var(--pg-syntax-keyword)' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: 'var(--pg-syntax-string)' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: 'var(--pg-syntax-number)' },
  { tag: [tags.comment, tags.meta], color: 'var(--pg-syntax-comment)', fontStyle: 'italic' },
  { tag: [tags.tagName, tags.typeName, tags.className], color: 'var(--pg-syntax-tag)' },
  { tag: [tags.attributeName, tags.propertyName], color: 'var(--pg-syntax-attribute)' },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: 'var(--pg-syntax-function)',
  },
  { tag: tags.invalid, color: 'var(--pg-syntax-invalid)' },
])

const theme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--sl-color-white)',
    backgroundColor: 'transparent',
    fontSize: '0.8125rem',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--sl-font-mono)', lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--sl-color-white)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--sl-color-white)' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--sl-color-gray-4)',
    border: 'none',
  },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--pg-active-line)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--pg-selection)',
  },
  '.cm-matchingBracket': { backgroundColor: 'var(--pg-selection)', outline: 'none' },
  '.cm-tooltip': {
    backgroundColor: 'var(--sl-color-bg)',
    border: '1px solid var(--sl-color-hairline)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--pg-selection)',
    color: 'var(--sl-color-white)',
  },
})

/**
 * Mounts a TSX editor.
 *
 * @param parent - Element the editor is appended to.
 * @param doc - Initial source.
 * @param onChange - Called with the full source after each edit.
 * @returns The editor view; call `destroy()` to unmount it.
 */
export const createEditor = (
  parent: HTMLElement,
  doc: string,
  onChange: (source: string) => void,
): EditorView =>
  new EditorView({
    parent,
    doc,
    extensions: [
      basicSetup,
      keymap.of([indentWithTab]),
      javascript({ jsx: true, typescript: true }),
      syntaxHighlighting(highlightStyle),
      theme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString())
      }),
    ],
  })
