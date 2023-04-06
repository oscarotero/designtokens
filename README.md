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

### Alias

The spec has the concept of
[aliases](https://design-tokens.github.io/community-group/format/#aliases-references)
as a way to reuse the values. This library supports aliases automatically:

```json
{
  "group name": {
    "token name": {
      "$value": 1234,
      "$type": "number"
    }
  },
  "alias name": {
    "$value": "{group name.token name}"
  }
}
```

```js
const tokens = parse(json_tokens);

const alias = tokens.get("alias name");

alias.value; // resolved value: 1234
alias.$value; // RAW value: "{group name.token name}"

alias.type; // resolved type: number
alias.$type; // RAW type: undefined
```

## Import from Style Dictionary

You can import tokens from the
[Style Dictionary](https://amzn.github.io/style-dictionary/) format by setting
the input format in the second argument.

```js
import parse from "./mod.ts";
import style_dictionary_tokens from "./my-json-with-tokens.json" assert {
  type: "json",
};

const tokens = parse(style_dictionary_tokens, "style-dictionary");
```
