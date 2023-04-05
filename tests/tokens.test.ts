import { assertEquals } from "https://deno.land/std@0.146.0/testing/asserts.ts";
import { Group, Token } from "../mod.ts";

Deno.test("Create a token", async (t) => {
  const token = new Token("color", "red");
  token.description = "This is a color";
  token.type = "color";
  token.extensions.set("org.example.tool-a", 42);

  assertEquals("color", token.name);
  assertEquals("red", token.value);
  assertEquals("This is a color", token.description);
  assertEquals("color", token.type);
  assertEquals(42, token.extensions.get("org.example.tool-a"));

  await t.step("Export to JSON", () => {
    assertEquals(
      {
        $value: "red",
        $type: "color",
        $description: "This is a color",
        $extensions: {
          "org.example.tool-a": 42,
        },
      },
      token.toJson(),
    );
  });

  await t.step("Import from JSON", () => {
    const token2 = Token.fromJson(token.name, token.toJson());

    assertEquals("color", token2.name);
    assertEquals("red", token2.value);
    assertEquals("color", token2.type);
    assertEquals("This is a color", token2.description);
    assertEquals(42, token2.extensions.get("org.example.tool-a"));
  });
});

Deno.test("Create a group", async (t) => {
  const group = new Group("Colors", [
    new Token("primary", "red"),
    new Token("secondary", "blue"),
  ]);
  group.type = "color";
  group.description = "Group of colors";

  assertEquals(2, group.children.size);
  assertEquals("color", group.type);
  assertEquals("Group of colors", group.description);
  assertEquals("red", group.get("primary")?.value);
  assertEquals("blue", group.get("secondary")?.value);

  await t.step("Export to JSON", () => {
    assertEquals(
      {
        $type: "color",
        $description: "Group of colors",
        primary: {
          $value: "red",
        },
        secondary: {
          $value: "blue",
        },
      },
      group.toJson(),
    );
  });

  await t.step("Import from JSON", () => {
    const group2 = Group.fromJson(group.name, group.toJson());

    assertEquals("Colors", group2.name);
    assertEquals("Group of colors", group2.description);
    assertEquals("red", group2.get("primary")?.value);
    assertEquals("blue", group2.get("secondary")?.value);
  });
});

Deno.test("Determine types", () => {
  const token = new Token("primary", "blue");
  assertEquals("string", token.type);

  token.type = "color";
  assertEquals("color", token.type);

  const token2 = new Token("primary", "blue");
  const group = new Group();
  group.add(token2);
  group.type = "color";

  assertEquals("color", token2.type);
});

Deno.test("Aliases", () => {
  const group = new Group("colors");
  new Group().add(group);
  const token = new Token("primary", "blue");
  token.type = "color";
  const token2 = new Token("main", "{colors.primary}");
  group.add(token, token2);
  assertEquals(token2.resolvedValue, token.resolvedValue);
  assertEquals(token2.type, token.type);
});
