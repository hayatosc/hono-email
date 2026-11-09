import { describe, expect, it } from 'vitest'

import { createTranslator, LocaleProvider, useLocale } from './i18n'
import { Body, Html, render, Text } from './index'

describe('i18n (LocaleContext, useLocale, createTranslator)', () => {
  it('useLocale returns "en" by default outside LocaleProvider', async () => {
    let capturedLocale = ''
    const TestComponent = () => {
      capturedLocale = useLocale()
      return <Text>{capturedLocale}</Text>
    }

    await render(<TestComponent />)
    expect(capturedLocale).toBe('en')
  })

  it('LocaleProvider provides custom locale to descendant components', async () => {
    let capturedLocale = ''
    const TestComponent = () => {
      capturedLocale = useLocale()
      return <Text>{capturedLocale}</Text>
    }

    await render(
      <LocaleProvider locale="fr-FR">
        <TestComponent />
      </LocaleProvider>,
    )
    expect(capturedLocale).toBe('fr-FR')
  })

  it('render({ locale: "ja" }) automatically wraps root in LocaleProvider', async () => {
    let capturedLocale = ''
    const DeepChild = () => {
      capturedLocale = useLocale()
      return <Text>Locale is {capturedLocale}</Text>
    }

    const { html } = await render(
      <Html>
        <Body>
          <DeepChild />
        </Body>
      </Html>,
      { locale: 'ja' },
    )

    expect(capturedLocale).toBe('ja')
    expect(html).toContain('Locale is ja')
  })

  it('nested LocaleProvider overrides ancestor locale', async () => {
    let outerLocale = ''
    let innerLocale = ''

    const Outer = () => {
      outerLocale = useLocale()
      return (
        <LocaleProvider locale="de">
          <Inner />
        </LocaleProvider>
      )
    }

    const Inner = () => {
      innerLocale = useLocale()
      return <Text>{innerLocale}</Text>
    }

    await render(<Outer />, { locale: 'ja' })
    expect(outerLocale).toBe('ja')
    expect(innerLocale).toBe('de')
  })

  it('createTranslator resolves exact matches', () => {
    const t = createTranslator({
      en: { title: 'Welcome' },
      ja: { title: 'ようこそ' },
      'pt-BR': { title: 'Bem-vindo ao Brasil' },
    })

    expect(t('en')).toEqual({ title: 'Welcome' })
    expect(t('ja')).toEqual({ title: 'ようこそ' })
    expect(t('pt-BR')).toEqual({ title: 'Bem-vindo ao Brasil' })
  })

  it('createTranslator falls back to language-only subtag before defaultLocale', () => {
    const t = createTranslator({
      en: { title: 'Welcome' },
      pt: { title: 'Bem-vindo' },
      'ja-JP': { title: 'ようこそ日本' },
    })

    // 'pt-BR' has no exact match, falls back to 'pt'
    expect(t('pt-BR')).toEqual({ title: 'Bem-vindo' })
  })

  it('createTranslator falls back to defaultLocale when neither exact nor language prefix matches', () => {
    const t = createTranslator({
      en: { title: 'Welcome' },
      ja: { title: 'ようこそ' },
    })

    expect(t('es-ES')).toEqual({ title: 'Welcome' })
    expect(t('de')).toEqual({ title: 'Welcome' })
  })

  it('createTranslator respects custom defaultLocale', () => {
    const t = createTranslator(
      {
        en: { title: 'Welcome' },
        ja: { title: 'ようこそ' },
      },
      'ja',
    )

    expect(t('ko-KR')).toEqual({ title: 'ようこそ' })
  })

  it('createTranslator automatically uses useLocale() inside rendered components', async () => {
    const t = createTranslator({
      en: { greeting: 'Hello' },
      ja: { greeting: 'こんにちは' },
    })

    const GreetingComponent = () => {
      const { greeting } = t()
      return <Text>{greeting}</Text>
    }

    const enResult = await render(<GreetingComponent />, { locale: 'en' })
    expect(enResult.html).toContain('Hello')

    const jaResult = await render(<GreetingComponent />, { locale: 'ja' })
    expect(jaResult.html).toContain('こんにちは')
  })
})
