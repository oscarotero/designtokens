# Design Tokens parser

Deno library to parse, manipulate and transform tokens format as
[Design Tokens Community Group](https://www.designtokens.org/) specifications.

- [Current spec](https://design-tokens.github.io/community-group/format/)

## Usage

```js
import parse from "./mod.ts";
import json_tokens from "./my-json-with-tokens.json" assert { type: "json" };

const tokens = parse(json_tokens);

// Get a token
const mainColor = tokens.get("colors.main");
console.log(mainColor.value); // Get the value
mainColor.value = "#112233"; // Change the value

// Manipulate tokens
tokens.all.forEach((token) => {
  if (token.type === "color") {
    token.value = editColor(token.value);
  }
});

// Export to JSON or stringifyed JSON
const json = tokens.toJson();
const txt = tokens.toString();
```
