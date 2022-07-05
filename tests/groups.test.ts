import { assertEquals } from "https://deno.land/std@0.146.0/testing/asserts.ts";
import parse from "../mod.ts";
import json from "./assets/groups.tokens.json" assert { type: "json" };

Deno.test("Parse arbitrary nested groups", () => {
  const tokens = parse(json);

  assertEquals(tokens.get("token uno")?.value, "token value 1");
  assertEquals(
    tokens.get("token group.token dos")?.value,
    "token value 2",
  );
  assertEquals(
    tokens.get("token group.nested token group.token tres")?.value,
    "token value 3",
  );
  assertEquals(
    tokens.get("token group.nested token group.Token cuatro")?.value,
    "token value 4",
  );
  assertEquals(tokens.children.size, 2);
});
