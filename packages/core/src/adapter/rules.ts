import type {
  EmailAdapter,
  EmailAddress,
  EmailMessage,
  EmailSendOptions,
  SendEmailReceipt,
} from './index'
import { addressToPath, formatEmailAddress, toAddressList } from './message'

/**
 * Options for intercepting outgoing email destinations (e.g. for staging or QA environments).
 */
export type InterceptOptions = {
  /**
   * Destination address(es) to redirect intercepted messages to.
   */
  to: EmailAddress | EmailAddress[]

  /**
   * Addresses or domain patterns that are allowed to pass through without being intercepted.
   * Can be strings (e.g. `'@mycompany.com'` or exact email `'alice@example.com'`) or RegExp.
   */
  allowList?: (string | RegExp)[] | undefined

  /**
   * Optional prefix prepended to the email subject (e.g. `"[STAGING] "`).
   */
  subjectPrefix?: string | undefined
}

/**
 * Options for configuring email delivery rules (destination intercept and suppression filtering).
 */
export type DeliveryRulesOptions = {
  /**
   * Redirects all emails to designated address(es) (e.g. for staging).
   * Addresses matching allowList pass through unchanged.
   */
  intercept?: InterceptOptions | undefined

  /**
   * Suppresses delivery to specified email addresses (e.g. opt-outs or bounces).
   * Can be an Iterable of string addresses, or an async/sync predicate function.
   */
  suppress?: Iterable<string> | ((address: string) => boolean | Promise<boolean>) | undefined
}

function isAddressAllowed(address: string, allowList: (string | RegExp)[]): boolean {
  const normalized = address.toLowerCase()
  for (const rule of allowList) {
    if (typeof rule === 'string') {
      const lowerRule = rule.toLowerCase()
      if (lowerRule.startsWith('@')) {
        if (normalized.endsWith(lowerRule)) {
          return true
        }
      } else if (normalized === lowerRule) {
        return true
      }
    } else if (rule instanceof RegExp) {
      if (rule.test(normalized)) {
        return true
      }
    }
  }
  return false
}

/**
 * Wraps an EmailAdapter with destination interception and address suppression rules.
 *
 * 1. Filters suppressed addresses from `to`, `cc`, and `bcc`.
 * 2. If all recipients are suppressed, returns a skipped receipt without invoking the adapter.
 * 3. If `intercept` is configured and any recipient is outside the `allowList`, rewrites
 *    recipients to `intercept.to`, adds an `X-Original-To` header, and applies `subjectPrefix`.
 *
 * @param adapter - Underlying EmailAdapter to wrap.
 * @param rules - Intercept and suppression configuration.
 * @returns Wrapped EmailAdapter enforcing delivery rules.
 *
 * @example
 * ```ts
 * const stagingAdapter = withDeliveryRules(productionAdapter, {
 *   intercept: {
 *     to: 'qa-catchall@example.com',
 *     allowList: [/@example\.com$/],
 *     subjectPrefix: '[STAGING] ',
 *   },
 *   suppress: bouncedEmailSet,
 * })
 * ```
 */
export function withDeliveryRules(
  adapter: EmailAdapter,
  rules: DeliveryRulesOptions,
): EmailAdapter {
  if (typeof adapter !== 'object' || adapter === null || typeof adapter.send !== 'function') {
    throw new Error('withDeliveryRules requires an adapter with a send() method.')
  }

  let suppressSet: Set<string> | undefined
  if (rules.suppress !== undefined && typeof rules.suppress !== 'function') {
    suppressSet = new Set<string>()
    for (const item of rules.suppress) {
      suppressSet.add(item.trim().toLowerCase())
    }
  }

  const isSuppressed = async (addr: EmailAddress): Promise<boolean> => {
    if (rules.suppress === undefined) {
      return false
    }
    const emailPath = addressToPath(addr).toLowerCase()
    if (typeof rules.suppress === 'function') {
      return await rules.suppress(emailPath)
    }
    return suppressSet !== undefined && suppressSet.has(emailPath)
  }

  const filterList = async (list: EmailAddress[]): Promise<EmailAddress[]> => {
    const kept: EmailAddress[] = []
    for (const addr of list) {
      if (!(await isSuppressed(addr))) {
        kept.push(addr)
      }
    }
    return kept
  }

  return {
    async send(message: EmailMessage, options?: EmailSendOptions): Promise<SendEmailReceipt> {
      let toList = toAddressList(message.to)
      let ccList = toAddressList(message.cc)
      let bccList = toAddressList(message.bcc)

      if (rules.suppress !== undefined) {
        toList = await filterList(toList)
        ccList = await filterList(ccList)
        bccList = await filterList(bccList)

        if (toList.length === 0 && ccList.length === 0 && bccList.length === 0) {
          return {
            successful: true,
            messageId: 'skipped',
            accepted: [],
            rejected: [],
            response: '250 Message skipped (all recipients suppressed)',
          }
        }
      }

      const firstTo = toList[0]
      let toRecipients: EmailAddress | EmailAddress[] =
        toList.length === 1 && firstTo !== undefined ? firstTo : toList
      const firstCc = ccList[0]
      let ccRecipients: EmailAddress | EmailAddress[] | undefined =
        ccList.length === 1 && firstCc !== undefined
          ? firstCc
          : ccList.length > 1
            ? ccList
            : undefined
      const firstBcc = bccList[0]
      let bccRecipients: EmailAddress | EmailAddress[] | undefined =
        bccList.length === 1 && firstBcc !== undefined
          ? firstBcc
          : bccList.length > 1
            ? bccList
            : undefined
      let subject = message.subject
      let headers = message.headers
      let envelope = message.envelope

      if (rules.intercept !== undefined) {
        const allowList = rules.intercept.allowList ?? []
        const originalRecipients = [
          ...toList.map((a) => formatEmailAddress(a)),
          ...ccList.map((a) => formatEmailAddress(a)),
          ...bccList.map((a) => formatEmailAddress(a)),
        ]

        const areAllAllowed =
          allowList.length > 0 &&
          toList.every((a) => isAddressAllowed(addressToPath(a), allowList)) &&
          ccList.every((a) => isAddressAllowed(addressToPath(a), allowList)) &&
          bccList.every((a) => isAddressAllowed(addressToPath(a), allowList))

        if (!areAllAllowed) {
          toRecipients = rules.intercept.to
          ccRecipients = undefined
          bccRecipients = undefined

          if (rules.intercept.subjectPrefix !== undefined) {
            subject = `${rules.intercept.subjectPrefix}${message.subject}`
          }

          headers = {
            ...headers,
            'X-Original-To': originalRecipients.join(', '),
          }

          if (envelope !== undefined) {
            envelope = {
              ...(envelope.from !== undefined ? { from: envelope.from } : {}),
              to: rules.intercept.to,
            }
          }
        }
      }

      const transformed: EmailMessage = {
        from: message.from,
        to: toRecipients,
        subject,
        html: message.html,
        text: message.text,
        ...(ccRecipients !== undefined ? { cc: ccRecipients } : {}),
        ...(bccRecipients !== undefined ? { bcc: bccRecipients } : {}),
        ...(headers !== undefined ? { headers } : {}),
        ...(message.replyTo !== undefined ? { replyTo: message.replyTo } : {}),
        ...(message.attachments !== undefined ? { attachments: message.attachments } : {}),
        ...(message.messageId !== undefined ? { messageId: message.messageId } : {}),
        ...(message.idempotencyKey !== undefined ? { idempotencyKey: message.idempotencyKey } : {}),
        ...(message.date !== undefined ? { date: message.date } : {}),
        ...(envelope !== undefined ? { envelope } : {}),
        ...(message.dkim !== undefined ? { dkim: message.dkim } : {}),
        ...(message.unsubscribe !== undefined ? { unsubscribe: message.unsubscribe } : {}),
      }

      return options !== undefined ? adapter.send(transformed, options) : adapter.send(transformed)
    },
  }
}
