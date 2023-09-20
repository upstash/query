import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/query.ts"],
  format: ["cjs", "esm"],
  splitting: true,
  sourcemap: true,
  clean: true,
  bundle: true,
  dts: true,
  external: ["next"],
});
