import dts from "bun-plugin-dts";

await Bun.build({
  entrypoints: ["./src/index.ts", "./src/unplugin.ts"],
  outdir: "dist",
  format: "esm",
  target: "node",
  plugins: [dts()],
});
