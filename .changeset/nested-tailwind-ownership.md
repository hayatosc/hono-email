---
'hono-email': patch
---

Support nested Tailwind wrappers with explicit ownership by the nearest wrapper. Preserve inner artifacts' inline styles, original and renamed classes, head CSS, and dropped-class warnings without outer wrappers revalidating or reapplying processed HTML. Missing classes in each wrapper's own scope still reject rendering.
