import { redundantCommentProblem, suppressionProblem } from './comment-policy.mjs'

/** @typedef {Parameters<import('oxlint/plugins-dev').RuleTester['run']>[1]} Rule */
/** @typedef {ReturnType<NonNullable<Rule['create']>>} Visitor */

const plugin = {
  meta: { name: 'hono-email' },
  rules: /** @satisfies {Record<string, Rule>} */ ({
    'no-redundant-comments': {
      create(context) {
        return {
          Program() {
            for (const comment of context.sourceCode.getAllComments()) {
              const message = redundantCommentProblem(
                comment.value,
                context.sourceCode.text.slice(comment.range[1]),
              )
              if (message) context.report({ loc: comment.loc, message })
            }
          },
        }
      },
    },
    'no-inline-suppressions': {
      create(context) {
        return {
          Program() {
            for (const comment of context.sourceCode.getAllComments()) {
              const message = suppressionProblem(comment.value, context.filename)
              if (!message) continue
              // A disable range can overlap the delimiters of its own comment.
              const offset = comment.range[0] + 3
              const start = context.sourceCode.getLocFromIndex(offset)
              const end = context.sourceCode.getLocFromIndex(offset + 1)
              context.report({ loc: { start, end }, message })
            }
          },
        }
      },
    },
    'no-double-assertions': {
      create(context) {
        /** @param {Parameters<NonNullable<Visitor['TSAsExpression'] | Visitor['TSTypeAssertion']>>[0]} node */
        function check(node) {
          if (
            node.expression.type === 'TSAsExpression' ||
            node.expression.type === 'TSTypeAssertion'
          ) {
            context.report({
              node,
              message: 'Narrow the value instead of chaining type assertions.',
            })
          }
        }
        return { TSAsExpression: check, TSTypeAssertion: check }
      },
    },
  }),
}

export default plugin
