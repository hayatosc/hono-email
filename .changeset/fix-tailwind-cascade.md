---
'hono-email': patch
'@hono-email/tailwind-plugin': patch
---

Fix Tailwind inlining so group and peer marker classes render without missing-class errors, CSS rule order is preserved, explicit inline styles win, and warning markers cannot be forged by document content. Markdown element styles no longer override an element's own `style` attribute. Aliased `Tailwind` imports now receive build-time artifact injection.
