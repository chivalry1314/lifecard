import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["edgeone/api.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "cloud-functions/api/[[default]].js",
  banner: {
    js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
  },
});

console.log("EdgeOne function bundle built successfully");
