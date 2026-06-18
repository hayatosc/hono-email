---
'@hono-email/preview': minor
---

Add structured props editing to the preview form. `previewProps` now supports
`multiline: true` to edit string props in a textarea, and `item` to describe the
fields of an object array so each element is edited with add/remove controls
instead of a single text box. Object arrays and multiline strings no longer break
the rendered preview when edited.
