import { Body, Head, Html, Tailwind, Text, renderWithWarnings } from '../../src'

const result = await renderWithWarnings(
  <Html lang='en'>
    <Head>
      <title>Tailwind example</title>
    </Head>
    <Tailwind
      config={{
        theme: {
          extend: {
            colors: {
              brand: '#0f172a',
            },
          },
        },
      }}
    >
      <Body>
        <Text className='text-brand bg-brand px-4 py-2 rounded sm:text-blue-500'>Hello from Tailwind.</Text>
      </Body>
    </Tailwind>
  </Html>
)

console.log(result.html)
console.log('--- warnings ---')
console.log(result.warnings)
