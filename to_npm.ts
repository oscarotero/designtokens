import { build } from "https://deno.land/x/dnt@0.33.1/mod.ts";
import { dirname, join } from "https://deno.land/std@0.182.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.182.0/fs/mod.ts";

await Deno.remove("npm", { recursive: true }).catch(() => {});

const testFiles = [
  "assets/groups.tokens.json",
  "assets/shadow.tokens.json",
];

for (const file of testFiles) {
  await copyFile(`tests/${file}`, `esm/test/${file}`);
  await copyFile(`tests/${file}`, `script/test/${file}`);
}

await copyFile("LICENSE");
await copyFile("README.md");
await copyFile("CHANGELOG.md");

await build({
  typeCheck: true,
  shims: {
    deno: true,
  },
  entryPoints: [
    "./mod.ts",
  ],
  outDir: "./npm",
  package: {
    name: "@oscarotero/designtokens",
    version: "0.1.0",
    description:
      "Node package to parse and manipulate design tokens following the [DTCG](https://www.designtokens.org/) format.",
    homepage: "https://github.com/oscarotero/designtokens#readme",
    license: "MIT",
    keywords: [
      "design tokens",
      "design systems",
      "style dictionary",
      "parser",
    ],
    author: "Oscar Otero <oom@oscarotero.com>",
    repository: {
      type: "git",
      url: "git+https://github.com/oscarotero/designtokens.git",
    },
    bugs: {
      url: "https://github.com/oscarotero/designtokens/issues",
    },
  },
});

async function copyFile(from: string, to = from) {
  to = join("npm", to);
  await ensureDir(dirname(to));
  await Deno.copyFile(from, to);
}
