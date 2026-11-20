import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const SECRET = "a".repeat(64);
const SPREADSHEET_ID = "synthetic-conecta-local-spreadsheet-001";
const NOW = Date.UTC(2026, 10, 20, 12, 0, 0);
const TOKEN_HASH_A = "1".repeat(64);
const TOKEN_HASH_B = "2".repeat(64);
const USER_A = "user-synthetic-a";
const USER_B = "user-synthetic-b";
const PROFILE_A = "professional-synthetic-a";
const PROFILE_B = "professional-synthetic-b";
const SERVICE_A = "service-synthetic-a";
const SERVICE_B = "service-synthetic-b";
const CATEGORY_ID = "category-synthetic";
const CITY_ID = "city-synthetic";

const SOURCE = readFileSync(
    new URL("../../apps-script/conecta-local/Code.gs", import.meta.url),
    "utf8",
);

const HEADERS = {
    USUARIOS: [
        "id_usuario", "email", "senha_hash", "senha_salt", "senha_algoritmo",
        "papel", "status", "email_verificado_em", "criado_em",
        "atualizado_em", "ultimo_login_em",
    ],
    PROFISSIONAIS: [
        "id_profissional", "id_usuario", "nome_completo", "nome_publico",
        "whatsapp", "apresentacao", "id_cidade_principal",
        "bairros_regioes_atendidos", "criado_em", "atualizado_em",
    ],
    SESSOES: [
        "id_sessao", "id_usuario", "token_hash", "criado_em",
        "ultima_atividade_em", "expira_em", "revogada_em",
    ],
    CATEGORIAS: ["id_categoria", "nome", "status", "criado_em", "atualizado_em"],
    CIDADES: ["id_cidade", "nome", "uf", "codigo_ibge", "status", "criado_em", "atualizado_em"],
    SERVICOS: [
        "id_servico", "id_profissional", "id_categoria", "nome_servico",
        "descricao", "bairros_regioes", "modalidade_preco", "valor_preco",
        "status", "criado_em", "atualizado_em", "publicado_em",
    ],
    AUDITORIA: [
        "id_evento", "id_usuario_ator", "tipo_ator", "acao",
        "entidade_afetada", "id_registro_afetado", "resultado",
        "detalhes", "criado_em",
    ],
};

class FakeRange {
    constructor(sheet, row, column, rows, columns) {
        this.sheet = sheet;
        this.row = row;
        this.column = column;
        this.rows = rows;
        this.columns = columns;
    }

    getValues() {
        return Array.from({ length: this.rows }, (_, rowOffset) =>
            Array.from({ length: this.columns }, (_, columnOffset) =>
                this.sheet.readCell(this.row + rowOffset, this.column + columnOffset),
            ),
        );
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
}

class FakeSheet {
    constructor(name, headers, records = []) {
        this.name = name;
        this.headers = headers.slice();
        this.values = [
            this.headers,
            ...records.map((record) => this.headers.map((header) => record[header] ?? "")),
        ];
    }

    getLastColumn() {
        return this.headers.length;
    }

    getLastRow() {
        return this.values.length;
    }

    getRange(row, column, rows = 1, columns = 1) {
        return new FakeRange(this, row, column, rows, columns);
    }

    appendRow(row) {
        this.values.push(row.slice());
        return this;
    }

    readCell(row, column) {
        return this.values[row - 1]?.[column - 1] ?? "";
    }

    writeCell(row, column, value) {
        while (this.values.length < row) this.values.push([]);
        while (this.values[row - 1].length < column) {
            this.values[row - 1].push("");
        }
        this.values[row - 1][column - 1] = value;
    }
}

function createHarness() {
    let uuidCounter = 1;
    let requestCounter = 1;
    let nonceCounter = 1;
    const properties = new Map([
        ["CONECTA_LOCAL_HMAC_SECRET", SECRET],
        ["CONECTA_LOCAL_SPREADSHEET_ID", SPREADSHEET_ID],
    ]);

    const sessionCreatedAt = new Date(NOW - 60_000).toISOString();
    const sessionExpiresAt = new Date(NOW + 60 * 60 * 1000).toISOString();

    const seed = {
        USUARIOS: [
            {
                id_usuario: USER_A,
                email: "profissional-a@example.test",
                senha_hash: "0".repeat(64),
                senha_salt: "0".repeat(32),
                senha_algoritmo: "argon2id$v=19$m=19456,t=2,p=1",
                papel: "professional",
                status: "active",
                email_verificado_em: sessionCreatedAt,
                criado_em: sessionCreatedAt,
                atualizado_em: sessionCreatedAt,
            },
            {
                id_usuario: USER_B,
                email: "profissional-b@example.test",
                senha_hash: "f".repeat(64),
                senha_salt: "f".repeat(32),
                senha_algoritmo: "argon2id$v=19$m=19456,t=2,p=1",
                papel: "professional",
                status: "active",
                email_verificado_em: sessionCreatedAt,
                criado_em: sessionCreatedAt,
                atualizado_em: sessionCreatedAt,
            },
        ],
        PROFISSIONAIS: [
            {
                id_profissional: PROFILE_A,
                id_usuario: USER_A,
                nome_completo: "Profissional Fictício A",
                nome_publico: "Equipe A",
                whatsapp: "5534999990001",
                apresentacao: "Perfil fictício A para testes de autorização.",
                id_cidade_principal: CITY_ID,
                bairros_regioes_atendidos: "",
                criado_em: sessionCreatedAt,
                atualizado_em: sessionCreatedAt,
            },
            {
                id_profissional: PROFILE_B,
                id_usuario: USER_B,
                nome_completo: "Profissional Fictício B",
                nome_publico: "Equipe B",
                whatsapp: "5534999990002",
                apresentacao: "Perfil fictício B para testes de autorização.",
                id_cidade_principal: CITY_ID,
                bairros_regioes_atendidos: "",
                criado_em: sessionCreatedAt,
                atualizado_em: sessionCreatedAt,
            },
        ],
        SESSOES: [
            {
                id_sessao: "session-synthetic-a",
                id_usuario: USER_A,
                token_hash: TOKEN_HASH_A,
                criado_em: sessionCreatedAt,
                ultima_atividade_em: sessionCreatedAt,
                expira_em: sessionExpiresAt,
                revogada_em: "",
            },
            {
                id_sessao: "session-synthetic-b",
                id_usuario: USER_B,
                token_hash: TOKEN_HASH_B,
                criado_em: sessionCreatedAt,
                ultima_atividade_em: sessionCreatedAt,
                expira_em: sessionExpiresAt,
                revogada_em: "",
            },
        ],
        CATEGORIAS: [
            {
                id_categoria: CATEGORY_ID,
                nome: "Serviços demonstrativos",
                status: "active",
                criado_em: sessionCreatedAt,
                atualizado_em: sessionCreatedAt,
            },
        ],
        CIDADES: [
            {
                id_cidade: CITY_ID,
                nome: "Cidade Fictícia",
                uf: "MG",
                codigo_ibge: "",
                status: "active",
                criado_em: sessionCreatedAt,
                atualizado_em: sessionCreatedAt,
            },
        ],
        SERVICOS: [
            {
                id_servico: SERVICE_A,
                id_profissional: PROFILE_A,
                id_categoria: CATEGORY_ID,
                nome_servico: "Serviço da conta A",
                descricao: "Descrição demonstrativa do serviço A.",
                bairros_regioes: "",
                modalidade_preco: "not_informed",
                valor_preco: "",
                status: "published",
                criado_em: sessionCreatedAt,
                atualizado_em: sessionCreatedAt,
                publicado_em: sessionCreatedAt,
            },
            {
                id_servico: SERVICE_B,
                id_profissional: PROFILE_B,
                id_categoria: CATEGORY_ID,
                nome_servico: "Serviço da conta B",
                descricao: "Descrição demonstrativa do serviço B.",
                bairros_regioes: "",
                modalidade_preco: "not_informed",
                valor_preco: "",
                status: "published",
                criado_em: sessionCreatedAt,
                atualizado_em: sessionCreatedAt,
                publicado_em: sessionCreatedAt,
            },
        ],
        AUDITORIA: [],
    };

    const sheets = Object.fromEntries(
        Object.entries(HEADERS).map(([name, headers]) => [
            name,
            new FakeSheet(name, headers, seed[name] || []),
        ]),
    );

    const spreadsheet = {
        getSheetByName(name) {
            return sheets[name] || null;
        },
    };

    const propertyStore = {
        getProperty(key) {
            return properties.has(key) ? properties.get(key) : null;
        },
        getProperties() {
            return Object.fromEntries(properties.entries());
        },
        setProperty(key, value) {
            properties.set(key, String(value));
            return this;
        },
        deleteProperty(key) {
            properties.delete(key);
            return this;
        },
    };

    let lockHeld = false;
    const lock = {
        tryLock() {
            if (lockHeld) return false;
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

    class FixedDate extends Date {
        constructor(...args) {
            super(...(args.length ? args : [NOW]));
        }

        static now() {
            return NOW;
        }
    }

    const context = {
        Date: FixedDate,
        Utilities: {
            DigestAlgorithm: { SHA_256: "SHA_256" },
            Charset: { UTF_8: "UTF-8" },
            computeDigest(_algorithm, value) {
                return Array.from(createHash("sha256").update(String(value), "utf8").digest());
            },
            computeHmacSha256Signature(value, key) {
                return Array.from(
                    createHmac("sha256", Buffer.from(String(key), "utf8"))
                        .update(String(value), "utf8")
                        .digest(),
                );
            },
            newBlob(value) {
                return {
                    getBytes() {
                        return Array.from(Buffer.from(String(value), "utf8"));
                    },
                };
            },
            getUuid() {
                const id = "synthetic-event-" + uuidCounter;
                uuidCounter += 1;
                return id;
            },
        },
        PropertiesService: {
            getScriptProperties() {
                return propertyStore;
            },
        },
        SpreadsheetApp: {
            openById(id) {
                if (id !== SPREADSHEET_ID) throw new Error("Unexpected spreadsheet id");
                return spreadsheet;
            },
        },
        LockService: {
            getScriptLock() {
                return lock;
            },
        },
        ContentService: {
            MimeType: { JSON: "application/json" },
            createTextOutput(content) {
                return {
                    content,
                    setMimeType() {
                        return this;
                    },
                };
            },
        },
    };

    runInNewContext(SOURCE, context, { filename: "conecta-local/Code.gs" });

    function call(action, payload) {
        const requestId = "authz-request-" + String(requestCounter).padStart(4, "0");
        requestCounter += 1;
        const timestamp = String(NOW);
        const nonce = String(nonceCounter).padStart(64, "0");
        nonceCounter += 1;
        const payloadText = JSON.stringify(payload);
        const payloadHash = createHash("sha256").update(payloadText, "utf8").digest("hex");
        const canonical = [
            "CONECTA_LOCAL_APP_GATEWAY",
            "v1",
            "POST",
            timestamp,
            nonce,
            action,
            requestId,
            payloadHash,
        ].join("\n");
        const signature = createHmac("sha256", Buffer.from(SECRET, "utf8"))
            .update(canonical, "utf8")
            .digest("hex");

        const response = context.doPost({
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
        return JSON.parse(response.content);
    }

    function records(sheetName) {
        const headers = HEADERS[sheetName];
        return sheets[sheetName].values.slice(1).map((row) =>
            Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
        );
    }

    return { call, records };
}

test("service.listMine retorna somente os serviços do profissional da sessão", () => {
    const harness = createHarness();

    const resultA = harness.call("service.listMine", { tokenHash: TOKEN_HASH_A });
    const resultB = harness.call("service.listMine", { tokenHash: TOKEN_HASH_B });

    assert.equal(resultA.ok, true);
    assert.deepEqual(resultA.data.services.map((service) => service.id), [SERVICE_A]);
    assert.equal(resultA.data.services.some((service) => service.id === SERVICE_B), false);

    assert.equal(resultB.ok, true);
    assert.deepEqual(resultB.data.services.map((service) => service.id), [SERVICE_B]);
    assert.equal(resultB.data.services.some((service) => service.id === SERVICE_A), false);
});

test("profissional A não consegue pausar serviço pertencente ao profissional B", () => {
    const harness = createHarness();
    const result = harness.call("service.setStatus", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_B,
        status: "paused",
        id_usuario: USER_B,
        id_profissional: PROFILE_B,
        papel: "admin",
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "SERVICE_NOT_FOUND");
    assert.equal(
        harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_B).status,
        "published",
    );
    assert.equal(
        harness.records("AUDITORIA").some((event) =>
            event.acao === "service.status"
            && event.id_registro_afetado === SERVICE_B
            && event.resultado === "success",
        ),
        false,
    );
});

test("profissional A pode alterar o próprio serviço, mas não altera o proprietário enviado pelo cliente", () => {
    const harness = createHarness();
    const result = harness.call("service.setStatus", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        status: "paused",
        id_usuario: USER_B,
        id_profissional: PROFILE_B,
        papel: "admin",
    });

    assert.equal(result.ok, true);
    assert.equal(
        harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_A).status,
        "paused",
    );
    assert.equal(
        harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_B).status,
        "published",
    );

    const audit = harness.records("AUDITORIA").find((event) =>
        event.acao === "service.status" && event.id_registro_afetado === SERVICE_A,
    );
    assert.ok(audit);
    assert.equal(audit.id_usuario_ator, USER_A);
    assert.equal(audit.resultado, "success");
});

test("alteração de perfil ignora tentativa de trocar identidade, papel e estado da conta", () => {
    const harness = createHarness();
    const result = harness.call("profile.update", {
        tokenHash: TOKEN_HASH_A,
        nome_publico: "Equipe A atualizada",
        apresentacao: "Apresentação atualizada para o teste de autorização.",
        id_cidade_principal: CITY_ID,
        whatsapp: "34999990001",
        id_usuario: USER_B,
        id_profissional: PROFILE_B,
        papel: "admin",
        status: "suspended",
    });

    assert.equal(result.ok, true);
    const profiles = harness.records("PROFISSIONAIS");
    const profileA = profiles.find((profile) => profile.id_profissional === PROFILE_A);
    const profileB = profiles.find((profile) => profile.id_profissional === PROFILE_B);
    const users = harness.records("USUARIOS");

    assert.equal(profileA.id_usuario, USER_A);
    assert.equal(profileA.nome_publico, "Equipe A atualizada");
    assert.equal(profileB.id_usuario, USER_B);
    assert.equal(profileB.nome_publico, "Equipe B");
    assert.equal(users.find((user) => user.id_usuario === USER_A).papel, "professional");
    assert.equal(users.find((user) => user.id_usuario === USER_A).status, "active");

    const audit = harness.records("AUDITORIA").find((event) => event.acao === "profile.update");
    assert.ok(audit);
    assert.equal(audit.id_usuario_ator, USER_A);
    assert.equal(audit.id_registro_afetado, PROFILE_A);
    assert.equal(audit.resultado, "success");
});

test("criação de serviço deriva o proprietário da sessão e ignora IDs de proprietário enviados", () => {
    const harness = createHarness();
    const result = harness.call("service.create", {
        tokenHash: TOKEN_HASH_A,
        categoryId: CATEGORY_ID,
        title: "Serviço criado pela conta A",
        description: "Descrição fictícia válida para testar a origem do proprietário.",
        id_usuario: USER_B,
        id_profissional: PROFILE_B,
        papel: "admin",
    });

    assert.equal(result.ok, true);
    const created = harness.records("SERVICOS").find(
        (service) => service.id_servico === result.data.service.id,
    );

    assert.ok(created);
    assert.equal(created.id_profissional, PROFILE_A);
    assert.notEqual(created.id_profissional, PROFILE_B);

    const audit = harness.records("AUDITORIA").find((event) =>
        event.acao === "service.create" && event.id_registro_afetado === created.id_servico,
    );
    assert.ok(audit);
    assert.equal(audit.id_usuario_ator, USER_A);
    assert.equal(audit.resultado, "success");
});

test("estado administrativo não pode ser definido por profissional", () => {
    const harness = createHarness();
    const result = harness.call("service.setStatus", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        status: "suspended",
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "INVALID_STATUS");
    assert.equal(
        harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_A).status,
        "published",
    );
    assert.equal(
        harness.records("AUDITORIA").some((event) =>
            event.acao === "service.status" && event.resultado === "success",
        ),
        false,
    );
});

test("token de sessão inválido não permite alteração de serviço", () => {
    const harness = createHarness();
    const result = harness.call("service.setStatus", {
        tokenHash: "9".repeat(64),
        serviceId: SERVICE_A,
        status: "paused",
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "SESSION_INVALID");
    assert.equal(
        harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_A).status,
        "published",
    );
    assert.equal(harness.records("AUDITORIA").length, 0);
});
