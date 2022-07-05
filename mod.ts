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
  | Alias
  | Color
  | Dimension
  | FontFamily
  | FontWeight
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

export class Token {
  name: string;
  description?: string;
  _value: Value;
  _type?: Type;
  extensions = new Map<string, unknown>();
  parent?: Group;

  static fromJson(name: string, json: JsonToken) {
    const { $value, $description, $type, $extensions } = json;

    if (!$value) {
      throw new Error("Invalid token. Missing $value property");
    }

    const token = new Token(name, $value);

    if (typeof $description === "string") {
      token.description = $description;
    } else if ($description) {
      throw new Error("Invalid type for $description");
    }

    if (typeof $type === "string") {
      token.type = $type;
    } else if ($type) {
      throw new Error("Invalid type for $type");
    }

    if ($extensions) {
      for (const [name, value] of Object.entries($extensions)) {
        token.extensions.set(name, value);
      }
    }

    return token;
  }

  constructor(name: string, value: Value = null) {
    this.name = name;
    this._value = value;
  }

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

  get path(): string {
    return this.parent ? `${this.parent.path}.${this.name}` : this.name;
  }

  set type(type: Type) {
    this._type = type;
  }

  get type(): Type {
    if (this._type) {
      return this._type;
    }

    if (typeof this._value === "string") {
      const token = this.#resolveAlias(this._value);
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

    const type = typeof this.value;

    switch (type) {
      case "string":
      case "number":
      case "boolean":
        return type;

      case "object":
        return this.value === null
          ? "null"
          : Array.isArray(this.value)
          ? "array"
          : "object";
    }

    throw new Error("Invalid value");
  }

  set value(value: Value) {
    this._value = value;
  }

  get value(): Value {
    return this.#resolveValue(this._value);
  }

  #resolveValue(value: Value): Value {
    if (typeof value === "string") {
      const token = this.#resolveAlias(value);
      return token ? token.value : value;
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

    return root.get(path) as Token | undefined;
  }

  toJson(): JsonToken {
    const json: JsonToken = {
      $value: this.value,
    };

    if (this._type) {
      json.$type = this._type;
    }

    if (this.description) {
      json.$description = this.description;
    }

    if (this.extensions.size) {
      json.$extensions = Object.fromEntries(this.extensions);
    }

    return json;
  }
}

type Child = Token | Group;

export class Group {
  name: string;
  type?: Type;
  description?: string;
  children = new Map<string, Child>();
  parent?: Group;

  static fromJson(name: string, json: JsonTokenGroup): Group {
    const { $description, $type, ...children } = json;

    const group = new Group(name);

    if (typeof $description === "string") {
      group.description = $description;
    } else if ($description) {
      throw new Error("Invalid type for $description");
    }

    if (typeof $type === "string") {
      group.type = $type;
    } else if ($type) {
      throw new Error("Invalid type for $type");
    }

    for (const [name, child] of Object.entries(children)) {
      if (!child || typeof child === "string") {
        continue;
      }

      // Is a Token
      if ("$value" in child) {
        const token = Token.fromJson(name, child as JsonToken);
        group.add(token);
      } else {
        const subgroup = Group.fromJson(name, child as JsonTokenGroup);
        group.add(subgroup);
      }
    }

    return group;
  }

  constructor(name = "", tokens: Child[] = []) {
    this.name = name;
    this.add(...tokens);
  }

  get path(): string {
    return this.parent ? `${this.parent.path}.${this.name}` : this.name;
  }

  add(...childrens: Child[]) {
    childrens.forEach((child) => {
      child.parent = this;
      this.children.set(child.name, child);
    });
  }

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

  get(path: string): Token | undefined {
    const child = this.getChild(path);
    return (child instanceof Token) ? child : undefined;
  }

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
}

export default function create(json: Record<string, unknown>): Group {
  return Group.fromJson("", json as JsonTokenGroup);
}
