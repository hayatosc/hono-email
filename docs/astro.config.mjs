import cloudflare from '@astrojs/cloudflare'
import starlight from '@astrojs/starlight'
// @ts-check
import { defineConfig } from 'astro/config'

import { markdownExport } from './src/integrations/markdown-export'
import { prerenderDocs } from './src/integrations/prerender-docs'

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
      components: {
        PageTitle: './src/components/PageTitle.astro',
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4,
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/hayatosc/hono-email',
        },
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
            { label: 'Strict Mode', slug: 'core/strict-mode' },
          ],
        },
        {
          label: 'Components',
          items: [
            { label: 'Document Structure', slug: 'components/document-structure' },
            { label: 'Layout', slug: 'components/layout' },
            { label: 'Typography', slug: 'components/typography' },
            { label: 'Styling Helpers', slug: 'components/styling-helpers' },
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
            { label: 'Custom Adapters', slug: 'api/custom-adapters' },
          ],
        },
        {
          label: 'Tooling',
          items: [
            { label: 'Live Preview', slug: 'tooling/live-preview' },
            { label: 'Testing', slug: 'tooling/testing' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'Email Types', slug: 'api/email-types' },
            { label: 'Adapter Options', slug: 'api/adapter-options' },
            { label: 'Plugin Options', slug: 'api/plugin-options' },
          ],
        },
      ],
    }),
  ],
})
