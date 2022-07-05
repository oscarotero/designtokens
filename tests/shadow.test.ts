import { assertEquals } from "https://deno.land/std@0.146.0/testing/asserts.ts";
import parse from "../mod.ts";
import json from "./assets/shadow.tokens.json" assert { type: "json" };

Deno.test("Parse shadows composite tokens", () => {
  const tokens = parse(json);

  const shadow = tokens.get("shadow-token");
  assertEquals(shadow?.type, "shadow");
});
