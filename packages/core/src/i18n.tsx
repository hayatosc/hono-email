import { createContext, useContext } from 'hono/jsx'
import type { Child, Context, FC } from 'hono/jsx'

/**
 * Context storing the active email locale. Defaults to `'en'`.
 */
export const LocaleContext: Context<string> = createContext<string>('en')

export type LocaleProviderProps = {
  locale: string
  children?: Child
}

/**
 * Provides an email locale context to descendant JSX components.
 *
 * @param props - Component props containing `locale` and optional `children`.
 *
 * @example
 * ```tsx
 * <LocaleProvider locale="ja">
 *   <EmailBody />
 * </LocaleProvider>
 * ```
 */
export const LocaleProvider: FC<LocaleProviderProps> = ({ locale, children }) => (
  <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
)

/**
 * Wraps a JSX tree in LocaleProvider if locale is specified.
 */
export const wrapWithLocaleProvider = (jsx: Child, locale?: string): Child =>
  locale ? <LocaleProvider locale={locale}>{jsx}</LocaleProvider> : jsx

/**
 * Returns the current email locale (e.g., `'ja'`, `'en-US'`) from context.
 * Falls back to `'en'` when rendered outside a `LocaleProvider`.
 *
 * @example
 * ```tsx
 * const Greeting = () => {
 *   const locale = useLocale()
 *   return <Text>{locale === 'ja' ? 'こんにちは' : 'Hello'}</Text>
 * }
 * ```
 */
export const useLocale = (): string => useContext(LocaleContext)

/**
 * Lightweight catalog translator helper with progressive locale fallback.
 *
 * Fallback order for `'pt-BR'`:
 * 1. Exact match (`'pt-BR'`)
 * 2. Language-only subtag (`'pt'`)
 * 3. Default locale (`defaultLocale`, defaults to `'en'`)
 *
 * @param catalogs - Dictionary mapping locale codes to translation objects.
 * @param defaultLocale - Fallback locale code. Defaults to `'en'`.
 * @returns A translation resolver function accepting an optional locale override (defaults to `useLocale()`).
 *
 * @example
 * ```tsx
 * const t = createTranslator({
 *   en: { greeting: 'Hello' },
 *   ja: { greeting: 'こんにちは' },
 * })
 *
 * const Greeting = () => {
 *   const { greeting } = t()
 *   return <Text>{greeting}</Text>
 * }
 * ```
 */
export function createTranslator<TDict extends Record<string, unknown>>(
  catalogs: Record<string, TDict>,
  defaultLocale = 'en',
): (locale?: string) => TDict {
  return (locale = useLocale()): TDict => {
    const directMatch = catalogs[locale]
    if (directMatch !== undefined) {
      return directMatch
    }
    const languageOnly = locale.split('-')[0]
    if (languageOnly !== undefined) {
      const languageMatch = catalogs[languageOnly]
      if (languageMatch !== undefined) {
        return languageMatch
      }
    }
    const defaultMatch = catalogs[defaultLocale]
    if (defaultMatch !== undefined) {
      return defaultMatch
    }
    const firstMatch = Object.values(catalogs)[0]
    if (firstMatch !== undefined) {
      return firstMatch
    }
    throw new Error(
      `[hono-email] Translation catalog for defaultLocale "${defaultLocale}" not found in catalogs: [${Object.keys(catalogs).join(', ')}]`,
    )
  }
}
