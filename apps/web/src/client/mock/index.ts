// Every feature mock, imported for its side effect (each registers its api.call routes).
// Add new src/client/mock/<feature>.ts files here so the preview harness serves them.
import "./economy.ts";
import "./inventory.ts";
import "./marks.ts";
import "./spire.ts";

export { resetMockEconomy } from "./economy.ts";
export { resetMockInventory } from "./inventory.ts";
export { resetMockMarks } from "./marks.ts";
export { resetMockSpire, SPIRE_STATES } from "./spire.ts";
