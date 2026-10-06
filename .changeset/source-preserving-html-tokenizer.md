---
'hono-email': patch
---

Add an internal source-preserving HTML tokenizer and use it in the shared transform walker. Preserve quoted attribute boundaries, literal less-than signs, unclosed comments, and raw text contexts while retaining existing skip-region behavior.
