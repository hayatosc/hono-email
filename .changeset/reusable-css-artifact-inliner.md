---
'hono-email': patch
---

Extract CSS artifact building and HTML inlining into shared internal modules. Tailwind keeps its existing artifact API and rendering behavior, while hono/css uses the generic helpers directly. Preserve CSS ordering, class renaming, warnings, and Markdown parent guards.
