import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Ajv2020, type AnySchema } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { capabilitiesSchema, commandEnvelopeSchema, eventEnvelopeSchema, heartbeatSchema } from "../src/contracts/envelopes.js";

const root = join(import.meta.dirname, "..", "..");

describe("contracts", () => {
  it("accepts foundation fixtures with runtime schemas", async () => {
    await expectFixture("contracts/fixtures/heartbeat.rankup-01.json", heartbeatSchema);
    await expectFixture("contracts/fixtures/capabilities.rankup-01.json", capabilitiesSchema);
    await expectFixture("contracts/fixtures/event.player-joined.json", eventEnvelopeSchema);
    await expectFixture("contracts/fixtures/command.profile-read.json", commandEnvelopeSchema);
    await expectFixture("contracts/fixtures/command.staff-sync.json", commandEnvelopeSchema);
  });

  it("accepts foundation fixtures with JSON schemas", async () => {
    const ajv = new Ajv2020({ allErrors: true, validateFormats: false });

    await expectJsonSchemaFixture(ajv, "contracts/schemas/heartbeat.v1.schema.json", "contracts/fixtures/heartbeat.rankup-01.json");
    await expectJsonSchemaFixture(ajv, "contracts/schemas/capabilities.v1.schema.json", "contracts/fixtures/capabilities.rankup-01.json");
    await expectJsonSchemaFixture(ajv, "contracts/schemas/event-envelope.v1.schema.json", "contracts/fixtures/event.player-joined.json");
    await expectJsonSchemaFixture(ajv, "contracts/schemas/command-envelope.v1.schema.json", "contracts/fixtures/command.profile-read.json");
    await expectJsonSchemaFixture(ajv, "contracts/schemas/command-envelope.v1.schema.json", "contracts/fixtures/command.staff-sync.json");
  });
});

async function expectFixture(path: string, schema: { parse(input: unknown): unknown }): Promise<void> {
  const payload = await readJson(path);
  expect(() => schema.parse(payload)).not.toThrow();
}

async function expectJsonSchemaFixture(ajv: Ajv2020, schemaPath: string, fixturePath: string): Promise<void> {
  const schema = (await readJson(schemaPath)) as AnySchema;
  const fixture = await readJson(fixturePath);
  if (typeof schema === "object" && schema != null && "$id" in schema && typeof schema.$id === "string") {
    ajv.removeSchema(schema.$id);
  }
  const validate = ajv.compile(schema);

  expect(validate(fixture), JSON.stringify(validate.errors, null, 2)).toBe(true);
}

async function readJson(path: string): Promise<unknown> {
  const contents = await readFile(join(root, path), "utf8");
  return JSON.parse(contents);
}
