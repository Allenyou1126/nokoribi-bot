import { defineConfig } from "tsdown";

export default defineConfig({
    entry: "src/main.ts",
    minify: true,
    dts: false,
    exports: false,
    platform: "node",
    alias: {
        "@": "src",
    },
    outDir: "./dist",
    sourcemap: true,
});
