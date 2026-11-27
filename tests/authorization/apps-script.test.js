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
const CITY_ID_B = "city-synthetic-b";

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
    CODIGOS_VERIFICACAO: [
        "id_codigo", "id_usuario", "finalidade", "email_destino", "codigo_hmac",
        "criado_em", "expira_em", "tentativas", "utilizado_em", "invalidado_em",
    ],
    CATEGORIAS: ["id_categoria", "nome", "status", "criado_em", "atualizado_em"],
    CIDADES: ["id_cidade", "nome", "uf", "codigo_ibge", "status", "criado_em", "atualizado_em"],
    SERVICOS: [
        "id_servico", "id_profissional", "id_categoria", "nome_servico",
        "descricao", "bairros_regioes", "modalidade_preco", "valor_preco",
        "status", "criado_em", "atualizado_em", "publicado_em",
    ],
    SERVICO_CIDADES: ["id_servico_cidade", "id_servico", "id_cidade", "criado_em"],
    IMAGENS: [
        "id_imagem", "id_profissional", "id_servico", "id_arquivo_drive",
        "tipo_mime", "tamanho_bytes", "ordem_exibicao", "status",
        "criado_em", "atualizado_em",
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

    deleteRow(rowNumber) {
        this.values.splice(rowNumber - 1, 1);
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

function createHarness(options = {}) {
    let uuidCounter = 1;
    let requestCounter = 1;
    let nonceCounter = 1;
    const properties = new Map([
        ["CONECTA_LOCAL_HMAC_SECRET", SECRET],
        ["CONECTA_LOCAL_SPREADSHEET_ID", SPREADSHEET_ID],
        ["CONECTA_LOCAL_DRIVE_FOLDER_ID", "synthetic-drive-folder-00000001"],
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
                papel: options.userARole || "professional",
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
                status: options.categoryStatus || "active",
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
            {
                id_cidade: CITY_ID_B,
                nome: "Outra Cidade Fictícia",
                uf: "MG",
                codigo_ibge: "",
                status: options.cityBStatus || "active",
                criado_em: sessionCreatedAt,
                atualizado_em: sessionCreatedAt,
            },
        ],
        SERVICO_CIDADES: options.serviceCityRecords || [],
        IMAGENS: options.imageRecords || [],
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
                status: options.serviceAStatus || "published",
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
                const id = "00000000-0000-4000-8000-" + String(uuidCounter).padStart(12, "0");
                uuidCounter += 1;
                return id;
            },
            base64Decode(value) {
                return Array.from(Buffer.from(String(value), "base64"), (byte) => byte > 127 ? byte - 256 : byte);
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

    let driveSessionCounter = 1;
    let driveFileCounter = 1;
    const driveSessions = new Map();
    const driveFiles = new Map();
    const driveCalls = [];
    let omitNextChunkRange = false;

    function driveResponse(status, headers = {}, body = "") {
        return {
            getResponseCode() { return status; },
            getAllHeaders() { return headers; },
            getContentText() { return body; },
        };
    }

    const fakeUrlFetch = {
        fetch(url, requestOptions = {}) {
            driveCalls.push({ url, options: requestOptions });
            if (String(url).indexOf("uploadType=resumable") !== -1 && String(requestOptions.method).toLowerCase() === "post") {
                const sessionId = "synthetic-upload-" + driveSessionCounter++;
                const sessionUri = typeof options.driveSessionUri === "function"
                    ? options.driveSessionUri(sessionId)
                    : options.driveSessionUri || "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id%2Cname%2CmimeType%2Csize%2Cparents&upload_id=" + sessionId + "&session_crd=synthetic-session-credential";
                const metadata = JSON.parse(String(requestOptions.payload));
                driveSessions.set(sessionUri, {
                    sessionUri,
                    mimeType: metadata.mimeType,
                    size: Number(requestOptions.headers["X-Upload-Content-Length"]),
                    folderId: metadata.parents[0],
                    received: 0,
                    file: null,
                });
                return driveResponse(200, { Location: sessionUri });
            }

            const session = driveSessions.get(String(url));
            if (!session) return driveResponse(404);
            const range = String(requestOptions.headers?.["Content-Range"] || "");
            if (range === "bytes */" + session.size) {
                if (session.file) return driveResponse(200, {}, JSON.stringify(session.file));
                const headers = session.received
                    ? { Range: "bytes=0-" + (session.received - 1) }
                    : {};
                return driveResponse(308, headers);
            }

            const match = range.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
            if (!match) return driveResponse(400);
            const start = Number(match[1]);
            const end = Number(match[2]);
            const total = Number(match[3]);
            const bytes = Array.isArray(requestOptions.payload)
                ? requestOptions.payload.length
                : Buffer.byteLength(String(requestOptions.payload || ""));
            if (start !== session.received || total !== session.size || end - start + 1 !== bytes) {
                return driveResponse(400);
            }
            session.received += bytes;
            if (session.received < session.size) {
                if (omitNextChunkRange) {
                    omitNextChunkRange = false;
                    return driveResponse(308);
                }
                return driveResponse(308, { Range: "bytes=0-" + (session.received - 1) });
            }
            const fileId = "synthetic-drive-file-" + driveFileCounter++;
            session.file = {
                id: fileId,
                name: "synthetic-image.png",
                mimeType: session.mimeType,
                size: String(session.size),
                parents: [session.folderId],
            };
            const fileState = {
                id: fileId,
                size: session.size,
                mimeType: session.mimeType,
                sharing: "PRIVATE",
                trashed: false,
                sharingHistory: [],
                setSharing(access, permission) {
                    this.sharing = access;
                    this.sharingHistory.push({ access, permission });
                },
                setTrashed(value) { this.trashed = Boolean(value); },
                isTrashed() { return this.trashed; },
                getId() { return this.id; },
                getSize() { return this.size; },
                getMimeType() { return this.mimeType; },
            };
            driveFiles.set(fileId, fileState);
            return driveResponse(200, {}, JSON.stringify(session.file));
        },
    };

    const folderId = "synthetic-drive-folder-00000001";
    const driveApp = {
        Access: { PRIVATE: "PRIVATE", ANYONE_WITH_LINK: "ANYONE_WITH_LINK" },
        Permission: { VIEW: "VIEW" },
        getFolderById(id) {
            if (id !== folderId) throw new Error("Unknown synthetic folder");
            return {
                getId() { return folderId; },
                getSharingAccess() { return "PRIVATE"; },
            };
        },
        getFileById(id) {
            const file = driveFiles.get(String(id));
            if (!file) throw new Error("Unknown synthetic file");
            return file;
        },
    };

    context.UrlFetchApp = fakeUrlFetch;
    context.ScriptApp = { getOAuthToken: () => "synthetic-drive-oauth-token-for-test-validation" };
    context.DriveApp = driveApp;

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

    return {
        call,
        records,
        driveFiles,
        driveSessions,
        driveCalls,
        properties,
        omitNextChunkRange() { omitNextChunkRange = true; },
    };
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
        nome_completo: "Profissional A Atualizado",
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
    assert.equal(profileA.nome_completo, "Profissional A Atualizado");
    assert.equal(profileA.nome_publico, "Equipe A atualizada");
    assert.equal(profileA.whatsapp, "5534999990001");
    assert.equal(profileB.id_usuario, USER_B);
    assert.equal(profileB.nome_publico, "Equipe B");
    assert.equal(users.find((user) => user.id_usuario === USER_A).email, "profissional-a@example.test");
    assert.equal(users.find((user) => user.id_usuario === USER_A).papel, "professional");
    assert.equal(users.find((user) => user.id_usuario === USER_A).status, "active");

    const audit = harness.records("AUDITORIA").find((event) => event.acao === "profile.update");
    assert.ok(audit);
    assert.equal(audit.id_usuario_ator, USER_A);
    assert.equal(audit.id_registro_afetado, PROFILE_A);
    assert.equal(audit.resultado, "success");
});


test("auth.reauth.lookup deriva credenciais da sessão e limita tentativas por conta", () => {
    const harness = createHarness();

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = harness.call("auth.reauth.lookup", { tokenHash: TOKEN_HASH_A });
        assert.equal(result.ok, true);
        assert.equal(result.data.idUsuario, USER_A);
        assert.equal(result.data.status, "active");
        assert.equal(result.data.algoritmo, "argon2id$v=19$m=19456,t=2,p=1");
    }

    const blocked = harness.call("auth.reauth.lookup", { tokenHash: TOKEN_HASH_A });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error.code, "REAUTH_RATE_LIMITED");

    const reset = harness.call("auth.reauth.success", { tokenHash: TOKEN_HASH_A });
    assert.equal(reset.ok, true);
    assert.equal(reset.data.reauthenticated, true);

    const allowedAgain = harness.call("auth.reauth.lookup", { tokenHash: TOKEN_HASH_A });
    assert.equal(allowedAgain.ok, true);
});

test("email.change.start mantém o e-mail atual até a confirmação e grava somente HMAC do código", () => {
    const harness = createHarness();
    const started = harness.call("email.change.start", {
        tokenHash: TOKEN_HASH_A,
        newEmail: " Novo.Endereco@Example.Test ",
        verificationCode: "135790",
        id_usuario: USER_B,
        email_destino: "forjado@example.test",
    });

    assert.equal(started.ok, true);
    assert.equal(started.data.requested, true);
    assert.equal(started.data.pendingEmail, "novo.endereco@example.test");
    assert.equal(harness.records("USUARIOS").find((user) => user.id_usuario === USER_A).email, "profissional-a@example.test");

    const code = harness.records("CODIGOS_VERIFICACAO")[0];
    assert.equal(code.id_usuario, USER_A);
    assert.equal(code.finalidade, "change_email");
    assert.equal(code.email_destino, "novo.endereco@example.test");
    assert.equal(code.tentativas, 0);
    assert.equal(code.utilizado_em, "");
    assert.equal(code.invalidado_em, "");
    assert.match(code.codigo_hmac, /^[a-f0-9]{64}$/);
    assert.equal(code.codigo_hmac.includes("135790"), false);

    const audit = harness.records("AUDITORIA").find((event) => event.acao === "auth.change_email.request");
    assert.ok(audit);
    assert.equal(audit.id_usuario_ator, USER_A);
    assert.equal(audit.id_registro_afetado, code.id_codigo);
    assert.equal(audit.resultado, "success");
    assert.equal(audit.detalhes.includes("135790"), false);
    assert.equal(audit.detalhes.includes("novo.endereco"), false);
});

test("email.change.start rejeita e-mail cadastrado, endereço reservado e nova solicitação antes de 60 segundos", () => {
    const harness = createHarness();

    const duplicate = harness.call("email.change.start", {
        tokenHash: TOKEN_HASH_A,
        newEmail: "profissional-b@example.test",
        verificationCode: "111111",
    });
    assert.equal(duplicate.ok, false);
    assert.equal(duplicate.error.code, "EMAIL_ALREADY_EXISTS");

    const first = harness.call("email.change.start", {
        tokenHash: TOKEN_HASH_A,
        newEmail: "reservado@example.test",
        verificationCode: "222222",
    });
    assert.equal(first.ok, true);

    const tooSoon = harness.call("email.change.start", {
        tokenHash: TOKEN_HASH_A,
        newEmail: "outro@example.test",
        verificationCode: "333333",
    });
    assert.equal(tooSoon.ok, false);
    assert.equal(tooSoon.error.code, "VERIFICATION_RESEND_TOO_SOON");

    const reserved = harness.call("email.change.start", {
        tokenHash: TOKEN_HASH_B,
        newEmail: "reservado@example.test",
        verificationCode: "444444",
    });
    assert.equal(reserved.ok, false);
    assert.equal(reserved.error.code, "EMAIL_ALREADY_RESERVED");
});

test("email.change.confirm consome código, atualiza o e-mail e revoga todas as sessões do usuário", () => {
    const harness = createHarness();
    const started = harness.call("email.change.start", {
        tokenHash: TOKEN_HASH_A,
        newEmail: "confirmado@example.test",
        verificationCode: "246810",
    });
    assert.equal(started.ok, true);

    const wrong = harness.call("email.change.confirm", {
        tokenHash: TOKEN_HASH_A,
        code: "000000",
    });
    assert.equal(wrong.ok, false);
    assert.equal(wrong.error.code, "VERIFICATION_FAILED");
    assert.equal(harness.records("USUARIOS").find((user) => user.id_usuario === USER_A).email, "profissional-a@example.test");
    assert.equal(harness.records("CODIGOS_VERIFICACAO")[0].tentativas, 1);

    const confirmed = harness.call("email.change.confirm", {
        tokenHash: TOKEN_HASH_A,
        code: "246810",
    });
    assert.equal(confirmed.ok, true);
    assert.equal(confirmed.data.changed, true);
    assert.equal(confirmed.data.email, "confirmado@example.test");
    assert.equal(confirmed.data.requiresLogin, true);

    const userA = harness.records("USUARIOS").find((user) => user.id_usuario === USER_A);
    assert.equal(userA.email, "confirmado@example.test");
    assert.ok(userA.email_verificado_em);
    const code = harness.records("CODIGOS_VERIFICACAO")[0];
    assert.ok(code.utilizado_em);
    assert.equal(code.invalidado_em, "");
    assert.equal(code.email_destino, "");
    assert.equal(code.codigo_hmac, "");

    const sessions = harness.records("SESSOES");
    assert.ok(sessions.find((session) => session.id_usuario === USER_A).revogada_em);
    assert.equal(sessions.find((session) => session.id_usuario === USER_B).revogada_em, "");

    const oldSession = harness.call("session.me", { tokenHash: TOKEN_HASH_A });
    assert.equal(oldSession.ok, false);
    assert.equal(oldSession.error.code, "SESSION_INVALID");

    const audit = harness.records("AUDITORIA").find((event) => event.acao === "auth.change_email.confirm");
    assert.ok(audit);
    assert.equal(audit.id_usuario_ator, USER_A);
    assert.equal(audit.id_registro_afetado, USER_A);
    assert.equal(audit.resultado, "success");
});

test("email.change.confirm invalida o código após cinco tentativas incorretas", () => {
    const harness = createHarness();
    harness.call("email.change.start", {
        tokenHash: TOKEN_HASH_A,
        newEmail: "tentativas@example.test",
        verificationCode: "987654",
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = harness.call("email.change.confirm", {
            tokenHash: TOKEN_HASH_A,
            code: "000000",
        });
        assert.equal(result.ok, false);
        assert.equal(result.error.code, "VERIFICATION_FAILED");
    }

    const record = harness.records("CODIGOS_VERIFICACAO")[0];
    assert.equal(record.tentativas, 5);
    assert.ok(record.invalidado_em);
    assert.equal(harness.records("USUARIOS").find((user) => user.id_usuario === USER_A).email, "profissional-a@example.test");

    const exhausted = harness.call("email.change.confirm", {
        tokenHash: TOKEN_HASH_A,
        code: "987654",
    });
    assert.equal(exhausted.ok, false);
    assert.equal(exhausted.error.code, "EMAIL_CHANGE_PENDING_NOT_FOUND");
});

test("email.change.start e email.change.confirm exigem sessão profissional válida", () => {
    const harness = createHarness({ userARole: "admin" });

    const start = harness.call("email.change.start", {
        tokenHash: TOKEN_HASH_A,
        newEmail: "admin@example.test",
        verificationCode: "555555",
    });
    assert.equal(start.ok, false);
    assert.equal(start.error.code, "ROLE_FORBIDDEN");

    const noSession = harness.call("email.change.confirm", {
        tokenHash: "9".repeat(64),
        code: "555555",
    });
    assert.equal(noSession.ok, false);
    assert.equal(noSession.error.code, "SESSION_INVALID");
});

test("criação de serviço deriva o proprietário da sessão e ignora IDs de proprietário enviados", () => {
    const harness = createHarness();
    const result = harness.call("service.create", {
        tokenHash: TOKEN_HASH_A,
        categoryId: CATEGORY_ID,
        title: "Serviço criado pela conta A",
        description: "Descrição fictícia válida para testar a origem do proprietário.",
        cityIds: [CITY_ID],
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


test("papel diferente de professional não autoriza operações profissionais", () => {
    const harness = createHarness({ userARole: "admin" });
    const result = harness.call("service.setStatus", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        status: "paused",
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "ROLE_FORBIDDEN");
    assert.equal(
        harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_A).status,
        "published",
    );
    assert.equal(
        harness.records("SESSOES").find((session) => session.token_hash === TOKEN_HASH_A).ultima_atividade_em,
        new Date(NOW - 60_000).toISOString(),
    );
    assert.equal(harness.records("AUDITORIA").length, 0);
});


test("service.update altera somente os campos permitidos do próprio serviço e audita o ator da sessão", () => {
    const harness = createHarness();
    const result = harness.call("service.update", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        categoryId: CATEGORY_ID,
        title: "Serviço A atualizado",
        description: "Descrição atualizada para validar a edição do serviço próprio.",
            cityIds: [CITY_ID],
        id_usuario: USER_B,
        id_profissional: PROFILE_B,
        papel: "admin",
        status: "removed",
        publicado_em: "data-forjada",
    });

    assert.equal(result.ok, true);
    const services = harness.records("SERVICOS");
    const serviceA = services.find((service) => service.id_servico === SERVICE_A);
    const serviceB = services.find((service) => service.id_servico === SERVICE_B);

    assert.equal(serviceA.nome_servico, "Serviço A atualizado");
    assert.equal(serviceA.descricao, "Descrição atualizada para validar a edição do serviço próprio.");
    assert.equal(serviceA.id_categoria, CATEGORY_ID);
    assert.equal(serviceA.id_profissional, PROFILE_A);
    assert.equal(serviceA.status, "published");
    assert.equal(serviceA.publicado_em, serviceA.criado_em);
    assert.equal(serviceB.nome_servico, "Serviço da conta B");

    const audit = harness.records("AUDITORIA").find((event) =>
        event.acao === "service.update" && event.id_registro_afetado === SERVICE_A,
    );
    assert.ok(audit);
    assert.equal(audit.id_usuario_ator, USER_A);
    assert.equal(audit.resultado, "success");
    assert.equal(result.data.service.title, "Serviço A atualizado");
});

test("profissional A não consegue editar serviço pertencente ao profissional B", () => {
    const harness = createHarness();
    const result = harness.call("service.update", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_B,
        categoryId: CATEGORY_ID,
        title: "Tentativa de invasão",
        description: "Tentativa de alteração de serviço pertencente a outra conta.",
            cityIds: [CITY_ID],
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "SERVICE_NOT_FOUND");
    assert.equal(
        harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_B).nome_servico,
        "Serviço da conta B",
    );
    assert.equal(
        harness.records("AUDITORIA").some((event) => event.acao === "service.update" && event.resultado === "success"),
        false,
    );
});

test("serviço suspenso ou removido não pode ser editado pelo profissional", () => {
    for (const status of ["suspended", "removed"]) {
        const harness = createHarness({ serviceAStatus: status });
        const result = harness.call("service.update", {
            tokenHash: TOKEN_HASH_A,
            serviceId: SERVICE_A,
            categoryId: CATEGORY_ID,
            title: "Alteração não permitida",
            description: "Esta edição deve ser recusada pelo estado do serviço.",
            cityIds: [CITY_ID],
        });

        assert.equal(result.ok, false, "estado " + status);
        assert.equal(result.error.code, "SERVICE_STATE_LOCKED", "estado " + status);
        assert.equal(
            harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_A).status,
            status,
        );
        assert.equal(
            harness.records("AUDITORIA").some((event) => event.acao === "service.update" && event.resultado === "success"),
            false,
        );
    }
});

test("service.remove marca o serviço próprio como removed e preserva o registro e a auditoria", () => {
    const harness = createHarness();
    const result = harness.call("service.remove", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        id_usuario: USER_B,
        id_profissional: PROFILE_B,
        papel: "admin",
    });

    assert.equal(result.ok, true);
    const services = harness.records("SERVICOS");
    const serviceA = services.find((service) => service.id_servico === SERVICE_A);
    assert.ok(serviceA, "a linha original deve permanecer na planilha");
    assert.equal(serviceA.status, "removed");
    assert.equal(serviceA.id_profissional, PROFILE_A);
    assert.equal(serviceA.nome_servico, "Serviço da conta A");
    assert.equal(services.length, 2);

    const audit = harness.records("AUDITORIA").find((event) =>
        event.acao === "service.remove" && event.id_registro_afetado === SERVICE_A,
    );
    assert.ok(audit);
    assert.equal(audit.id_usuario_ator, USER_A);
    assert.equal(audit.resultado, "success");
    assert.equal(result.data.removed, true);
    assert.equal(result.data.service.status, "removed");
});

test("profissional A não consegue remover serviço pertencente ao profissional B", () => {
    const harness = createHarness();
    const result = harness.call("service.remove", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_B,
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "SERVICE_NOT_FOUND");
    assert.equal(
        harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_B).status,
        "published",
    );
    assert.equal(
        harness.records("AUDITORIA").some((event) => event.acao === "service.remove" && event.resultado === "success"),
        false,
    );
});

test("serviço suspenso ou já removido não pode ser removido novamente pelo profissional", () => {
    for (const status of ["suspended", "removed"]) {
        const harness = createHarness({ serviceAStatus: status });
        const result = harness.call("service.remove", {
            tokenHash: TOKEN_HASH_A,
            serviceId: SERVICE_A,
        });

        assert.equal(result.ok, false, "estado " + status);
        assert.equal(result.error.code, "SERVICE_STATE_LOCKED", "estado " + status);
        assert.equal(
            harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_A).status,
            status,
        );
        assert.equal(harness.records("AUDITORIA").length, 0);
    }
});

test("serviço removido ou suspenso não pode ser reativado pelo profissional", () => {
    for (const status of ["suspended", "removed"]) {
        const harness = createHarness({ serviceAStatus: status });
        const result = harness.call("service.setStatus", {
            tokenHash: TOKEN_HASH_A,
            serviceId: SERVICE_A,
            status: "published",
        });

        assert.equal(result.ok, false, "estado " + status);
        assert.equal(result.error.code, "SERVICE_STATE_LOCKED", "estado " + status);
        assert.equal(
            harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_A).status,
            status,
        );
        assert.equal(harness.records("AUDITORIA").length, 0);
    }
});


test("service.listMine mantém cidade principal nos serviços antigos sem relação SERVICO_CIDADES", () => {
    const harness = createHarness();
    const result = harness.call("service.listMine", { tokenHash: TOKEN_HASH_A });
    assert.equal(result.ok, true);
    assert.deepEqual(result.data.services[0].cityIds, [CITY_ID]);
    assert.equal(result.data.services[0].city, "Cidade Fictícia - MG");
});

test("service.create grava múltiplas cidades na relação SERVICO_CIDADES", () => {
    const harness = createHarness();
    const result = harness.call("service.create", {
        tokenHash: TOKEN_HASH_A,
        categoryId: CATEGORY_ID,
        title: "Serviço em duas cidades",
        description: "Descrição fictícia válida para cobertura em mais de um município.",
        cityIds: [CITY_ID, CITY_ID_B],
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.data.service.cityIds, [CITY_ID, CITY_ID_B]);
    assert.deepEqual(
        harness.records("SERVICO_CIDADES")
            .filter((link) => link.id_servico === result.data.service.id)
            .map((link) => link.id_cidade),
        [CITY_ID, CITY_ID_B],
    );
});

test("service.create rejeita cidade vazia, duplicada ou inativa", () => {
    const cases = [
        { cityIds: [], code: "CITY_INVALID" },
        { cityIds: [CITY_ID, CITY_ID], code: "INVALID_INPUT" },
        { cityIds: [CITY_ID_B], code: "CITY_INVALID", cityBStatus: "inactive" },
    ];
    cases.forEach(({ cityIds, code, cityBStatus }) => {
        const harness = createHarness({ cityBStatus });
        const result = harness.call("service.create", {
            tokenHash: TOKEN_HASH_A,
            categoryId: CATEGORY_ID,
            title: "Serviço com cidade inválida",
            description: "Descrição fictícia válida para validar municípios.",
            cityIds,
        });
        assert.equal(result.ok, false);
        assert.equal(result.error.code, code);
        assert.equal(harness.records("SERVICOS").length, 2);
        assert.equal(harness.records("SERVICO_CIDADES").length, 0);
        assert.equal(harness.records("AUDITORIA").length, 0);
    });
});

test("service.update substitui os vínculos de cidade somente do serviço próprio", () => {
    const harness = createHarness({
        serviceCityRecords: [{
            id_servico_cidade: "link-service-a-city-a",
            id_servico: SERVICE_A,
            id_cidade: CITY_ID,
            criado_em: new Date(NOW - 60_000).toISOString(),
        }],
    });
    const result = harness.call("service.update", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        categoryId: CATEGORY_ID,
        title: "Serviço A atualizado",
        description: "Descrição atualizada para testar troca de município.",
        cityIds: [CITY_ID_B],
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.data.service.cityIds, [CITY_ID_B]);
    assert.deepEqual(
        harness.records("SERVICO_CIDADES")
            .filter((link) => link.id_servico === SERVICE_A)
            .map((link) => link.id_cidade),
        [CITY_ID_B],
    );
    assert.equal(harness.records("SERVICO_CIDADES").some((link) => link.id_servico === SERVICE_B), false);
});

test("catálogo público usa cidades vinculadas e preserva serviço publicado com categoria inativa", () => {
    const harness = createHarness({
        categoryStatus: "inactive",
        serviceCityRecords: [{
            id_servico_cidade: "link-service-a-city-b",
            id_servico: SERVICE_A,
            id_cidade: CITY_ID_B,
            criado_em: new Date(NOW - 60_000).toISOString(),
        }],
    });
    const result = harness.call("public.services", {});
    assert.equal(result.ok, true);
    assert.equal(result.data.length, 2);
    const serviceA = result.data.find((service) => service.id === SERVICE_A);
    assert.deepEqual(serviceA.cityIds, [CITY_ID_B]);
    assert.equal(serviceA.city, "Outra Cidade Fictícia - MG");
});

test("papel diferente de professional não autoriza editar ou remover serviços", () => {
    for (const action of ["service.update", "service.remove"]) {
        const harness = createHarness({ userARole: "admin" });
        const payload = action === "service.update"
            ? {
                tokenHash: TOKEN_HASH_A,
                serviceId: SERVICE_A,
                categoryId: CATEGORY_ID,
                title: "Edição recusada",
                description: "Ação bloqueada para papel diferente de professional.",
            cityIds: [CITY_ID],
            }
            : { tokenHash: TOKEN_HASH_A, serviceId: SERVICE_A };
        const result = harness.call(action, payload);

        assert.equal(result.ok, false, action);
        assert.equal(result.error.code, "ROLE_FORBIDDEN", action);
        assert.equal(
            harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_A).status,
            "published",
        );
        assert.equal(
            harness.records("SESSOES").find((session) => session.token_hash === TOKEN_HASH_A).ultima_atividade_em,
            new Date(NOW - 60_000).toISOString(),
        );
        assert.equal(harness.records("AUDITORIA").length, 0);
    }
});


function createPngBytes(size = 24) {
    const bytes = Buffer.alloc(size, 0);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
    return bytes;
}

function startPngUpload(harness, tokenHash = TOKEN_HASH_A, serviceId = SERVICE_A) {
    const bytes = createPngBytes();
    const started = harness.call("image.upload.start", {
        tokenHash,
        serviceId,
        fileSize: bytes.length,
        mimeType: "image/png",
    });
    assert.equal(started.ok, true);
    const uploaded = harness.call("image.upload.chunk", {
        tokenHash,
        uploadId: started.data.uploadId,
        startOffset: 0,
        totalSize: bytes.length,
        chunkBase64: bytes.toString("base64"),
    });
    return { bytes, started, uploaded };
}

function startPngProfilePhotoUpload(harness, tokenHash = TOKEN_HASH_A) {
    const bytes = createPngBytes();
    const started = harness.call("profile.photo.upload.start", {
        tokenHash,
        fileSize: bytes.length,
        mimeType: "image/png",
    });
    assert.equal(started.ok, true, "Início do upload da foto falhou: " + JSON.stringify(started));
    const uploaded = harness.call("image.upload.chunk", {
        tokenHash,
        uploadId: started.data.uploadId,
        startOffset: 0,
        totalSize: bytes.length,
        chunkBase64: bytes.toString("base64"),
    });
    return { bytes, started, uploaded };
}

test("image.upload.start aceita URI oficial com fields e session_crd retornados pelo Drive", () => {
    const harness = createHarness();
    const result = harness.call("image.upload.start", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        fileSize: 24,
        mimeType: "image/png",
    });

    assert.equal(result.ok, true, "A URI oficial com parâmetros adicionais deve ser aceita: " + JSON.stringify(result));
    assert.equal(harness.driveSessions.size, 1);
    const session = Array.from(harness.driveSessions.values())[0];
    assert.match(session.sessionUri, /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?/);
    assert.match(session.sessionUri, /[?&]fields=/);
    assert.match(session.sessionUri, /[?&]upload_id=/);
    assert.match(session.sessionUri, /[?&]session_crd=/);
    assert.equal(harness.records("IMAGENS").length, 0);
});

test("image.upload.start rejeita URI de sessão fora do endpoint oficial do Google", () => {
    const harness = createHarness({
        driveSessionUri: (sessionId) =>
            "https://attacker.example/upload/drive/v3/files?uploadType=resumable&upload_id=" + sessionId,
    });
    const result = harness.call("image.upload.start", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        fileSize: 24,
        mimeType: "image/png",
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "DRIVE_UPLOAD_START_FAILED");
    assert.equal(harness.records("IMAGENS").length, 0);
});

test("image.upload.start e image.upload.chunk gravam metadados somente após confirmação do Drive", () => {
    const harness = createHarness();
    const { uploaded } = startPngUpload(harness);

    assert.equal(uploaded.ok, true, "Chunk falhou: " + JSON.stringify(uploaded));
    assert.equal(uploaded.data.completed, true);
    assert.equal(uploaded.data.image.status, "active");
    assert.equal(uploaded.data.image.order, 1);
    assert.equal(uploaded.data.image.mimeType, "image/png");
    assert.equal(uploaded.data.image.sizeBytes, 24);
    assert.match(uploaded.data.image.url, /^https:\/\/drive\.google\.com\/uc\?export=view&id=/);

    const rows = harness.records("IMAGENS");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id_servico, SERVICE_A);
    assert.equal(rows[0].id_profissional, "");
    assert.equal(rows[0].id_arquivo_drive, "synthetic-drive-file-1");
    assert.equal(rows[0].status, "active");
    assert.equal(harness.driveFiles.get("synthetic-drive-file-1").sharing, "ANYONE_WITH_LINK");

    const audit = harness.records("AUDITORIA").find((event) => event.acao === "image.upload");
    assert.ok(audit);
    assert.equal(audit.id_usuario_ator, USER_A);
    assert.equal(audit.resultado, "success");
});

test("image.upload.start rejeita tamanho acima de 5.000.000 bytes", () => {
    const harness = createHarness();
    const result = harness.call("image.upload.start", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        fileSize: 5_000_001,
        mimeType: "image/png",
    });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "IMAGE_SIZE_INVALID");
    assert.equal(harness.driveCalls.length, 0);
    assert.equal(harness.records("IMAGENS").length, 0);
});

test("image.upload.start rejeita MIME não permitido", () => {
    const harness = createHarness();
    const result = harness.call("image.upload.start", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        fileSize: 24,
        mimeType: "image/svg+xml",
    });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "IMAGE_MIME_INVALID");
    assert.equal(harness.driveCalls.length, 0);
});

test("image.upload.start não permite que um profissional envie imagem para serviço de outro", () => {
    const harness = createHarness();
    const result = harness.call("image.upload.start", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_B,
        fileSize: 24,
        mimeType: "image/png",
    });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "SERVICE_NOT_FOUND");
    assert.equal(harness.driveCalls.length, 0);
    assert.equal(harness.records("IMAGENS").length, 0);
});

test("image.upload.chunk rejeita conteúdo cujo cabeçalho binário não corresponde ao MIME", () => {
    const harness = createHarness();
    const started = harness.call("image.upload.start", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        fileSize: 24,
        mimeType: "image/png",
    });
    assert.equal(started.ok, true);

    const invalid = Buffer.alloc(24, 65);
    const result = harness.call("image.upload.chunk", {
        tokenHash: TOKEN_HASH_A,
        uploadId: started.data.uploadId,
        startOffset: 0,
        totalSize: invalid.length,
        chunkBase64: invalid.toString("base64"),
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "IMAGE_CONTENT_INVALID");
    assert.equal(harness.records("IMAGENS").length, 0);
    assert.equal(harness.driveCalls.filter((call) => String(call.options.method).toLowerCase() === "put").length, 0);
});

test("as imagens de serviço publicado ficam públicas e são restringidas ao pausar", () => {
    const harness = createHarness();
    const { uploaded } = startPngUpload(harness);
    assert.equal(uploaded.ok, true);

    const file = harness.driveFiles.get("synthetic-drive-file-1");
    assert.equal(file.sharing, "ANYONE_WITH_LINK");

    const paused = harness.call("service.setStatus", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        status: "paused",
    });
    assert.equal(paused.ok, true);
    assert.equal(file.sharing, "PRIVATE");

    const published = harness.call("service.setStatus", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        status: "published",
    });
    assert.equal(published.ok, true);
    assert.equal(file.sharing, "ANYONE_WITH_LINK");
});

test("image.remove restringe acesso antes de marcar a imagem como removida", () => {
    const harness = createHarness();
    const { uploaded } = startPngUpload(harness);
    assert.equal(uploaded.ok, true);
    const imageId = uploaded.data.image.id;
    const file = harness.driveFiles.get("synthetic-drive-file-1");

    const removed = harness.call("image.remove", {
        tokenHash: TOKEN_HASH_A,
        imageId,
    });
    assert.equal(removed.ok, true);
    assert.equal(removed.data.removed, true);
    assert.equal(file.sharing, "PRIVATE");
    assert.equal(harness.records("IMAGENS")[0].status, "removed");

    const mine = harness.call("service.listMine", { tokenHash: TOKEN_HASH_A });
    assert.equal(mine.ok, true);
    assert.deepEqual(mine.data.services[0].images, []);
});

test("image.upload.cancel libera a reserva do serviço e não cria metadados", () => {
    const harness = createHarness();
    const bytes = createPngBytes();
    const started = harness.call("image.upload.start", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        fileSize: bytes.length,
        mimeType: "image/png",
    });
    assert.equal(started.ok, true);

    const cancelled = harness.call("image.upload.cancel", {
        tokenHash: TOKEN_HASH_A,
        uploadId: started.data.uploadId,
    });
    assert.equal(cancelled.ok, true);
    assert.equal(cancelled.data.cancelled, true);
    assert.equal(harness.records("IMAGENS").length, 0);

    const restarted = harness.call("image.upload.start", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        fileSize: bytes.length,
        mimeType: "image/png",
    });
    assert.equal(restarted.ok, true);
});


test("image.remove repetido reafirma a permissão privada sem duplicar auditoria", () => {
    const harness = createHarness();
    const { uploaded } = startPngUpload(harness);
    assert.equal(uploaded.ok, true);
    const imageId = uploaded.data.image.id;
    const file = harness.driveFiles.get("synthetic-drive-file-1");

    const first = harness.call("image.remove", { tokenHash: TOKEN_HASH_A, imageId });
    assert.equal(first.ok, true);
    assert.equal(file.sharing, "PRIVATE");

    file.sharing = "ANYONE_WITH_LINK";
    const second = harness.call("image.remove", { tokenHash: TOKEN_HASH_A, imageId });
    assert.equal(second.ok, true);
    assert.equal(second.data.alreadyRemoved, true);
    assert.equal(file.sharing, "PRIVATE");
    assert.equal(harness.records("IMAGENS")[0].status, "removed");

    const audit = harness.records("AUDITORIA").filter((event) => event.acao === "image.remove");
    assert.equal(audit.length, 1);
});


test("image.upload.status recupera recibo quando a conclusão já foi gravada no Sheets", () => {
    const harness = createHarness();
    const { started, uploaded } = startPngUpload(harness);
    assert.equal(uploaded.ok, true);

    const drivePutCount = harness.driveCalls.filter((call) => String(call.options.method).toLowerCase() === "put").length;
    const status = harness.call("image.upload.status", {
        tokenHash: TOKEN_HASH_A,
        uploadId: started.data.uploadId,
    });

    assert.equal(status.ok, true);
    assert.equal(status.data.completed, true);
    assert.equal(status.data.image.id, uploaded.data.image.id);
    assert.equal(status.data.image.status, "active");
    assert.equal(
        harness.driveCalls.filter((call) => String(call.options.method).toLowerCase() === "put").length,
        drivePutCount,
        "A consulta do recibo não deve enviar blocos novamente ao Drive."
    );
    assert.equal(
        typeof harness.properties.get("CONECTA_LOCAL_IMAGE_UPLOAD_V1_" + started.data.uploadId) === "string",
        true,
        "O recibo de conclusão deve permanecer disponível durante a janela de recuperação."
    );
    assert.equal(
        harness.properties.has("CONECTA_LOCAL_IMAGE_SERVICE_UPLOAD_V1_" + SERVICE_A),
        false,
        "A conclusão deve liberar a reserva para novos envios no mesmo serviço."
    );
});


test("pausar serviço tenta restringir todas as imagens mesmo quando uma permissão falha", () => {
    const harness = createHarness();
    const first = startPngUpload(harness);
    const second = startPngUpload(harness);
    assert.equal(first.uploaded.ok, true);
    assert.equal(second.uploaded.ok, true);

    const firstFile = harness.driveFiles.get("synthetic-drive-file-1");
    const secondFile = harness.driveFiles.get("synthetic-drive-file-2");
    const originalSetSharing = firstFile.setSharing.bind(firstFile);
    firstFile.setSharing = (access, permission) => {
        if (access === "PRIVATE") throw new Error("synthetic permission failure");
        return originalSetSharing(access, permission);
    };

    const paused = harness.call("service.setStatus", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        status: "paused",
    });

    assert.equal(paused.ok, false);
    assert.equal(paused.error.code, "IMAGE_PERMISSION_SYNC_FAILED");
    assert.equal(firstFile.sharing, "ANYONE_WITH_LINK");
    assert.equal(secondFile.sharing, "PRIVATE", "A segunda imagem também deve ter a permissão atualizada.");
    assert.equal(harness.records("SERVICOS").find((service) => service.id_servico === SERVICE_A).status, "published");
});


test("image.upload.chunk trata 308 sem Range como offset não confirmado", () => {
    const harness = createHarness();
    const bytes = Buffer.alloc(1024 * 1024 + 17, 0x61);
    Buffer.from([0xff, 0xd8, 0xff]).copy(bytes);
    const started = harness.call("image.upload.start", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        fileSize: bytes.length,
        mimeType: "image/jpeg",
    });
    assert.equal(started.ok, true);
    harness.omitNextChunkRange();

    const result = harness.call("image.upload.chunk", {
        tokenHash: TOKEN_HASH_A,
        uploadId: started.data.uploadId,
        startOffset: 0,
        totalSize: bytes.length,
        chunkBase64: bytes.subarray(0, 1024 * 1024).toString("base64"),
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "DRIVE_CHUNK_OFFSET_UNKNOWN");
    assert.equal(harness.records("IMAGENS").length, 0);
});


test("foto de perfil é salva como imagem exclusiva do profissional e retorna na sessão", () => {
    const harness = createHarness();
    const { uploaded } = startPngProfilePhotoUpload(harness);

    assert.equal(uploaded.ok, true, "Upload da foto falhou: " + JSON.stringify(uploaded));
    assert.equal(uploaded.data.completed, true);
    assert.equal(uploaded.data.image.order, 1);
    assert.equal(uploaded.data.image.mimeType, "image/png");
    assert.equal(uploaded.data.image.sizeBytes, 24);
    assert.match(uploaded.data.image.url, /^\/api\/public-images\?id=/);

    const rows = harness.records("IMAGENS");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id_profissional, PROFILE_A);
    assert.equal(rows[0].id_servico, "");
    assert.equal(rows[0].ordem_exibicao, 1);
    assert.equal(rows[0].status, "active");
    assert.equal(harness.driveFiles.get("synthetic-drive-file-1").sharing, "PRIVATE");

    const me = harness.call("session.me", { tokenHash: TOKEN_HASH_A });
    assert.equal(me.ok, true);
    assert.equal(me.data.user.photoId, rows[0].id_imagem);
    assert.equal(me.data.user.photoUrl, "/api/public-images?id=" + rows[0].id_imagem);

    const audit = harness.records("AUDITORIA").find((event) => event.acao === "profile.photo.upload");
    assert.ok(audit);
    assert.equal(audit.id_usuario_ator, USER_A);
    assert.equal(audit.id_registro_afetado, rows[0].id_imagem);
    assert.equal(audit.resultado, "success");
});

test("substituição da foto de perfil restringe o arquivo anterior e mantém uma única foto ativa", () => {
    const harness = createHarness();
    const first = startPngProfilePhotoUpload(harness);
    assert.equal(first.uploaded.ok, true);
    const firstImageId = first.uploaded.data.image.id;
    const firstFile = harness.driveFiles.get("synthetic-drive-file-1");

    const second = startPngProfilePhotoUpload(harness);
    assert.equal(second.uploaded.ok, true);
    const secondImageId = second.uploaded.data.image.id;

    const rows = harness.records("IMAGENS");
    assert.equal(rows.length, 2);
    assert.equal(rows.find((row) => row.id_imagem === firstImageId).status, "removed");
    assert.equal(rows.find((row) => row.id_imagem === secondImageId).status, "active");
    assert.equal(rows.filter((row) => row.id_profissional === PROFILE_A && row.id_servico === "" && row.status === "active").length, 1);
    assert.equal(firstFile.sharing, "PRIVATE");
    assert.equal(harness.driveFiles.get("synthetic-drive-file-2").sharing, "PRIVATE");

    const me = harness.call("session.me", { tokenHash: TOKEN_HASH_A });
    assert.equal(me.data.user.photoId, secondImageId);
    assert.equal(me.data.user.photoUrl, "/api/public-images?id=" + secondImageId);

    const audit = harness.records("AUDITORIA").filter((event) =>
        event.acao === "profile.photo.upload" || event.acao === "profile.photo.replace",
    );
    assert.deepEqual(audit.map((event) => event.acao), ["profile.photo.upload", "profile.photo.replace"]);
});

test("upload de foto de perfil não pode ser concluído com a sessão de outro profissional", () => {
    const harness = createHarness();
    const bytes = createPngBytes();
    const started = harness.call("profile.photo.upload.start", {
        tokenHash: TOKEN_HASH_A,
        fileSize: bytes.length,
        mimeType: "image/png",
    });
    assert.equal(started.ok, true);

    const foreignChunk = harness.call("image.upload.chunk", {
        tokenHash: TOKEN_HASH_B,
        uploadId: started.data.uploadId,
        startOffset: 0,
        totalSize: bytes.length,
        chunkBase64: bytes.toString("base64"),
    });

    assert.equal(foreignChunk.ok, false);
    assert.equal(foreignChunk.error.code, "IMAGE_UPLOAD_NOT_FOUND");
    assert.equal(harness.records("IMAGENS").length, 0);

    const cancelled = harness.call("profile.photo.upload.cancel", {
        tokenHash: TOKEN_HASH_A,
        uploadId: started.data.uploadId,
    });
    assert.equal(cancelled.ok, true);
    assert.equal(cancelled.data.cancelled, true);
});

test("profile.photo.upload.cancel libera a reserva do profissional sem gravar metadados", () => {
    const harness = createHarness();
    const bytes = createPngBytes();
    const started = harness.call("profile.photo.upload.start", {
        tokenHash: TOKEN_HASH_A,
        fileSize: bytes.length,
        mimeType: "image/png",
    });
    assert.equal(started.ok, true);

    const reservationKey = "CONECTA_LOCAL_IMAGE_PROFILE_UPLOAD_V1_" + PROFILE_A;
    assert.equal(harness.properties.has(reservationKey), true);

    const cancelled = harness.call("profile.photo.upload.cancel", {
        tokenHash: TOKEN_HASH_A,
        uploadId: started.data.uploadId,
    });
    assert.equal(cancelled.ok, true);
    assert.equal(cancelled.data.cancelled, true);
    assert.equal(harness.properties.has(reservationKey), false);
    assert.equal(harness.records("IMAGENS").length, 0);
});

test("profile.photo.upload.status recupera recibo sem reenviar blocos ao Drive", () => {
    const harness = createHarness();
    const { started, uploaded } = startPngProfilePhotoUpload(harness);
    assert.equal(uploaded.ok, true);
    const drivePutCount = harness.driveCalls.filter((call) => String(call.options.method).toLowerCase() === "put").length;

    const status = harness.call("profile.photo.upload.status", {
        tokenHash: TOKEN_HASH_A,
        uploadId: started.data.uploadId,
    });

    assert.equal(status.ok, true);
    assert.equal(status.data.completed, true);
    assert.equal(status.data.image.id, uploaded.data.image.id);
    assert.equal(status.data.image.url, "/api/public-images?id=" + uploaded.data.image.id);
    assert.equal(
        harness.driveCalls.filter((call) => String(call.options.method).toLowerCase() === "put").length,
        drivePutCount,
    );
});

test("profile.photo.remove restringe o arquivo e atualiza a sessão sem a foto", () => {
    const harness = createHarness();
    const { uploaded } = startPngProfilePhotoUpload(harness);
    assert.equal(uploaded.ok, true);
    const imageId = uploaded.data.image.id;
    const file = harness.driveFiles.get("synthetic-drive-file-1");

    const removed = harness.call("profile.photo.remove", {
        tokenHash: TOKEN_HASH_A,
        imageId,
        id_profissional: PROFILE_B,
    });

    assert.equal(removed.ok, true);
    assert.equal(removed.data.removed, true);
    assert.equal(file.sharing, "PRIVATE");
    assert.equal(harness.records("IMAGENS")[0].status, "removed");

    const me = harness.call("session.me", { tokenHash: TOKEN_HASH_A });
    assert.equal(me.ok, true);
    assert.equal(me.data.user.photoId, "");
    assert.equal(me.data.user.photoUrl, "");

    const audit = harness.records("AUDITORIA").find((event) => event.acao === "profile.photo.remove");
    assert.ok(audit);
    assert.equal(audit.id_usuario_ator, USER_A);
    assert.equal(audit.id_registro_afetado, imageId);
});

test("public.image.resolve permite foto ativa somente do profissional com conta ativa", () => {
    const harness = createHarness();
    const { uploaded } = startPngProfilePhotoUpload(harness);
    assert.equal(uploaded.ok, true);
    const imageId = uploaded.data.image.id;

    const resolved = harness.call("public.image.resolve", { imageId });
    assert.equal(resolved.ok, true);
    assert.equal(resolved.data.fileId, "synthetic-drive-file-1");
    assert.equal(resolved.data.mimeType, "image/png");
    assert.equal(harness.driveFiles.get("synthetic-drive-file-1").sharing, "PRIVATE");

    const removed = harness.call("profile.photo.remove", { tokenHash: TOKEN_HASH_A, imageId });
    assert.equal(removed.ok, true);
    const hidden = harness.call("public.image.resolve", { imageId });
    assert.equal(hidden.ok, false);
    assert.equal(hidden.error.code, "IMAGE_NOT_FOUND");
});


test("substituição de imagem preserva ID e ordem mesmo quando o serviço já possui cinco imagens", () => {
    const harness = createHarness();
    const originals = [];

    for (let index = 0; index < 5; index += 1) {
        const result = startPngUpload(harness);
        assert.equal(result.uploaded.ok, true);
        originals.push(result.uploaded.data.image);
    }

    const target = originals[0];
    const oldRecord = harness.records("IMAGENS").find((item) => item.id_imagem === target.id);
    const oldFile = harness.driveFiles.get(oldRecord.id_arquivo_drive);
    const bytes = createPngBytes();

    const started = harness.call("image.upload.start", {
        tokenHash: TOKEN_HASH_A,
        serviceId: SERVICE_A,
        replaceImageId: target.id,
        fileSize: bytes.length,
        mimeType: "image/png",
    });
    assert.equal(started.ok, true, "A substituição deve ocupar a posição existente sem consumir um sexto slot.");

    const uploaded = harness.call("image.upload.chunk", {
        tokenHash: TOKEN_HASH_A,
        uploadId: started.data.uploadId,
        startOffset: 0,
        totalSize: bytes.length,
        chunkBase64: bytes.toString("base64"),
    });
    assert.equal(uploaded.ok, true);
    assert.equal(uploaded.data.completed, true);
    assert.equal(uploaded.data.image.id, target.id);
    assert.equal(uploaded.data.image.order, target.order);

    const records = harness.records("IMAGENS").filter((item) => item.status === "active");
    assert.equal(records.length, 5);
    const replaced = records.find((item) => item.id_imagem === target.id);
    assert.equal(replaced.ordem_exibicao, String(target.order));
    assert.notEqual(replaced.id_arquivo_drive, oldRecord.id_arquivo_drive);
    assert.equal(oldFile.sharing, "PRIVATE");
    assert.equal(harness.driveFiles.get(replaced.id_arquivo_drive).sharing, "ANYONE_WITH_LINK");
    assert.equal(
        harness.records("AUDITORIA").filter((event) => event.acao === "image.replace").length,
        1,
    );
});

test("profissional não consegue substituir imagem de outro serviço", () => {
    const harness = createHarness();
    const { uploaded } = startPngUpload(harness);
    assert.equal(uploaded.ok, true);

    const bytes = createPngBytes();
    const result = harness.call("image.upload.start", {
        tokenHash: TOKEN_HASH_B,
        serviceId: SERVICE_B,
        replaceImageId: uploaded.data.image.id,
        fileSize: bytes.length,
        mimeType: "image/png",
    });

    assert.equal(result.ok, false);
    assert.equal(result.error.code, "IMAGE_REPLACE_CONFLICT");
    assert.equal(harness.records("IMAGENS").length, 1);
});

test("image.resolve.mine libera imagem privada somente ao profissional proprietário", () => {
    const harness = createHarness();
    const { uploaded } = startPngUpload(harness);
    assert.equal(uploaded.ok, true);
    const imageId = uploaded.data.image.id;

    const resolved = harness.call("image.resolve.mine", {
        tokenHash: TOKEN_HASH_A,
        imageId,
    });
    assert.equal(resolved.ok, true);
    assert.equal(resolved.data.fileId, "synthetic-drive-file-1");
    assert.equal(resolved.data.mimeType, "image/png");
    assert.equal(resolved.data.sizeBytes, 24);
    assert.equal(resolved.data.accessToken, "synthetic-drive-oauth-token-for-test-validation");

    const denied = harness.call("image.resolve.mine", {
        tokenHash: TOKEN_HASH_B,
        imageId,
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.error.code, "IMAGE_NOT_FOUND");
});
