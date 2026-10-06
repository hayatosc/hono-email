---
'hono-email': patch
---

Use the shared source-preserving HTML tokenizer for preview relocation, widow prevention, and strict tag validation. Preserve quoted attributes, literal less-than signs, and raw text while retaining tag, URL, and CSS restrictions in Outlook conditional comments. Reject incomplete markup in strict validation instead of hiding restricted content, and keep existing attribute parsing behavior.
