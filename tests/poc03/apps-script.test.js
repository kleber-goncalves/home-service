import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const scriptPath = fileURLToPath(
  new URL("../../apps-script/poc-03/Code.gs", import.meta.url),
);
const scriptSource = readFileSync(scriptPath, "utf8");

function createAppsScriptHarness() {
  const logs = [];

  const utilities = {
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
