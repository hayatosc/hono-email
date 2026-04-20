import dts from "bun-plugin-dts";

// Build core library (Browser/Edge compatible)
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "dist",
  format: "esm",
  target: "browser",
  minify: true,
  plugins: [dts()],
  external: ["hono"],
});

// Build unplugin (Node.js compatible)
await Bun.build({
  entrypoints: ["./src/unplugin.ts"],
  outdir: "dist",
  format: "esm",
  target: "node",
  minify: true,
  plugins: [dts()],
  external: ["hono"],
});
