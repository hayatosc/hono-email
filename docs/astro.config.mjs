import cloudflare from '@astrojs/cloudflare'
import starlight from '@astrojs/starlight'
// @ts-check
import { defineConfig } from 'astro/config'
import { createStarlightTypeDocPlugin } from 'starlight-typedoc'

import { markdownExport } from './src/integrations/markdown-export'
import { prerenderDocs } from './src/integrations/prerender-docs'

const [coreStarlightTypeDoc, coreTypeDocSidebarGroup] = createStarlightTypeDocPlugin()
const [previewStarlightTypeDoc, previewTypeDocSidebarGroup] = createStarlightTypeDocPlugin()
const [tailwindPluginStarlightTypeDoc, tailwindPluginTypeDocSidebarGroup] =
  createStarlightTypeDocPlugin()

// https://astro.build/config
export default defineConfig({
  output: 'server',
  // Docs are pure static content, so prerender in Node rather than spinning up
  // workerd at build time. The deployed worker still runs on Cloudflare.
  adapter: cloudflare({ prerenderEnvironment: 'node' }),
  integrations: [
    markdownExport(),
    prerenderDocs(),
    starlight({
      title: 'hono-email',
      pagefind: false,
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/hayatosc/hono-email',
        },
      ],
      plugins: [
        coreStarlightTypeDoc({
          entryPoints: [
            '../packages/core/src/index.ts',
            '../packages/core/src/adapter/index.ts',
            '../packages/core/src/adapter/smtp/index.ts',
            '../packages/core/src/adapter/cloudflare/index.ts',
            '../packages/core/src/adapter/provider/index.ts',
            '../packages/core/src/adapter/resend/index.ts',
            '../packages/core/src/adapter/sendgrid/index.ts',
            '../packages/core/src/adapter/postmark/index.ts',
            '../packages/core/src/adapter/mailgun/index.ts',
          ],
          output: 'api/core',
          tsconfig: '../packages/core/tsconfig.json',
          typeDoc: {
            includeVersion: true,
          },
        }),
        previewStarlightTypeDoc({
          entryPoints: ['../packages/preview/src/index.ts'],
          output: 'api/preview',
          tsconfig: '../packages/preview/tsconfig.json',
          typeDoc: {
            includeVersion: true,
          },
        }),
        tailwindPluginStarlightTypeDoc({
          entryPoints: ['../packages/tailwind-plugin/src/index.ts'],
          output: 'api/tailwind-plugin',
          tsconfig: '../packages/tailwind-plugin/tsconfig.json',
          typeDoc: {
            includeVersion: true,
          },
        }),
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', slug: 'getting-started/overview' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
          ],
        },
        {
          label: 'Core',
          items: [
            { label: 'render()', slug: 'core/render' },
            { label: 'Components', slug: 'core/components' },
            { label: 'Strict Mode', slug: 'core/strict-mode' },
            { label: 'Testing', slug: 'core/testing' },
          ],
        },
        {
          label: 'Styling',
          items: [
            { label: 'Overview', slug: 'styling/overview' },
            { label: 'hono/css', slug: 'styling/hono-css' },
            { label: 'Tailwind', slug: 'styling/tailwind' },
            { label: 'Font', slug: 'styling/font' },
          ],
        },
        {
          label: 'Markdown',
          items: [
            { label: 'Markdown component', slug: 'markdown/overview' },
            { label: 'With Tailwind', slug: 'markdown/with-tailwind' },
          ],
        },
        {
          label: 'Adapters',
          items: [
            { label: 'SMTP', slug: 'adapters/smtp' },
            { label: 'Resend', slug: 'adapters/resend' },
            { label: 'SendGrid', slug: 'adapters/sendgrid' },
            { label: 'Postmark', slug: 'adapters/postmark' },
            { label: 'Mailgun', slug: 'adapters/mailgun' },
            { label: 'Cloudflare Email', slug: 'adapters/cloudflare' },
          ],
        },
        {
          label: 'Tooling',
          items: [
            { label: 'Live Preview', slug: 'tooling/live-preview' },
            { label: 'Development', slug: 'tooling/development' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            coreTypeDocSidebarGroup,
            previewTypeDocSidebarGroup,
            tailwindPluginTypeDocSidebarGroup,
          ],
        },
      ],
    }),
  ],
})
