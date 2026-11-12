import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const scriptPath = fileURLToPath(
  new URL("../../apps-script/poc-03/Code.gs", import.meta.url),
);
const scriptSource = readFileSync(scriptPath, "utf8");
const vendorPath = fileURLToPath(
  new URL("../../node_modules/hash-wasm/dist/argon2.umd.min.js", import.meta.url),
);
const vendorSourceBuffer = readFileSync(vendorPath);
const vendorSource = vendorSourceBuffer.toString("utf8");
const expectedVendorSha256 =
  "acfe11b015852f593aaddc51116f71dc7850e4551e6b34d42c1f88cf39635f03";

function createAppsScriptHarness() {
  const logs = [];

  const utilities = {
    getUuid() {
      return randomUUID();
    },
    newBlob(value) {
      const bytes = Buffer.from(String(value), "utf8");
      return {
        getBytes() {
          return Array.from(bytes, (byte) =>
            byte > 127 ? byte - 256 : byte,
          );
        },
      };
    },
    computeHmacSha256Signature(value, key) {
      const message = Buffer.from(value);
      const secret = Buffer.from(key);
      const digest = createHmac("sha256", secret).update(message).digest();
      return Array.from(digest, (byte) =>
        byte > 127 ? byte - 256 : byte,
      );
    },
  };

  const context = vm.createContext({
    Utilities: utilities,
    WebAssembly,
    Logger: {
      log(message) {
        logs.push(String(message));
      },
    },
  });

  vm.runInContext(vendorSource, context, {
    filename: "apps-script/poc-03/HashWasmArgon2.gs (hash-wasm 4.13.0)",
    timeout: 10_000,
  });

  vm.runInContext(scriptSource, context, {
    filename: "apps-script/poc-03/Code.gs",
    timeout: 10_000,
  });

  return { context, logs };
}

test("POC-03: vetores rápidos (RFC, UTF-8 e senha acima de 64 bytes)", () => {
  const { context, logs } = createAppsScriptHarness();

  context.poc03RunKnownAnswerTests();

  assert.equal(
    logs.filter((line) => line.startsWith("PASS:")).length,
    3,
    logs.join("\n"),
  );
  assert.ok(logs.some((line) => line.includes("todos os vetores rápidos passaram")));
});

test("POC-03: vetor PBKDF2-HMAC-SHA-256 RFC 7914 com 80.000 iterações", () => {
  const { context, logs } = createAppsScriptHarness();

  context.poc03RunRfc80000Vector();

  assert.ok(
    logs.some((line) => line.includes('"status":"PASS"')),
    logs.join("\n"),
  );
});

test("POC-03: probe WebAssembly e alocação de 19 MiB", () => {
  const { context, logs } = createAppsScriptHarness();

  const result = context.poc03ProbeWebAssembly();

  assert.equal(result.wasmAvailable, true);
  assert.equal(result.functionResult, 42);
  assert.equal(result.memoryBytes, 19 * 1024 * 1024);
  assert.ok(
    logs.some((line) => line.includes('"status":"PASS"')),
    logs.join("\\n"),
  );
});



test("POC-03: salt uses UUID v4, becomes 16 bytes and does not log the value", () => {
  const { context, logs } = createAppsScriptHarness();

  const result = context.poc03RunSaltGenerationTests();

  assert.equal(result.status, "PASS");
  assert.equal(result.samples, 256);
  assert.equal(result.validUuidV4, 256);
  assert.equal(result.saltBytes, 16);
  assert.equal(result.uniqueSamples, 256);
  assert.equal(result.duplicateCount, 0);
  assert.equal(result.statisticalProofOfCSPRNG, false);
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0], /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
});

test("POC-03: rejeita UUID que não seja v4 RFC", () => {
  const { context } = createAppsScriptHarness();

  context.Utilities.getUuid = () => "00000000-0000-0000-0000-000000000000";

  assert.throws(
    () => context.poc03GenerateSaltHex_(),
    /UUID v4 RFC 9562 válido/,
  );
});

test("POC-03: bundle Argon2id está fixado e íntegro", () => {
  const actual = createHash("sha256").update(vendorSourceBuffer).digest("hex");

  assert.equal(actual, expectedVendorSha256);
  assert.match(vendorSource, /hashwasm/);
  assert.match(vendorSource, /argon2id/);
});


test("POC-03: cria registro Argon2id em memória, verifica senha e recusa adulterações", async () => {
  const { context, logs } = createAppsScriptHarness();

  assert.equal(typeof context.TextEncoder, "undefined");

  const result = await context.poc03RunPasswordRecordVerificationTests();

  assert.equal(result.status, "PASS");
  assert.equal(result.testsPassed, 8);
  assert.equal(result.testsTotal, 8);
  assert.equal(result.saltBytes, 16);
  assert.equal(result.hashBytes, 32);
  assert.equal(result.storage, "MEMORY_ONLY_NOT_SAVED");
  assert.equal(
    result.comparison,
    "FIXED_LENGTH_XOR_ACCUMULATOR_NOT_PROVEN_CONSTANT_TIME",
  );
  assert.ok(
    logs.some((line) =>
      line.includes('"test":"Argon2id password record create/verify — isolated POC","status":"PASS"'),
    ),
    logs.join("\\n"),
  );
  assert.doesNotMatch(logs.join("\\n"), /POC03 synthetic password for verification/);
});

test("POC-03: Argon2id WASM passa vetores independentes e perfil OWASP", async () => {
  const { context, logs } = createAppsScriptHarness();

  assert.equal(typeof context.TextEncoder, "undefined");

  const result = await context.poc03RunArgon2idTests();

  assert.equal(result.status, "PASS");
  assert.equal(result.testsPassed, 2);
  assert.equal(result.testsTotal, 2);
  assert.ok(
    logs.some((line) =>
      line.includes('"test":"Argon2id WASM — hash-wasm 4.13.0","status":"PASS"'),
    ),
    logs.join("\\n"),
  );
});
