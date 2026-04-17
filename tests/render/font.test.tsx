import { afterEach, describe, expect, mock, test } from 'bun:test'

import { Body, Font, Head, Html, render } from '../../src'

const originalFetch = globalThis.fetch

const createJsonResponse = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: {
      'content-type': 'application/json',
    },
  })

const createTextResponse = (value: string) =>
  new Response(value, {
    headers: {
      'content-type': 'text/css',
    },
  })

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Font', () => {
  test('resolves font-face CSS through unifont google provider by default', async () => {
    globalThis.fetch = mock((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (url === 'https://fonts.google.com/metadata/fonts') {
        return Promise.resolve(
          createJsonResponse({
            familyMetadataList: [
              {
                axes: [],
                family: 'Poppins',
                fonts: {
                  '400': {},
                },
              },
            ],
          })
        )
      }

      if (url.startsWith('https://fonts.googleapis.com/css2')) {
        return Promise.resolve(
          createTextResponse(`
            /* latin */
            @font-face {
              font-family: 'Poppins';
              font-style: normal;
              font-weight: 400;
              src: url(https://fonts.gstatic.com/s/poppins/v20/poppins.woff2) format('woff2');
              unicode-range: U+000-5FF;
            }
          `)
        )
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    }) as unknown as typeof globalThis.fetch

    const html = await render(
      <Html>
        <Head>
          <Font
            fallbackFontFamily={['Arial', 'sans-serif']}
            fontFamily='Poppins'
            source={{
              providerOptions: {
                __testCase: 'google-default',
              },
              subsets: ['latin'],
              weights: ['400'],
            }}
          />
        </Head>
        <Body>
          <p>Hello</p>
        </Body>
      </Html>
    )

    expect(html).toContain('<style>')
    expect(html).toContain("@font-face {font-family: 'Poppins';")
    expect(html).toContain("src: url(https://fonts.gstatic.com/s/poppins/v20/poppins.woff2) format('woff2');")
    expect(html).toContain("mso-font-alt: 'Arial';")
    expect(html).toContain("* { font-family: 'Poppins', 'Arial', sans-serif; }")
  })

  test('falls back to local stack when font resolution returns no remote font', async () => {
    globalThis.fetch = mock((input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (url === 'https://fonts.google.com/metadata/fonts') {
        return Promise.resolve(
          createJsonResponse({
            familyMetadataList: [],
          })
        )
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`))
    }) as unknown as typeof globalThis.fetch

    const html = await render(
      <Html>
        <Head>
          <Font
            fallbackFontFamily='Arial'
            fontFamily='Missing Font'
            source={{
              providerOptions: {
                __testCase: 'missing-font',
              },
            }}
          />
        </Head>
        <Body>
          <p>Hello</p>
        </Body>
      </Html>
    )

    expect(html).toContain("<style>* { font-family: 'Missing Font', 'Arial'; }</style>")
    expect(html).not.toContain('@font-face')
  })

  test('is rejected outside head in strict mode', async () => {
    await expect(
      render(
        <Html>
          <Body>
            <Font
              fallbackFontFamily='Arial'
              fontFamily='Inter'
              webFont={{
                format: 'woff2',
                url: 'https://example.com/inter.woff2',
              }}
            />
          </Body>
        </Html>
      )
    ).rejects.toThrow(
      "The <style> tag must be placed inside <Head> in HTML email strict mode. Move shared CSS into <Head>, or use inline style props for element-level styling."
    )
  })
})
