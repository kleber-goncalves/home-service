import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

const SECRET = "a".repeat(64);
const START_TIME = Date.UTC(2026, 10, 14, 15, 0, 0);
const SOURCE = readFileSync(
    new URL("../../apps-script/poc-04/Code.gs", import.meta.url),
    "utf8",
);

class FakeRange {
    constructor(sheet, row, column, rows = 1, columns = 1) {
        this.sheet = sheet;
        this.row = row;
        this.column = column;
        this.rows = rows;
        this.columns = columns;
    }

    getValues() {
        const values = [];
        for (let rowOffset = 0; rowOffset < this.rows; rowOffset += 1) {
            const row = [];
            for (let columnOffset = 0; columnOffset < this.columns; columnOffset += 1) {
                row.push(this.sheet.readCell(
                    this.row + rowOffset,
                    this.column + columnOffset,
                ));
            }
            values.push(row);
        }
        return values;
    }

    setValues(values) {
        values.forEach((row, rowOffset) => {
            row.forEach((value, columnOffset) => {
                this.sheet.writeCell(
                    this.row + rowOffset,
                    this.column + columnOffset,
                    value,
                );
            });
        });
        return this;
    }

    setValue(value) {
        this.sheet.writeCell(this.row, this.column, value);
        return this;
    }
}

class FakeSheet {
    constructor(name, values) {
        this.name = name;
        this.values = values.map((row) => row.slice());
    }

    getRange(row, column, rows = 1, columns = 1) {
        return new FakeRange(this, row, column, rows, columns);
    }

    getDataRange() {
        const width = Math.max(1, ...this.values.map((row) => row.length));
        return new FakeRange(this, 1, 1, Math.max(1, this.values.length), width);
    }

    getLastRow() {
        return this.values.length;
    }

    appendRow(row) {
        this.values.push(row.slice());
        return this;
    }

    deleteRow(rowNumber) {
        this.values.splice(rowNumber - 1, 1);
    }

    readCell(row, column) {
        return this.values[row - 1]?.[column - 1] ?? "";
    }

    writeCell(row, column, value) {
        while (this.values.length < row) {
            this.values.push([]);
        }
        while (this.values[row - 1].length < column) {
            this.values[row - 1].push("");
        }
        this.values[row - 1][column - 1] = value;
    }
}

function createHarness(options = {}) {
    let clock = options.now ?? START_TIME;
    let uuidCounter = 1;
    let lockUnavailable = false;
    const properties = {
        POC04_HMAC_SECRET: SECRET,
        POC04_TEST_SPREADSHEET_ID: "synthetic-spreadsheet-id",
        ...(options.properties || {}),
    };

    const sheets = {
        POC04_CONTAS: new FakeSheet("POC04_CONTAS", [
            ["id_usuario", "status"],
            ["poc04-user-synthetic-001", options.accountStatus || "active"],
        ]),
        SESSOES: new FakeSheet("SESSOES", [[
            "id_sessao",
            "id_usuario",
            "token_hash",
            "criado_em",
            "ultima_atividade_em",
            "expira_em",
            "revogada_em",
        ]]),
        POC04_CSRF: new FakeSheet("POC04_CSRF", [["id_sessao", "csrf_hash"]]),
    };

    const spreadsheet = {
        getSheetByName(name) {
            return sheets[name] || null;
        },
    };

    const propertyStore = {
        getProperty(key) {
            return Object.prototype.hasOwnProperty.call(properties, key)
                ? properties[key]
                : null;
        },
        setProperty(key, value) {
            properties[key] = String(value);
        },
        deleteProperty(key) {
            delete properties[key];
        },
        getProperties() {
            return { ...properties };
        },
    };

    class TestDate extends Date {
        constructor(...args) {
            super(...(args.length ? args : [clock]));
        }

        static now() {
            return clock;
        }
    }

    const context = {
        Date: TestDate,
        JSON,
        Object,
        Array,
        String,
        Number,
        Math,
        RegExp,
        Error,
        isFinite,
        Utilities: {
            DigestAlgorithm: { SHA_256: "SHA_256" },
            Charset: { UTF_8: "UTF-8" },
            computeDigest(_algorithm, value) {
                return Array.from(createHash("sha256").update(String(value), "utf8").digest());
            },
            computeHmacSha256Signature(value, key) {
                return Array.from(createHmac("sha256", String(key)).update(String(value), "utf8").digest());
            },
            newBlob(value) {
                return {
                    getBytes() {
                        return Array.from(Buffer.from(String(value), "utf8"));
                    },
                };
            },
            getUuid() {
                const id = "synthetic-session-id-" + uuidCounter;
                uuidCounter += 1;
                return id;
            },
        },
        PropertiesService: {
            getScriptProperties() {
                return propertyStore;
            },
        },
        LockService: {
            getScriptLock() {
                return {
                    tryLock() {
                        return !lockUnavailable;
                    },
                    releaseLock() {},
                };
            },
        },
        SpreadsheetApp: {
            openById(id) {
                if (id !== "synthetic-spreadsheet-id") {
                    throw new Error("Unknown spreadsheet id");
                }
                return spreadsheet;
            },
            flush() {},
        },
        ContentService: {
            MimeType: { JSON: "application/json" },
            createTextOutput(content) {
                return {
                    content,
                    getContent() {
                        return content;
                    },
                    setMimeType() {
                        return this;
                    },
                };
            },
        },
        Buffer,
        console,
    };

    vm.createContext(context);
    vm.runInContext(SOURCE, context, { filename: "Code.gs" });

    return {
        call(action, payload, optionsForCall = {}) {
            const requestId = optionsForCall.requestId || "poc04-test-request";
            const timestamp = String(optionsForCall.timestamp ?? clock);
            const nonce = optionsForCall.nonce || ("0".repeat(63) + String(optionsForCall.nonceNumber || 1));
            const payloadText = JSON.stringify(payload);
            const payloadHash = createHash("sha256").update(payloadText, "utf8").digest("hex");
            const canonical = [
                "CONECTA_LOCAL_POC04_SESSION",
                "v1",
                "POST",
                timestamp,
                nonce,
                action,
                requestId,
                payloadHash,
            ].join("\n");
            let signature = createHmac("sha256", SECRET).update(canonical, "utf8").digest("hex");

            if (optionsForCall.invalidSignature) {
                signature = "f".repeat(64);
            }

            const output = context.doPost({
                parameter: {
                    signatureVersion: "v1",
                    timestamp,
                    nonce,
                    signature,
                    action,
                    requestId,
                    payload: payloadText,
                },
            });

            return JSON.parse(output.getContent());
        },
        advance(ms) {
            clock += ms;
        },
        setNow(value) {
            clock = value;
        },
        setLockUnavailable(value) {
            lockUnavailable = value;
        },
        sheets,
        properties,
        clock() {
            return clock;
        },
    };
}

function issue(harness, nonceNumber = 1) {
    const sessionToken = Buffer.alloc(32, nonceNumber).toString("base64url");
    const csrfToken = Buffer.alloc(32, nonceNumber + 20).toString("base64url");
    const result = harness.call("poc.session.issue", { sessionToken, csrfToken }, { nonceNumber });

    return { result, sessionToken, csrfToken };
}

test("emite sessão sintética e persiste somente hashes do token e CSRF", () => {
    const harness = createHarness();
    const { result, sessionToken, csrfToken } = issue(harness);

    assert.equal(result.ok, true);
    assert.equal(result.data.created, true);
    assert.equal(result.data.expiresAt, new Date(START_TIME + 8 * 60 * 60 * 1000).toISOString());

    const sessionRow = harness.sheets.SESSOES.values[1];
    const csrfRow = harness.sheets.POC04_CSRF.values[1];
    const expectedTokenHash = createHash("sha256").update(sessionToken, "utf8").digest("hex");
    const expectedCsrfHash = createHash("sha256").update(csrfToken, "utf8").digest("hex");

    assert.equal(sessionRow[2], expectedTokenHash);
    assert.notEqual(sessionRow[2], sessionToken);
    assert.equal(csrfRow[1], expectedCsrfHash);
    assert.notEqual(csrfRow[1], csrfToken);
    assert.equal(JSON.stringify(result).includes(sessionToken), false);
    assert.equal(JSON.stringify(result).includes(csrfToken), false);
});

test("valida sessão, CSRF e renova somente a atividade ociosa", () => {
    const harness = createHarness();
    const { sessionToken, csrfToken } = issue(harness);
    harness.advance(60_000);

    const result = harness.call("poc.session.validate", {
        sessionToken,
        csrfToken,
    }, { nonceNumber: 2 });

    assert.equal(result.ok, true);
    assert.equal(result.data.valid, true);
    assert.equal(harness.sheets.SESSOES.values[1][4], new Date(START_TIME + 60_000).toISOString());
});

test("CSRF incorreto é recusado sem atualizar a última atividade", () => {
    const harness = createHarness();
    const { sessionToken } = issue(harness);
    const originalActivity = harness.sheets.SESSOES.values[1][4];

    const result = harness.call("poc.session.validate", {
        sessionToken,
        csrfToken: Buffer.alloc(32, 99).toString("base64url"),
    }, { nonceNumber: 2 });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "POC04_CSRF_INVALID");
    assert.equal(harness.sheets.SESSOES.values[1][4], originalActivity);
});

test("rotação CSRF invalida o token anterior e aceita o novo", () => {
    const harness = createHarness();
    const { sessionToken, csrfToken } = issue(harness);
    const newCsrfToken = Buffer.alloc(32, 88).toString("base64url");

    const rotated = harness.call("poc.session.csrf", {
        sessionToken,
        csrfToken: newCsrfToken,
    }, { nonceNumber: 2 });

    assert.equal(rotated.ok, true);
    assert.equal(rotated.data.csrfReady, true);

    const oldTokenResult = harness.call("poc.session.validate", {
        sessionToken,
        csrfToken,
    }, { nonceNumber: 3 });
    assert.equal(oldTokenResult.error.code, "POC04_CSRF_INVALID");

    const newTokenResult = harness.call("poc.session.validate", {
        sessionToken,
        csrfToken: newCsrfToken,
    }, { nonceNumber: 4 });
    assert.equal(newTokenResult.ok, true);
    assert.equal(newTokenResult.data.valid, true);
});

test("logout revoga no Apps Script e validação posterior falha", () => {
    const harness = createHarness();
    const { sessionToken, csrfToken } = issue(harness);

    const revoked = harness.call("poc.session.revoke", {
        sessionToken,
        csrfToken,
    }, { nonceNumber: 2 });

    assert.equal(revoked.ok, true);
    assert.equal(revoked.data.revoked, true);
    assert.equal(harness.sheets.SESSOES.values[1][6], new Date(START_TIME).toISOString());

    const validation = harness.call("poc.session.validate", {
        sessionToken,
        csrfToken,
    }, { nonceNumber: 3 });

    assert.equal(validation.ok, false);
    assert.equal(validation.error.code, "POC04_SESSION_INVALID");
});

test("expira após 30 minutos sem atividade", () => {
    const harness = createHarness();
    const { sessionToken, csrfToken } = issue(harness);
    harness.advance(30 * 60 * 1000);

    const result = harness.call("poc.session.validate", {
        sessionToken,
        csrfToken,
    }, { nonceNumber: 2 });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "POC04_SESSION_EXPIRED");
});

test("expiração absoluta de 8 horas prevalece mesmo com atividade recente", () => {
    const harness = createHarness();
    const { sessionToken, csrfToken } = issue(harness);

    let nonceNumber = 2;
    for (let activity = 0; activity < 16; activity += 1) {
        harness.advance(29 * 60 * 1000);
        const recentActivity = harness.call("poc.session.validate", {
            sessionToken,
            csrfToken,
        }, { nonceNumber });
        nonceNumber += 1;
        assert.equal(recentActivity.ok, true);
    }

    harness.advance(16 * 60 * 1000);
    const absoluteExpiry = harness.call("poc.session.validate", {
        sessionToken,
        csrfToken,
    }, { nonceNumber });

    assert.equal(absoluteExpiry.ok, false);
    assert.equal(absoluteExpiry.error.code, "POC04_SESSION_EXPIRED");
});

test("nonce repetido é recusado como replay", () => {
    const harness = createHarness();
    const sessionToken = Buffer.alloc(32, 10).toString("base64url");
    const csrfToken = Buffer.alloc(32, 30).toString("base64url");
    const options = { nonce: "c".repeat(64) };

    const first = harness.call("poc.session.issue", { sessionToken, csrfToken }, options);
    const second = harness.call("poc.session.issue", { sessionToken, csrfToken }, options);

    assert.equal(first.ok, true);
    assert.equal(second.ok, false);
    assert.equal(second.error.code, "POC04_REPLAY_DETECTED");
});

test("assinatura adulterada é recusada antes de alterar a planilha", () => {
    const harness = createHarness();
    const sessionToken = Buffer.alloc(32, 11).toString("base64url");
    const csrfToken = Buffer.alloc(32, 31).toString("base64url");

    const result = harness.call("poc.session.issue", {
        sessionToken,
        csrfToken,
    }, { invalidSignature: true });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "POC04_AUTHENTICATION_FAILED");
    assert.equal(harness.sheets.SESSOES.values.length, 1);
});

test("lock indisponível falha fechado", () => {
    const harness = createHarness();
    harness.setLockUnavailable(true);

    const result = harness.call("poc.session.issue", {
        sessionToken: Buffer.alloc(32, 12).toString("base64url"),
        csrfToken: Buffer.alloc(32, 32).toString("base64url"),
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "POC04_NONCE_STORE_UNAVAILABLE");
    assert.equal(harness.sheets.SESSOES.values.length, 1);
});

test("conta sintética suspensa não recebe nem valida sessão", () => {
    const harness = createHarness({ accountStatus: "suspended" });
    const result = issue(harness).result;

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "POC04_ACCOUNT_UNAVAILABLE");
    assert.equal(harness.sheets.SESSOES.values.length, 1);
});

test("ação fora da allowlist é recusada", () => {
    const harness = createHarness();
    const result = harness.call("user.login", {}, { nonceNumber: 1 });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "POC04_ACTION_NOT_ALLOWED");
});

test("armazenamento não inicializado falha fechado", () => {
    const harness = createHarness({
        properties: { POC04_TEST_SPREADSHEET_ID: "" },
    });
    const result = issue(harness).result;

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "POC04_STORE_NOT_INITIALIZED");
});
