interface JsonToken {
  $value: Value;
  $type?: Type;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

interface JsonTokenGroup {
  [key: string]: JsonToken | JsonTokenGroup | string | undefined;
  $type?: Type;
  $description?: string;
}

type Type =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null"
  | "color"
  | "dimension"
  | "fontFamily"
  | "fontWeight"
  | "fontStyle"
  | "duration"
  | "strokeStyle"
  | "border"
  | "transition"
  | "shadow"
  | "gradient"
  | "typography"
  | "cubicBezier";

type Color = string;
type Dimension = string;
type FontFamily = string | string[];
type FontWeight =
  | number
  | "thin"
  | "hairline"
  | "extra-light"
  | "ultra-light"
  | "light"
  | "normal"
  | "regular"
  | "book"
  | "medium"
  | "semi-bold"
  | "demi-bold"
  | "bold"
  | "extra-bold"
  | "ultra-bold"
  | "black"
  | "heavy"
  | "extra-black"
  | "ultra-black";
type FontStyle = "normal" | "italic";
type Duration = string;
type Alias = string;
type CubicBezier = [number, number, number, number];
type StrokeStyle = PredefinedStrokeStyle | CustomStrokeStyle;

type Value =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[]
  | null
  | Color
  | Dimension
  | FontFamily
  | FontWeight
  | FontStyle
  | Duration
  | StrokeStyle
  | Border
  | Transition
  | Shadow
  | Gradient
  | Typography
  | CubicBezier;

type PredefinedStrokeStyle =
  | "solid"
  | "dashed"
  | "dotted"
  | "double"
  | "groove"
  | "ridge"
  | "outset"
  | "inset";

interface CustomStrokeStyle {
  dashArray: string[] | Alias;
  lineCap: "round" | "butt" | "square" | Alias;
}

interface Border {
  color: Color | Alias;
  width: Dimension | Alias;
  style: StrokeStyle | Alias;
}

interface Transition {
  duration: Duration | Alias;
  delay: Duration | Alias;
  timingFunction: CubicBezier | Alias;
}

interface Shadow {
  color: Color | Alias;
  offsetX: Dimension | Alias;
  offsetY: Dimension | Alias;
  blur: Dimension | Alias;
  spread: Dimension | Alias;
}

interface GradientStop {
  color: Color | Alias;
  position: number | Alias;
}

type Gradient = GradientStop[];

interface Typography {
  fontFamily: FontFamily | Alias;
  fontSize: Dimension | Alias;
  fontWeight: FontWeight | Alias;
  letterSpacing: Dimension | Alias;
  lineHeight: string | Alias;
}

/** Base class extended by Token and Group */
class Node {
  #parent?: Group;
  description?: string;

  set parent(parent: Group | undefined) {
    this.#parent = parent;
  }

  get parent(): Group | undefined {
    return this.#parent;
  }

  /** The root of the node */
  get root(): Group | undefined {
    if (!this.parent) {
      return undefined;
    }

    let root = this.parent;
    while (root.parent) {
      root = root.parent;
    }
    return root;
  }
}

/**
 * This class represents a token
 * @see https://design-tokens.github.io/community-group/format/#design-token-0
 */
export class Token extends Node {
  name: string;
  $value: Value | Alias;
  $type?: Type;
  extensions = new Map<string, unknown>();
  extra = new Map<string, unknown>();

  /** Create a new instance from a JSON */
  static fromJson(name: string, json: JsonToken) {
    if (json.$value === undefined) {
      throw new Error("Invalid token. Missing $value property");
    }

    const token = new Token(name, json.$value);

    for (const [key, value] of Object.entries(json)) {
      if (value === undefined || value === null) {
        continue;
      }

      switch (key) {
        case "$value":
          break;

        case "$description":
          if (typeof value !== "string") {
            throw new Error("Invalid type for $description");
          }
          token.description = value;
          break;

        case "$type":
          if (typeof value !== "string") {
            throw new Error("Invalid type for $type");
          }
          token.$type = value as Type;
          break;

        case "$extensions":
          for (const [name, content] of Object.entries(value)) {
            token.extensions.set(name, content);
          }
          break;
        default:
          token.extra.set(key, value);
          break;
      }
    }

    return token;
  }

  /** Create a new token */
  constructor(name: string, $value: Value = null) {
    super();
    this.name = name;
    this.$value = $value;
  }

  /** The full path name */
  get path(): string {
    return this.parent ? `${this.parent.path}.${this.name}` : this.name;
  }

  /**
   * The type of the token
   * @see https://design-tokens.github.io/community-group/format/#types
   */
  set type(type: Type) {
    this.$type = type;
  }

  get type(): Type {
    if (this.$type) {
      return this.$type;
    }

    if (typeof this.$value === "string") {
      const token = this.#resolveAlias(this.$value);
      if (token) {
        return token.type;
      }
    }

    let parent = this.parent;

    while (parent) {
      if (parent.type) {
        return parent.type;
      }
      parent = parent.parent;
    }

    const value = this.value;
    const type = typeof value;

    switch (type) {
      case "string":
      case "number":
      case "boolean":
        return type;

      case "object":
        return value === null
          ? "null"
          : Array.isArray(value)
          ? "array"
          : "object";
    }

    throw new Error("Invalid value");
  }

  set value(value: Value) {
    this.$value = value;
  }

  get value(): Value {
    return this.#resolveValue(this.$value);
  }

  #resolveValue(value: Value): Value {
    if (typeof value === "string") {
      return this.#resolveAlias(value)?.value ?? value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.#resolveValue(item as Value));
    }

    if (typeof value === "object" && value !== null) {
      return Object.fromEntries(
        Object.entries(value).map((
          [name, value],
        ) => [name, this.#resolveValue(value)]),
      );
    }

    return value;
  }

  #resolveAlias(alias: Alias): Token | undefined {
    const match = alias.match(/^{(.*)}$/);
    if (!match) {
      return;
    }
    const root = this.root;
    if (!root) {
      return;
    }

    let [, path] = match;
    if (path.startsWith(root.name + ".")) {
      path = path.slice(root.name.length + 1);
    }

    return root.get(path);
  }

  /** Convert the token to JSON */
  toJson(): JsonToken {
    const json: JsonToken = {
      $value: this.$value,
    };

    if (this.$type) {
      json.$type = this.$type;
    }

    if (this.description) {
      json.$description = this.description;
    }

    if (this.extensions.size) {
      json.$extensions = Object.fromEntries(this.extensions);
    }

    return json;
  }

  /** Convert the token to string */
  toString() {
    JSON.stringify(this.toJson(), null, 2);
  }
}

type Child = Token | Group;

/**
 * This class represents a group
 * @see https://design-tokens.github.io/community-group/format/#groups-0
 */
export class Group extends Node {
  name: string;
  type?: Type;
  children = new Map<string, Child>();

  /** Create a group and nested groups and tokens from a JSON */
  static fromJson(name: string, json: JsonTokenGroup): Group {
    const group = new Group(name);

    for (const [key, value] of Object.entries(json)) {
      if (value === undefined || value === null) {
        continue;
      }

      switch (key) {
        case "$description":
          if (typeof value !== "string") {
            throw new Error("Invalid type for $description");
          }
          group.description = value;
          break;

        case "$type":
          if (typeof value !== "string") {
            throw new Error("Invalid type for $type");
          }
          group.type = value as Type;
          break;

        default:
          if (typeof value === "object") {
            // Is a Token
            if ("$value" in value) {
              group.add(Token.fromJson(key, value as JsonToken));
            } else {
              group.add(Group.fromJson(key, value as JsonTokenGroup));
            }
          }
          break;
      }
    }

    return group;
  }

  /** Create a new group */
  constructor(name = "", tokens: Child[] = []) {
    super();
    this.name = name;
    this.add(...tokens);
  }

  /** The path of the group */
  get path(): string {
    return this.parent?.name ? `${this.parent.path}.${this.name}` : this.name;
  }

  /** Return all tokens and subtokens */
  get all(): Token[] {
    const tokens: Token[] = [];

    for (const child of this.children.values()) {
      if (child instanceof Token) {
        tokens.push(child);
        continue;
      }

      tokens.push(...child.all);
    }

    return tokens;
  }

  /** Add new childs to the group (tokens or groups) */
  add(...childrens: Child[]) {
    childrens.forEach((child) => {
      child.parent = this;
      this.children.set(child.name, child);
    });
  }

  /** Return a child (token or group) from a path */
  getChild(path: string): Child | undefined {
    const piece = path.match(/^([^.]+)(?:\.(.*))?$/);

    if (!piece) {
      return;
    }

    const [, name, childPath] = piece;
    const child: Child | undefined = this.children.get(name);

    if (child instanceof Group && childPath) {
      return child.getChild(childPath);
    }

    return (child instanceof Token && !childPath) ? child : undefined;
  }

  /** Return a token from a path */
  get(path: string): Token | undefined {
    const child = this.getChild(path);
    return (child instanceof Token) ? child : undefined;
  }

  /** Convert the group (and its children) to JSON */
  toJson(): JsonTokenGroup {
    const group: JsonTokenGroup = {};

    if (this.type) {
      group.$type = this.type;
    }

    if (this.description) {
      group.$description = this.description;
    }

    for (const [name, child] of this.children) {
      group[name] = child.toJson();
    }

    return group;
  }

  /** Convert the group (and its children) to string */
  toString() {
    JSON.stringify(this.toJson(), null, 2);
  }
}

export default function create(
  json: Record<string, unknown> | string,
  format?: "style-dictionary",
): Group {
  if (typeof json === "string") {
    json = JSON.parse(json);
  }

  if (format === "style-dictionary") {
    json = fromStyleDictionary(json);
  }

  return Group.fromJson("", json as JsonTokenGroup);
}

// Convert from Style dictionary format to Design Tokens format
// deno-lint-ignore no-explicit-any
function fromStyleDictionary(json: any): any {
  if (Array.isArray(json)) {
    return json.map(fromStyleDictionary);
  }

  if (typeof json === "object" && json !== null) {
    return Object.fromEntries(
      Object.entries(json).map(([key, value]) => {
        switch (key) {
          case "value":
          case "type":
          case "description":
          case "extensions":
            key = "$" + key;
            break;
        }
        return [key, fromStyleDictionary(value)];
      }),
    );
  }

  return json;
}
