---
'hono-email': patch
---

Reject synchronous and asynchronous JSX rendering failures instead of returning incomplete HTML, including missing Tailwind classes, errors inside Conditional, and rendering callback failures. Preserve the original thrown value and prevent failed drafts from reaching email adapters.
