import assert from "node:assert/strict";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import { compareArgon2HashHex } from "../../server/password-hash-compare.js";

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

function createAppsScriptHarness({
  lockUnavailable = false,
  propertiesUnavailable = false,
  spreadsheetApp = {},
} = {}) {
  const logs = [];
  const propertyStore = new Map();
  let lockHeld = false;

  const scriptProperties = {
    getProperty(key) {
      return propertyStore.has(key) ? propertyStore.get(key) : null;
    },
    setProperty(key, value) {
      propertyStore.set(String(key), String(value));
      return scriptProperties;
    },
    deleteProperty(key) {
      propertyStore.delete(String(key));
      return scriptProperties;
    },
    getKeys() {
      return [...propertyStore.keys()];
    },
  };

  const utilities = {
    getUuid() {
      return randomUUID();
    },
    sleep() {
      // No real delay in CI; actual Apps Script contention is tested manually.
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

  const lock = {
    tryLock() {
      if (lockUnavailable || lockHeld) return false;
      lockHeld = true;
      return true;
    },
    hasLock() {
      return lockHeld;
    },
    releaseLock() {
      lockHeld = false;
    },
  };

  const context = vm.createContext({
    Utilities: utilities,
    PropertiesService: {
      getScriptProperties() {
        if (propertiesUnavailable) {
          throw new Error("PropertiesService unavailable in test harness");
        }
        return scriptProperties;
      },
    },
    LockService: {
      getScriptLock() {
        return lock;
      },
    },
    WebAssembly,
    SpreadsheetApp: spreadsheetApp,
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

  return { context, logs, propertyStore };
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


test("POC-03: valida tamanho, Unicode NFC, espaços e limites de bytes da senha", async () => {
  const { context, logs } = createAppsScriptHarness();

  let result;
  try {
    result = await context.poc03RunPasswordInputPolicyTests();
  } catch (error) {
    assert.fail(`${error.message}\\n${logs.join("\\n")}`);
  }

  assert.equal(result.status, "PASS");
  assert.equal(result.testsPassed, 14);
  assert.equal(result.testsTotal, 14);
  assert.equal(result.minimumCodePoints, 15);
  assert.equal(result.maximumCodePoints, 128);
  assert.equal(result.maximumUtf8Bytes, 512);
  assert.equal(result.unicodeNormalization, "NFC");
  assert.equal(result.spacesTrimmed, false);
  assert.ok(
    logs.some((line) =>
      line.includes('"test":"Password input policy — isolated POC","status":"PASS"'),
    ),
    logs.join("\\n"),
  );
});

test("POC-03: simula limite de 5 falhas/15 min e bloqueio de 15 min", () => {
  const { context, logs } = createAppsScriptHarness();

  const result = context.poc03RunLoginThrottlePolicyTests();

  assert.equal(result.status, "PASS");
  assert.equal(result.testsPassed, 6);
  assert.equal(result.testsTotal, 6);
  assert.equal(result.threshold, 5);
  assert.equal(result.observationWindowMs, 15 * 60 * 1000);
  assert.equal(result.lockDurationMs, 15 * 60 * 1000);
  assert.equal(result.storage, "MEMORY_ONLY_NOT_PERSISTED");
  assert.equal(result.concurrency, "NOT_TESTED");
  assert.ok(
    logs.some((line) =>
      line.includes('"test":"Login throttling policy — in-memory model only","status":"PASS"'),
    ),
    logs.join("\\n"),
  );
});


test("POC-03: throttling persistente usa Script Properties e ScriptLock", () => {
  const { context, logs, propertyStore } = createAppsScriptHarness();

  const result = context.poc03RunPersistentThrottlePolicyTests();

  assert.equal(result.status, "PASS");
  assert.equal(result.testsPassed, 6);
  assert.equal(result.testsTotal, 6);
  assert.equal(result.threshold, 5);
  assert.equal(result.observationWindowMs, 15 * 60 * 1000);
  assert.equal(result.lockDurationMs, 15 * 60 * 1000);
  assert.equal(result.persistence, "SCRIPT_PROPERTIES_TEST_ONLY");
  assert.equal(result.synchronization, "SCRIPT_LOCK");
  assert.equal(result.failClosedOnCorruptState, true);
  assert.equal(result.realAccountsUsed, false);
  assert.equal(
    [...propertyStore.keys()].some((key) => key.startsWith("POC03_THROTTLE_TEST_")),
    false,
    "POC-03 test properties should be removed after the suite",
  );
  assert.ok(
    logs.some((line) =>
      line.includes('"test":"Persistent login throttling — isolated Apps Script POC","status":"PASS"'),
    ),
    logs.join("\\n"),
  );
  assert.doesNotMatch(logs.join("\\n"), /poc03-synthetic-account@invalid\\.example/);
});

test("POC-03: throttling falha fechado quando ScriptLock não pode ser adquirido", () => {
  const { context, propertyStore } = createAppsScriptHarness({
    lockUnavailable: true,
  });

  const result = context.poc03RegisterPersistentThrottleFailureForPoc_(
    "poc03-synthetic-account@invalid.example",
    Date.now(),
  );

  assert.equal(result.status, "LOCK_TIMEOUT");
  assert.equal(result.allowed, false);
  assert.equal(propertyStore.size, 0);
});

test("POC-03: throttling falha fechado quando PropertiesService está indisponível", () => {
  const { context } = createAppsScriptHarness({
    propertiesUnavailable: true,
  });

  const result = context.poc03RegisterPersistentThrottleFailureForPoc_(
    "poc03-synthetic-account@invalid.example",
    Date.now(),
  );

  assert.equal(result.status, "PERSISTENCE_UNAVAILABLE");
  assert.equal(result.allowed, false);
});

test("POC-03: workers de throttling mantêm limite sob execuções simuladas sequenciais", () => {
  const { context, propertyStore } = createAppsScriptHarness();

  const reset = context.poc03ResetPersistentThrottleConcurrencyProbe();
  assert.equal(reset.status, "READY");

  for (let index = 0; index < 10; index += 1) {
    context.poc03RunPersistentThrottleConcurrencyWorker();
  }

  const summary = context.poc03RunPersistentThrottleConcurrencySummary();

  assert.equal(summary.status, "PASS");
  assert.equal(summary.expectedWorkers, 10);
  assert.equal(summary.observedWorkers, 10);
  assert.equal(summary.countedBeforeLimit, 4);
  assert.equal(summary.lockedAtLimit, 1);
  assert.equal(summary.rejectedWhileLocked, 5);
  assert.equal(summary.finalFailureCount, 5);
  assert.equal(summary.finalStateBlocked, true);

  context.poc03CleanupPersistentThrottleTestData();
  assert.equal(propertyStore.size, 0);
});


test("POC-03: analyzer detects overlapping worker execution intervals", () => {
  const { context } = createAppsScriptHarness();

  const overlapping = Array.from({ length: 10 }, (_, index) => ({
    invocationStartedAtMs: 1000 + index * 10,
    workerCompletedAtMs: 4000 + index * 10,
  }));

  const overlapResult =
    context.poc03AnalyzeThrottleConcurrencyIntervalsForPoc_(overlapping);

  assert.equal(overlapResult.validIntervals, 10);
  assert.equal(overlapResult.maxConcurrentWorkers, 10);
  assert.equal(overlapResult.pairwiseOverlapCount, 45);
  assert.equal(overlapResult.allWorkersOverlapAtOneInstant, true);
  assert.ok(overlapResult.commonOverlapWindowMs > 0);

  const sequential = Array.from({ length: 10 }, (_, index) => ({
    invocationStartedAtMs: 1000 + index * 500,
    workerCompletedAtMs: 1500 + index * 500,
  }));

  const sequentialResult =
    context.poc03AnalyzeThrottleConcurrencyIntervalsForPoc_(sequential);

  assert.equal(sequentialResult.validIntervals, 10);
  assert.equal(sequentialResult.maxConcurrentWorkers, 1);
  assert.equal(sequentialResult.pairwiseOverlapCount, 0);
  assert.equal(sequentialResult.allWorkersOverlapAtOneInstant, false);
});

test("POC-03: persistent throttle exposes lock timing telemetry when requested", () => {
  const { context } = createAppsScriptHarness();
  const timing = {};

  const result = context.poc03RegisterPersistentThrottleFailureForPoc_(
    "poc03-coordinated-timing@invalid.example",
    Date.now(),
    { timing },
  );

  assert.equal(result.status, "COUNTED");
  assert.equal(Number.isSafeInteger(timing.lockRequestedAtMs), true);
  assert.equal(Number.isSafeInteger(timing.lockAcquiredAtMs), true);
  assert.equal(Number.isSafeInteger(timing.lockReleasedAtMs), true);
  assert.equal(Number.isSafeInteger(timing.lockWaitMs), true);
  assert.equal(Number.isSafeInteger(timing.lockHeldMs), true);
  assert.ok(timing.lockAcquiredAtMs >= timing.lockRequestedAtMs);
  assert.ok(timing.lockReleasedAtMs >= timing.lockAcquiredAtMs);
  assert.ok(timing.lockWaitMs >= 0);
  assert.ok(timing.lockHeldMs >= 0);

  context.poc03CleanupPersistentThrottleTestData();
});


test("POC-03: coordinated worker rejects a stale trigger UID", () => {
  const { context, propertyStore } = createAppsScriptHarness();

  const handlers = Array.from({ length: 10 }, (_, index) =>
    `poc03RunPersistentThrottleCoordinatedWorker${String(index).padStart(2, "0")}_`,
  );
  const triggerIds = Array.from({ length: 10 }, (_, index) =>
    String(900000 + index),
  );

  propertyStore.set(
    "POC03_THROTTLE_TEST_COORD_META_V1",
    JSON.stringify({
      schemaVersion: 1,
      runId: "a".repeat(32),
      ready: true,
      expectedWorkers: 10,
      workerHandlers: handlers,
      triggerIds,
    }),
  );

  const result = context.poc03RunPersistentThrottleCoordinatedWorker00_({
    triggerUid: "123456789",
  });

  assert.equal(result.status, "STALE_OR_UNMATCHED_TRIGGER");
  assert.equal(
    propertyStore.has("POC03_THROTTLE_TEST_COORD_DETAIL_V1_0"),
    false,
    "a stale trigger must not write into the current probe run",
  );
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


test("POC-03: mapeamento físico de CONTROLE_AUTENTICACAO preserva regras e ISO UTC", () => {
  const { context, logs } = createAppsScriptHarness();

  const result = context.poc03RunSheetsThrottleRecordMappingTests();

  assert.equal(result.status, "PASS");
  assert.equal(result.testsPassed, 8);
  assert.equal(result.testsTotal, 8);
  assert.equal(result.columns, 6);
  assert.equal(result.dateStorage, "ISO_8601_UTC_TEXT");
  assert.ok(
    logs.some((line) =>
      line.includes('"test":"CONTROLE_AUTENTICACAO Sheets row mapping — isolated POC","status":"PASS"'),
    ),
    logs.join("\n"),
  );
});

test("POC-03: read-modify-write do throttle mantém limite no mock do Sheets", () => {
  const headers = [
    "id_controle",
    "identificador_hash",
    "tentativas_falhas",
    "inicio_janela_em",
    "bloqueado_ate",
    "atualizado_em",
  ];
  const recordId = "550e8400-e29b-41d4-a716-446655440000";
  const identifierHash = "a".repeat(64);
  const rows = [
    headers.slice(),
    [recordId, identifierHash, 0, "", "", ""],
  ];

  const sheet = {
    getLastColumn() {
      return 6;
    },
    getLastRow() {
      return rows.length;
    },
    getRange(row, column, numRows = 1, numColumns = 1) {
      return {
        getValues() {
          return rows
            .slice(row - 1, row - 1 + numRows)
            .map((line) => line.slice(column - 1, column - 1 + numColumns));
        },
        setValues(values) {
          for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
            const target = row - 1 + rowIndex;
            if (!rows[target]) rows[target] = [];
            for (
              let columnIndex = 0;
              columnIndex < values[rowIndex].length;
              columnIndex += 1
            ) {
              rows[target][column - 1 + columnIndex] =
                values[rowIndex][columnIndex];
            }
          }
        },
      };
    },
  };

  const spreadsheet = {
    getName() {
      return "POC-03 TEMPORARIA - CONTROLE_AUTENTICACAO - " + "b".repeat(32);
    },
    getSheetByName(name) {
      return name === "CONTROLE_AUTENTICACAO_POC" ? sheet : null;
    },
  };

  let flushCalls = 0;
  const spreadsheetApp = {
    openById(id) {
      assert.equal(id, "spreadsheet-id-synthetic");
      return spreadsheet;
    },
    flush() {
      flushCalls += 1;
    },
  };

  const { context } = createAppsScriptHarness({ spreadsheetApp });
  const meta = {
    spreadsheetId: "spreadsheet-id-synthetic",
    spreadsheetName: spreadsheet.getName(),
    sheetName: "CONTROLE_AUTENTICACAO_POC",
    recordId,
    identifierHash,
  };
  const start = Date.UTC(2026, 10, 13, 18, 0, 0, 0);
  const results = [];

  for (let index = 0; index < 10; index += 1) {
    results.push(
      context.poc03RegisterSheetsThrottleFailureForPoc_(
        meta,
        start + index * 1000,
        {},
      ),
    );
  }

  assert.equal(results.filter((item) => item.status === "COUNTED").length, 4);
  assert.equal(
    results.filter((item) => item.status === "LOCKED_AFTER_FAILURE").length,
    1,
  );
  assert.equal(results.filter((item) => item.status === "BLOCKED").length, 5);
  assert.equal(results.filter((item) => item.persistedWrite).length, 5);

  const finalRow = context.poc03ReadSheetThrottleRowForPoc_(rows[1]);
  assert.equal(finalRow.ok, true);
  assert.equal(finalRow.record.state.failureCount, 5);
  assert.equal(
    finalRow.record.state.blockedUntilMs,
    finalRow.record.updatedAtMs + 15 * 60 * 1000,
  );
  assert.ok(flushCalls >= 10, "flush must run before each lock release");
});


test("POC-03: comparador XOR do Apps Script valida igualdade e rejeita diferenças em posições distintas", () => {
  const { context } = createAppsScriptHarness();
  const createBytes = () => vm.runInContext("new Uint8Array(32)", context);
  const expected = createBytes();
  expected.fill(0x5a);

  const identical = createBytes();
  identical.set(expected);
  assert.equal(context.poc03BytesEqualForArgon2_(identical, expected), true);

  for (const index of [0, 15, 31]) {
    const candidate = createBytes();
    candidate.set(expected);
    candidate[index] ^= 0x01;
    assert.equal(
      context.poc03BytesEqualForArgon2_(candidate, expected),
      false,
      "must reject mismatch at byte " + index,
    );
  }

  const short = vm.runInContext("new Uint8Array(31)", context);
  assert.equal(context.poc03BytesEqualForArgon2_(short, expected), false);
  assert.equal(context.poc03BytesEqualForArgon2_([], expected), false);
});
test("POC-03: comparador Node aceita somente hashes Argon2id hexadecimais iguais de 32 bytes", () => {
  const knownHash = "0123456789abcdef".repeat(4);

  assert.equal(compareArgon2HashHex(knownHash, knownHash), true);
});

test("POC-03: comparador Node rejeita diferenças no primeiro, meio e último byte", () => {
  const expected = "0123456789abcdef".repeat(4);
  const mutateByte = (value, index) => {
    const offset = index * 2;
    const original = Number.parseInt(value.slice(offset, offset + 2), 16);
    const replacement = (original ^ 1).toString(16).padStart(2, "0");
    return value.slice(0, offset) + replacement + value.slice(offset + 2);
  };

  for (const index of [0, 15, 31]) {
    assert.equal(
      compareArgon2HashHex(mutateByte(expected, index), expected),
      false,
      `must reject mismatch at byte ${index}`,
    );
  }
});

test("POC-03: comparador Node falha fechado para tamanho, tipo ou hexadecimal inválido", () => {
  const validHash = "a".repeat(64);
  const invalidInputs = [
    [null, validHash],
    [validHash, undefined],
    [42, validHash],
    [validHash, Buffer.alloc(32)],
    ["", validHash],
    ["a".repeat(62), validHash],
    ["a".repeat(66), validHash],
    [validHash, "b".repeat(62)],
    [validHash, "g".repeat(64)],
    [validHash.toUpperCase(), validHash],
    [validHash, validHash.toUpperCase()],
  ];

  for (const [candidate, stored] of invalidInputs) {
    assert.doesNotThrow(() => compareArgon2HashHex(candidate, stored));
    assert.equal(compareArgon2HashHex(candidate, stored), false);
  }
});
