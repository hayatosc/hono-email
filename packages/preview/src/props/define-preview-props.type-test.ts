import { definePreviewProps, type PreviewPropsConfig } from './index'

type Props = {
  name: string
  count: number
  enabled?: boolean
  theme: 'light' | 'dark'
  items: { label: string; quantity: number }[]
}

const define = definePreviewProps<Props>()
const config = define({
  name: { default: 'Guest', multiline: true },
  count: { type: 'number', default: 3 },
  enabled: { type: 'boolean', default: true },
  theme: { type: 'select', options: ['light', 'dark'], default: 'light' },
  items: { type: 'array', item: { label: { type: 'string' }, quantity: { type: 'number' } } },
})

const legacy: PreviewPropsConfig = config
const selectType: 'select' = config.theme.type
void legacy
void selectType

// @ts-expect-error Unknown component prop.
define({ missing: { type: 'string' } })
// @ts-expect-error The input type must match the component prop.
define({ count: { type: 'string' } })
// @ts-expect-error Defaults must be assignable to the component prop.
define({ count: { default: 'three' } })
// @ts-expect-error Select options must belong to the component's union.
define({ theme: { type: 'select', options: ['blue'] } })
// @ts-expect-error Nested defaults must match the array item props.
define({ items: { type: 'array', item: { quantity: { default: 'many' } } } })
// @ts-expect-error Nested schema keys must belong to the array item props.
define({ items: { type: 'array', item: { missing: { type: 'string' } } } })

const extra = { name: { default: 'Guest' }, typo: { default: 'Guest' } }
// @ts-expect-error Extra keys are rejected even when passed through a variable.
define(extra)

// @ts-expect-error A number needs an explicit type or a numeric default for runtime inference.
define({ count: { required: true } })
// @ts-expect-error A boolean without runtime type information becomes a string field.
define({ enabled: {} })
// @ts-expect-error Object arrays need an item schema for the structured form.
define({ items: { type: 'array', default: [{ label: 'Item', quantity: 1 }] } })
// @ts-expect-error A null default cannot infer a numeric field.
definePreviewProps<{ count: number | null }>()({ count: { default: null } })
// @ts-expect-error The list editor emits strings and cannot edit numeric array elements.
definePreviewProps<{ counts: number[] }>()({ counts: { type: 'array', default: [1] } })
