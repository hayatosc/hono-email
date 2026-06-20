/**
 * Minimal structural view of a Vite `EnvironmentModuleNode` needed to walk the
 * importer chain. Kept free of Vite types so the dependency-resolution logic
 * can be unit-tested in isolation.
 */
export interface ImporterNode {
  file: string | null
  importers: Iterable<ImporterNode>
}

/**
 * Decide whether a changed file should refresh the preview.
 *
 * Returns `true` when the change is a template itself (covers direct edits and
 * templates not yet present in the module graph) or when it is a module that a
 * template imports — found by walking the importer chain up to a template.
 */
export function isAffectedByChange(
  changedFile: string | null,
  modules: Iterable<ImporterNode>,
  isTemplateFile: (file: string | null) => boolean,
): boolean {
  if (isTemplateFile(changedFile)) {
    return true
  }

  const seen = new Set<ImporterNode>()
  const stack: ImporterNode[] = [...modules]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node || seen.has(node)) {
      continue
    }
    seen.add(node)
    if (isTemplateFile(node.file)) {
      return true
    }
    for (const importer of node.importers) {
      stack.push(importer)
    }
  }

  return false
}
