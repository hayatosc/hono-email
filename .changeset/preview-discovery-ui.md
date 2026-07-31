---
'@hono-email/preview': patch
---

Fix template discovery to ignore dependency and build directories, avoid symlink loops, and refresh cached results on template changes. The preview UI now updates its template list live, surfaces API errors clearly, supports JSX templates, resolves documented named components with sibling `previewProps` exports, and ignores inherited properties when checking required props.
