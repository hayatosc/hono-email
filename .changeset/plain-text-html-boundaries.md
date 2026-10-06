---
'hono-email': patch
---

Use the shared HTML tokenizer for plain-text conversion. Respect quoted attribute boundaries, exclude entire nested preview subtrees and unclosed comments or CSS/script content, and preserve literal text while retaining plain-text formatting options and Outlook comment handling.
