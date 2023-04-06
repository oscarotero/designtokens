import { assertEquals } from "https://deno.land/std@0.146.0/testing/asserts.ts";
import parse from "../mod.ts";
import json from "./assets/groups.tokens.json" assert { type: "json" };

Deno.test("Parse arbitrary nested groups", () => {
  const tokens = parse(json);

  assertEquals(tokens.get("token one")?.value, "token value 1");
  assertEquals(
    tokens.get("token group.token two")?.value,
    "token value 2",
  );
  assertEquals(
    tokens.get("token group.nested token group.token three")?.value,
    "token value 3",
  );
  assertEquals(
    tokens.get("token group.nested token group.Token four")?.value,
    "token value 4",
  );
  assertEquals(
    tokens.get("token group.nested token group.Token four")?.path,
    "token group.nested token group.Token four",
  );
  assertEquals(
    tokens.get("token group.nested token group.Token four"),
    tokens.getChild("token group.nested token group.Token four"),
  );
  assertEquals(tokens.children.size, 2);
});
