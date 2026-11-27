const linterDirective = /^(?:oxlint|eslint)(?:-(?:disable|enable|env)\b|(?=\s|$))/u
const compilerDirective = /^@ts-(?:ignore|nocheck|expect-error)\b/u
const formatDirective = /^(?:oxfmt|prettier)-ignore\b/u

/** @param {string} value @param {string} filename */
export function suppressionProblem(value, filename, { lintOnly = false } = {}) {
  const comment = value.trim().replace(/^\*\s*/u, '')
  if (linterDirective.test(comment)) return 'Inline Oxlint and ESLint directives are not allowed.'
  if (lintOnly) return
  if (compilerDirective.test(comment)) {
    if (filename.endsWith('.type-test.ts') && /^@ts-expect-error\s+\S/u.test(comment)) return
    return 'Type suppression is restricted to documented @ts-expect-error in .type-test.ts files.'
  }
  if (formatDirective.test(comment)) return 'Inline format directives are not allowed.'
}

/** @param {string} value @param {string} followingText */
export function redundantCommentProblem(value, followingText) {
  const comment = value.trim()
  if (
    /^(?:-{3,}|={3,}|\*{3,})(?:\s|$)/u.test(comment) ||
    /^(?:arrange|act|assert|given|when|then)\s*:?$/iu.test(comment) ||
    /^step\s+\d+\s*[:.):-]/iu.test(comment)
  ) {
    return 'Remove section markers and step labels; use named code or separate tests.'
  }
  if (
    /^(?:i|we)\s+(?:added|updated|removed|changed|implemented|refactored|renamed)\b/iu.test(comment)
  ) {
    return 'Put change narration in the commit message, not the source.'
  }
  const name = followingText.match(
    /^\s*(?:export\s+)?(?:(?:declare|async)\s+)?(?:const|let|function|class|interface|type)\s+([\w$]+)/u,
  )?.[1]
  if (
    name &&
    comment
      .replace(/^\*\s*/u, '')
      .replaceAll(/[\s`._-]/gu, '')
      .toLowerCase() === name.replaceAll(/[_$]/gu, '').toLowerCase()
  ) {
    return 'Remove comments that only repeat the declaration name.'
  }
}
