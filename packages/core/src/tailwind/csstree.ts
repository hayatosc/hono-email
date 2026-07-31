import { generate, parse } from 'css-tree'
import type { Atrule, CssNode, Declaration, Rule, StyleSheet } from 'css-tree'

export { parse, generate }
export type { Atrule, CssNode, Declaration, Rule, StyleSheet }

/** A CSS declaration and the source range occupied by its value. */
export type CssDeclaration = {
  property: string
  value: string
  valueStart: number
  valueEnd: number
}

/**
 * Collects declarations from CSS blocks without inspecting rule preludes.
 *
 * @param cssText - CSS stylesheet text to parse.
 * @returns Declarations nested in rule and at-rule blocks, including source offsets for their values.
 */
export const collectCssDeclarations = (cssText: string): CssDeclaration[] => {
  const parsed = parse(cssText, { positions: true })
  if (parsed.type !== 'StyleSheet') {
    return []
  }

  const declarations: CssDeclaration[] = []

  const collect = (nodes: CssNode[]): void => {
    for (const node of nodes) {
      if (node.type === 'Declaration') {
        const valueLocation = node.value.loc
        if (!valueLocation) {
          continue
        }

        declarations.push({
          property: node.property,
          value: cssText.slice(valueLocation.start.offset, valueLocation.end.offset),
          valueStart: valueLocation.start.offset,
          valueEnd: valueLocation.end.offset,
        })
        continue
      }

      if ((node.type === 'Rule' || node.type === 'Atrule') && node.block) {
        collect([...node.block.children])
      }
    }
  }

  collect([...parsed.children])
  return declarations
}
