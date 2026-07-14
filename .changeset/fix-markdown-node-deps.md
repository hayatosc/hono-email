---
"hono-email": patch
---

fix(core): move Markdown dependencies to devDependencies to avoid leaking Node.js builtins

The Markdown rendering pipeline (`unified`, `remark-*`, `rehype-*`) is fully bundled into `dist` at build time, so it does not need to be a runtime dependency. Previously declaring them as `dependencies` caused consumers to transitively install `micromark` → `debug`, which pulls in the Node.js builtins `tty` and `util` (`debug/src/node.js`). This tripped "Unexpected Node.js imports" checks and edge-runtime deployments even though the prebuilt output never referenced those builtins.

Only `htmlrewriter` remains a runtime dependency because it is imported as an external module (and is runtime/platform agnostic: Node.js, browser, Cloudflare Workers, Deno, Bun). The Markdown deps are now `devDependencies`, so `npm i hono-email` no longer drags `debug`/`tty`/`util` into the consumer dependency graph.
