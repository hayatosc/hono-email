import { Body, Head, Html, Tailwind, Text, buildTailwindArtifactFromCss, renderWithWarnings } from '../../src'

const tailwindEmailCss = `
@layer utilities {
  .bg-brand { background-color: #0f172a; }
  .text-brand { color: #0f172a; }
  .text-white { color: #ffffff; }
  .rounded-lg { border-radius: 0.5rem; }
  .px-4 { padding-inline: 1rem; }
  .py-2 { padding-block: 0.5rem; }
  .sm\\:text-blue-500 { @media (width >= 40rem) { color: #3b82f6; } }
}
`

const artifact = buildTailwindArtifactFromCss({ css: tailwindEmailCss })

const result = await renderWithWarnings(
  <Html lang='en'>
    <Head>
      <title>Tailwind example</title>
    </Head>
    <Tailwind artifact={artifact}>
      <Body>
        <Text className='text-brand bg-brand text-white px-4 py-2 rounded-lg sm:text-blue-500'>
          Hello from Tailwind.
        </Text>
      </Body>
    </Tailwind>
  </Html>
)

console.log(result.html)
console.log(result.warnings)
