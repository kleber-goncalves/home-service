/**
 * Conecta Local — POC-04: sessão sintética por cookie HttpOnly no gateway.
 *
 * Projeto Apps Script separado, sem vínculo com a planilha de negócio.
 * Somente a conta sintética POC04_SYNTHETIC_USER_ID pode receber sessões.
 * Não habilita cadastro, login, senha, e-mail ou operações de negócio.
 */

var POC04_ALLOWED_ACTIONS = [
    "poc.session.issue",
    "poc.session.csrf",
    "poc.session.validate",
    "poc.session.revoke"
];

var POC04_SECRET_PROPERTY = "POC04_HMAC_SECRET";
var POC04_SPREADSHEET_PROPERTY = "POC04_TEST_SPREADSHEET_ID";
var POC04_NONCE_PREFIX = "POC04_GATEWAY_NONCE_V1_";
var POC04_CANONICAL_DOMAIN = "CONECTA_LOCAL_POC04_SESSION";
var POC04_SIGNATURE_VERSION = "v1";
var POC04_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
var POC04_NONCE_RETENTION_MS = 10 * 60 * 1000 + 30 * 1000;
var POC04_MAX_ACTIVE_NONCES = 2500;
var POC04_LOCK_TIMEOUT_MS = 8000;
var POC04_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
var POC04_ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
var POC04_MAX_PAYLOAD_BYTES = 4 * 1024;
var POC04_SYNTHETIC_USER_ID = "poc04-user-synthetic-001";

var POC04_ACCOUNT_HEADERS = ["id_usuario", "status"];
var POC04_SESSION_HEADERS = [
    "id_sessao",
    "id_usuario",
    "token_hash",
    "criado_em",
    "ultima_atividade_em",
    "expira_em",
    "revogada_em"
];
var POC04_CSRF_HEADERS = ["id_sessao", "csrf_hash"];

function doGet() {
    return poc04JsonOutput_(poc04ErrorEnvelope_(
        null,
        null,
        "POC04_METHOD_NOT_ALLOWED",
        "A prova aceita somente POST autenticado."
    ));
}

function doPost(event) {
    var parameters = event && event.parameter ? event.parameter : {};
    var action = String(parameters.action || "");
    var requestId = String(parameters.requestId || "");
    var payloadText = String(parameters.payload || "");
    var signatureVersion = String(parameters.signatureVersion || "");
    var timestampText = String(parameters.timestamp || "");
    var nonce = String(parameters.nonce || "");
    var signature = String(parameters.signature || "");

    if (
        signatureVersion !== POC04_SIGNATURE_VERSION
        || !/^[A-Za-z0-9_-]{8,80}$/.test(requestId)
        || !/^[a-z][a-z0-9_.-]{1,80}$/.test(action)
        || !/^\d{13}$/.test(timestampText)
        || !/^[a-f0-9]{64}$/.test(nonce)
        || !/^[a-f0-9]{64}$/.test(signature)
    ) {
        return poc04JsonOutput_(poc04ErrorEnvelope_(
            action,
            requestId,
            "POC04_AUTHENTICATION_FAILED",
            "A autenticação interna não foi validada."
        ));
    }

    var nowMs = Date.now();
    var timestamp = Number(timestampText);
    if (
        !Number.isSafeInteger(timestamp)
        || Math.abs(nowMs - timestamp) > POC04_MAX_CLOCK_SKEW_MS
    ) {
        return poc04JsonOutput_(poc04ErrorEnvelope_(
            action,
            requestId,
            "POC04_REQUEST_EXPIRED",
            "A validade temporal da chamada expirou."
        ));
    }

    if (POC04_ALLOWED_ACTIONS.indexOf(action) === -1) {
        return poc04JsonOutput_(poc04ErrorEnvelope_(
            action,
            requestId,
            "POC04_ACTION_NOT_ALLOWED",
            "A ação não está liberada nesta prova."
        ));
    }

    var secret;
    try {
        secret = PropertiesService.getScriptProperties().getProperty(POC04_SECRET_PROPERTY);
    } catch (error) {
        return poc04JsonOutput_(poc04ErrorEnvelope_(
            action,
            requestId,
            "POC04_AUTHENTICATION_FAILED",
            "A configuração interna não está disponível."
        ));
    }

    if (typeof secret !== "string" || !/^[a-f0-9]{64}$/.test(secret)) {
        return poc04JsonOutput_(poc04ErrorEnvelope_(
            action,
            requestId,
            "POC04_AUTHENTICATION_FAILED",
            "A configuração interna não está disponível."
        ));
    }

    var payloadBytes = Utilities.newBlob(payloadText).getBytes().length;
    if (payloadBytes > POC04_MAX_PAYLOAD_BYTES) {
        return poc04JsonOutput_(poc04ErrorEnvelope_(
            action,
            requestId,
            "POC04_INVALID_PAYLOAD",
            "O payload excede o limite permitido."
        ));
    }

    var payloadSha256 = poc04BytesToHex_(Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        payloadText,
        Utilities.Charset.UTF_8
    ));

    var canonicalMessage = [
        POC04_CANONICAL_DOMAIN,
        POC04_SIGNATURE_VERSION,
        "POST",
        timestampText,
        nonce,
        action,
        requestId,
        payloadSha256
    ].join("\n");

    var expectedSignature = poc04BytesToHex_(Utilities.computeHmacSha256Signature(
        canonicalMessage,
        secret,
        Utilities.Charset.UTF_8
    ));

    if (!poc04ConstantTimeHexEquals_(expectedSignature, signature)) {
        return poc04JsonOutput_(poc04ErrorEnvelope_(
            action,
            requestId,
            "POC04_AUTHENTICATION_FAILED",
            "A autenticação interna não foi validada."
        ));
    }

    var nonceResult = poc04ReserveNonce_(nonce, nowMs);
    if (nonceResult !== "reserved") {
        var code = nonceResult === "replay"
            ? "POC04_REPLAY_DETECTED"
            : "POC04_NONCE_STORE_UNAVAILABLE";

        return poc04JsonOutput_(poc04ErrorEnvelope_(
            action,
            requestId,
            code,
            "A chamada não passou pelo controle de uso único."
        ));
    }

    var payload;
    try {
        payload = JSON.parse(payloadText);
    } catch (error) {
        return poc04JsonOutput_(poc04ErrorEnvelope_(
            action,
            requestId,
            "POC04_INVALID_PAYLOAD",
            "O payload não contém JSON válido."
        ));
    }

    if (!poc04IsPlainObject_(payload)) {
        return poc04JsonOutput_(poc04ErrorEnvelope_(
            action,
            requestId,
            "POC04_INVALID_PAYLOAD",
            "O payload deve ser um objeto JSON."
        ));
    }

    var result;
    if (action === "poc.session.issue") {
        result = poc04IssueSession_(payload, nowMs);
    } else if (action === "poc.session.csrf") {
        result = poc04RotateCsrf_(payload, nowMs);
    } else if (action === "poc.session.validate") {
        result = poc04ValidateSession_(payload, nowMs);
    } else {
        result = poc04RevokeSession_(payload, nowMs);
    }

    if (!result.ok) {
        return poc04JsonOutput_(poc04ErrorEnvelope_(
            action,
            requestId,
            result.code,
            result.message
        ));
    }

    return poc04JsonOutput_({
        ok: true,
        action: action,
        requestId: requestId,
        data: result.data
    });
}

/**
 * Cria um arquivo Sheets descartável com uma conta sintética fixa.
 * Execute manualmente no projeto Apps Script exclusivo da POC-04.
 */
function poc04InitializeTemporaryStore() {
    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty(POC04_SECRET_PROPERTY);

    if (typeof secret !== "string" || !/^[a-f0-9]{64}$/.test(secret)) {
        throw new Error("Configure POC04_HMAC_SECRET com 64 caracteres hexadecimais antes da inicialização.");
    }

    if (properties.getProperty(POC04_SPREADSHEET_PROPERTY)) {
        throw new Error("Já existe um armazenamento registrado. Execute a limpeza exata antes de inicializar outro.");
    }

    var spreadsheet = SpreadsheetApp.create(
        "POC-04 TEMPORARIA - SESSOES - " + Utilities.getUuid()
    );

    var accountSheet = spreadsheet.getSheets()[0];
    accountSheet.setName("POC04_CONTAS");
    accountSheet.getRange(1, 1, 1, POC04_ACCOUNT_HEADERS.length)
        .setValues([POC04_ACCOUNT_HEADERS]);
    accountSheet.appendRow([POC04_SYNTHETIC_USER_ID, "active"]);

    var sessionSheet = spreadsheet.insertSheet("SESSOES");
    sessionSheet.getRange(1, 1, 1, POC04_SESSION_HEADERS.length)
        .setValues([POC04_SESSION_HEADERS]);

    var csrfSheet = spreadsheet.insertSheet("POC04_CSRF");
    csrfSheet.getRange(1, 1, 1, POC04_CSRF_HEADERS.length)
        .setValues([POC04_CSRF_HEADERS]);

    SpreadsheetApp.flush();
    properties.setProperty(POC04_SPREADSHEET_PROPERTY, spreadsheet.getId());

    return {
        status: "READY",
        syntheticAccountId: POC04_SYNTHETIC_USER_ID,
        spreadsheetUrl: spreadsheet.getUrl(),
        tabs: ["POC04_CONTAS", "SESSOES", "POC04_CSRF"],
        businessSpreadsheetUsed: false
    };
}

/**
 * Move para a lixeira somente o arquivo registrado pela POC-04 e remove
 * somente nonces com prefixo próprio. Mantém o segredo para eventual repetição.
 */
function poc04CleanupTemporaryStore() {
    var properties = PropertiesService.getScriptProperties();
    var spreadsheetId = properties.getProperty(POC04_SPREADSHEET_PROPERTY);
    var trashed = false;

    if (spreadsheetId) {
        DriveApp.getFileById(spreadsheetId).setTrashed(true);
        properties.deleteProperty(POC04_SPREADSHEET_PROPERTY);
        trashed = true;
    }

    var allProperties = properties.getProperties();
    var removedNonceProperties = 0;

    Object.keys(allProperties).forEach(function (key) {
        if (key.indexOf(POC04_NONCE_PREFIX) === 0) {
            properties.deleteProperty(key);
            removedNonceProperties += 1;
        }
    });

    return {
        status: "PASS",
        trashedRegisteredSpreadsheet: trashed,
        removedNonceProperties: removedNonceProperties,
        businessSpreadsheetUsed: false,
        scope: "EXACT_POC04_SPREADSHEET_ID_AND_POC04_GATEWAY_NONCE_PREFIX_ONLY"
    };
}

function poc04IssueSession_(payload, nowMs) {
    if (!poc04HasExactKeys_(payload, ["sessionToken", "csrfToken"])) {
        return poc04Failure_("POC04_INVALID_PAYLOAD", "O conteúdo da emissão é inválido.");
    }

    if (!poc04IsToken_(payload.sessionToken) || !poc04IsToken_(payload.csrfToken)) {
        return poc04Failure_("POC04_INVALID_PAYLOAD", "O material sintético da sessão é inválido.");
    }

    var lockResult = poc04WithLock_(function () {
        var store = poc04GetStore_();
        if (!store.ok) {
            return store;
        }

        if (!poc04IsSyntheticAccountActive_(store.accountSheet)) {
            return poc04Failure_("POC04_ACCOUNT_UNAVAILABLE", "A conta sintética não está ativa.");
        }

        var tokenHash = poc04Sha256Hex_(payload.sessionToken);
        if (poc04FindSessionByHash_(store.sessionSheet, tokenHash)) {
            return poc04Failure_("POC04_SESSION_INVALID", "A sessão sintética não está disponível.");
        }

        var sessionId = Utilities.getUuid();
        var createdAt = new Date(nowMs).toISOString();
        var expiresAt = new Date(nowMs + POC04_ABSOLUTE_TIMEOUT_MS).toISOString();
        var csrfHash = poc04Sha256Hex_(payload.csrfToken);
        var csrfRow = store.csrfSheet.getLastRow() + 1;

        try {
            store.csrfSheet.appendRow([sessionId, csrfHash]);
            store.sessionSheet.appendRow([
                sessionId,
                POC04_SYNTHETIC_USER_ID,
                tokenHash,
                createdAt,
                createdAt,
                expiresAt,
                ""
            ]);
            SpreadsheetApp.flush();
        } catch (error) {
            try {
                if (store.csrfSheet.getLastRow() >= csrfRow) {
                    store.csrfSheet.deleteRow(csrfRow);
                }
            } catch (cleanupError) {
                // Registro órfão não valida sessão sem linha correspondente em SESSOES.
            }
            return poc04Failure_("POC04_STORE_UNAVAILABLE", "Não foi possível registrar a sessão sintética.");
        }

        return {
            ok: true,
            data: {
                created: true,
                expiresAt: expiresAt
            }
        };
    });

    return lockResult;
}

function poc04RotateCsrf_(payload, nowMs) {
    if (!poc04HasExactKeys_(payload, ["sessionToken", "csrfToken"])) {
        return poc04Failure_("POC04_INVALID_PAYLOAD", "O conteúdo CSRF é inválido.");
    }

    if (!poc04IsToken_(payload.sessionToken) || !poc04IsToken_(payload.csrfToken)) {
        return poc04Failure_("POC04_INVALID_PAYLOAD", "O material CSRF é inválido.");
    }

    return poc04WithLock_(function () {
        var store = poc04GetStore_();
        if (!store.ok) {
            return store;
        }

        var session = poc04FindSessionByHash_(
            store.sessionSheet,
            poc04Sha256Hex_(payload.sessionToken)
        );
        var state = poc04CheckSessionState_(store, session, nowMs, true);

        if (!state.ok) {
            return state;
        }

        var csrfRow = poc04FindCsrfRow_(store.csrfSheet, session.values[0]);
        if (!csrfRow) {
            return poc04Failure_("POC04_STORE_UNAVAILABLE", "O registro CSRF não está disponível.");
        }

        try {
            store.csrfSheet.getRange(csrfRow.row, 2).setValue(
                poc04Sha256Hex_(payload.csrfToken)
            );
            SpreadsheetApp.flush();
        } catch (error) {
            return poc04Failure_("POC04_STORE_UNAVAILABLE", "Não foi possível renovar o token CSRF.");
        }

        return {
            ok: true,
            data: {
                csrfReady: true,
                expiresAt: session.values[5]
            }
        };
    });
}

function poc04ValidateSession_(payload, nowMs) {
    if (!poc04HasExactKeys_(payload, ["sessionToken", "csrfToken"])) {
        return poc04Failure_("POC04_INVALID_PAYLOAD", "O conteúdo da validação é inválido.");
    }

    if (!poc04IsToken_(payload.sessionToken) || !poc04IsToken_(payload.csrfToken)) {
        return poc04Failure_("POC04_INVALID_PAYLOAD", "O material da sessão é inválido.");
    }

    return poc04WithLock_(function () {
        var store = poc04GetStore_();
        if (!store.ok) {
            return store;
        }

        var session = poc04FindSessionByHash_(
            store.sessionSheet,
            poc04Sha256Hex_(payload.sessionToken)
        );

        if (!session) {
            return poc04Failure_("POC04_SESSION_INVALID", "A sessão sintética não é válida.");
        }

        if (!poc04CsrfMatches_(store.csrfSheet, session.values[0], payload.csrfToken)) {
            return poc04Failure_("POC04_CSRF_INVALID", "A validação CSRF falhou.");
        }

        var state = poc04CheckSessionState_(store, session, nowMs, true);
        if (!state.ok) {
            return state;
        }

        var updatedAt = new Date(nowMs).toISOString();
        try {
            store.sessionSheet.getRange(session.row, 5).setValue(updatedAt);
            SpreadsheetApp.flush();
        } catch (error) {
            return poc04Failure_("POC04_STORE_UNAVAILABLE", "Não foi possível atualizar a atividade da sessão.");
        }

        return {
            ok: true,
            data: {
                valid: true,
                expiresAt: session.values[5]
            }
        };
    });
}

function poc04RevokeSession_(payload, nowMs) {
    if (!poc04HasExactKeys_(payload, ["sessionToken", "csrfToken"])) {
        return poc04Failure_("POC04_INVALID_PAYLOAD", "O conteúdo do logout é inválido.");
    }

    if (!poc04IsToken_(payload.sessionToken) || !poc04IsToken_(payload.csrfToken)) {
        return poc04Failure_("POC04_INVALID_PAYLOAD", "O material da sessão é inválido.");
    }

    return poc04WithLock_(function () {
        var store = poc04GetStore_();
        if (!store.ok) {
            return store;
        }

        var session = poc04FindSessionByHash_(
            store.sessionSheet,
            poc04Sha256Hex_(payload.sessionToken)
        );

        if (!session) {
            return poc04Failure_("POC04_SESSION_INVALID", "A sessão sintética não foi encontrada.");
        }

        if (!poc04CsrfMatches_(store.csrfSheet, session.values[0], payload.csrfToken)) {
            return poc04Failure_("POC04_CSRF_INVALID", "A validação CSRF falhou.");
        }

        if (session.values[1] !== POC04_SYNTHETIC_USER_ID) {
            return poc04Failure_("POC04_SESSION_INVALID", "A sessão sintética não é válida.");
        }

        if (session.values[6] === "") {
            try {
                store.sessionSheet.getRange(session.row, 7).setValue(
                    new Date(nowMs).toISOString()
                );
                SpreadsheetApp.flush();
            } catch (error) {
                return poc04Failure_("POC04_STORE_UNAVAILABLE", "Não foi possível confirmar a revogação.");
            }
        }

        return {
            ok: true,
            data: { revoked: true }
        };
    });
}

function poc04CheckSessionState_(store, session, nowMs, requireActiveAccount) {
    if (!session || session.values[6] !== "") {
        return poc04Failure_("POC04_SESSION_INVALID", "A sessão sintética não é válida.");
    }

    if (
        session.values[1] !== POC04_SYNTHETIC_USER_ID
        || !poc04IsIsoDate_(session.values[3])
        || !poc04IsIsoDate_(session.values[4])
        || !poc04IsIsoDate_(session.values[5])
    ) {
        return poc04Failure_("POC04_STORE_UNAVAILABLE", "O registro da sessão está inconsistente.");
    }

    var createdAt = Date.parse(session.values[3]);
    var lastActivityAt = Date.parse(session.values[4]);
    var absoluteExpiry = Date.parse(session.values[5]);

    if (
        !Number.isFinite(createdAt)
        || !Number.isFinite(lastActivityAt)
        || !Number.isFinite(absoluteExpiry)
        || absoluteExpiry !== createdAt + POC04_ABSOLUTE_TIMEOUT_MS
        || lastActivityAt < createdAt
        || lastActivityAt > nowMs
    ) {
        return poc04Failure_("POC04_STORE_UNAVAILABLE", "O registro da sessão está inconsistente.");
    }

    if (
        nowMs >= absoluteExpiry
        || nowMs >= lastActivityAt + POC04_IDLE_TIMEOUT_MS
    ) {
        return poc04Failure_("POC04_SESSION_EXPIRED", "A sessão sintética expirou.");
    }

    if (requireActiveAccount && !poc04IsSyntheticAccountActive_(store.accountSheet)) {
        return poc04Failure_("POC04_ACCOUNT_UNAVAILABLE", "A conta sintética não está ativa.");
    }

    return { ok: true };
}

function poc04GetStore_() {
    var spreadsheetId;
    try {
        spreadsheetId = PropertiesService.getScriptProperties()
            .getProperty(POC04_SPREADSHEET_PROPERTY);
    } catch (error) {
        return poc04Failure_("POC04_STORE_UNAVAILABLE", "Não foi possível consultar a configuração do armazenamento.");
    }

    if (typeof spreadsheetId !== "string" || spreadsheetId.length === 0) {
        return poc04Failure_("POC04_STORE_NOT_INITIALIZED", "O armazenamento temporário não foi inicializado.");
    }

    try {
        var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        var accountSheet = spreadsheet.getSheetByName("POC04_CONTAS");
        var sessionSheet = spreadsheet.getSheetByName("SESSOES");
        var csrfSheet = spreadsheet.getSheetByName("POC04_CSRF");

        if (
            !accountSheet
            || !sessionSheet
            || !csrfSheet
            || !poc04HeadersMatch_(accountSheet, POC04_ACCOUNT_HEADERS)
            || !poc04HeadersMatch_(sessionSheet, POC04_SESSION_HEADERS)
            || !poc04HeadersMatch_(csrfSheet, POC04_CSRF_HEADERS)
        ) {
            return poc04Failure_("POC04_STORE_UNAVAILABLE", "A estrutura do armazenamento temporário é inválida.");
        }

        return {
            ok: true,
            accountSheet: accountSheet,
            sessionSheet: sessionSheet,
            csrfSheet: csrfSheet
        };
    } catch (error) {
        return poc04Failure_("POC04_STORE_UNAVAILABLE", "O armazenamento temporário está indisponível.");
    }
}

function poc04HeadersMatch_(sheet, expected) {
    var actual = sheet.getRange(1, 1, 1, expected.length).getValues()[0];
    return expected.every(function (header, index) {
        return actual[index] === header;
    });
}

function poc04IsSyntheticAccountActive_(sheet) {
    var values = sheet.getDataRange().getValues();

    for (var index = 1; index < values.length; index += 1) {
        if (
            values[index][0] === POC04_SYNTHETIC_USER_ID
            && values[index][1] === "active"
        ) {
            return true;
        }
    }

    return false;
}

function poc04FindSessionByHash_(sheet, tokenHash) {
    var values = sheet.getDataRange().getValues();

    for (var index = 1; index < values.length; index += 1) {
        if (values[index][2] === tokenHash) {
            return {
                row: index + 1,
                values: values[index]
            };
        }
    }

    return null;
}

function poc04FindCsrfRow_(sheet, sessionId) {
    var values = sheet.getDataRange().getValues();

    for (var index = 1; index < values.length; index += 1) {
        if (values[index][0] === sessionId) {
            return {
                row: index + 1,
                hash: values[index][1]
            };
        }
    }

    return null;
}

function poc04CsrfMatches_(sheet, sessionId, csrfToken) {
    var csrfRecord = poc04FindCsrfRow_(sheet, sessionId);
    if (!csrfRecord || typeof csrfRecord.hash !== "string") {
        return false;
    }

    return poc04ConstantTimeHexEquals_(
        csrfRecord.hash,
        poc04Sha256Hex_(csrfToken)
    );
}

function poc04WithLock_(callback) {
    var lock;
    var acquired = false;

    try {
        lock = LockService.getScriptLock();
        acquired = lock.tryLock(POC04_LOCK_TIMEOUT_MS);
        if (!acquired) {
            return poc04Failure_("POC04_STORE_UNAVAILABLE", "O armazenamento está ocupado ou indisponível.");
        }

        return callback();
    } catch (error) {
        return poc04Failure_("POC04_STORE_UNAVAILABLE", "Não foi possível concluir a operação no armazenamento.");
    } finally {
        if (acquired) {
            lock.releaseLock();
        }
    }
}

function poc04ReserveNonce_(nonce, nowMs) {
    var result = poc04WithLock_(function () {
        var properties = PropertiesService.getScriptProperties();
        var allProperties = properties.getProperties();
        var nonceKey = POC04_NONCE_PREFIX + nonce;
        var existing = allProperties[nonceKey];

        if (typeof existing !== "undefined") {
            var existingExpiry = Number(existing);
            if (!Number.isFinite(existingExpiry) || existingExpiry > nowMs) {
                return { ok: false, code: "POC04_REPLAY_DETECTED" };
            }
            properties.deleteProperty(nonceKey);
        }

        var activeCount = 0;
        Object.keys(allProperties).forEach(function (key) {
            if (key.indexOf(POC04_NONCE_PREFIX) !== 0) {
                return;
            }

            var expiry = Number(allProperties[key]);
            if (Number.isFinite(expiry) && expiry <= nowMs) {
                properties.deleteProperty(key);
                return;
            }

            activeCount += 1;
        });

        if (activeCount >= POC04_MAX_ACTIVE_NONCES) {
            return { ok: false, code: "POC04_NONCE_STORE_UNAVAILABLE" };
        }

        properties.setProperty(
            nonceKey,
            String(nowMs + POC04_NONCE_RETENTION_MS)
        );

        return { ok: true };
    });

    if (result.ok) {
        return "reserved";
    }

    return result.code === "POC04_REPLAY_DETECTED" ? "replay" : "unavailable";
}

function poc04Sha256Hex_(value) {
    return poc04BytesToHex_(Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        value,
        Utilities.Charset.UTF_8
    ));
}

function poc04BytesToHex_(bytes) {
    return bytes.map(function (byte) {
        return ("0" + ((byte + 256) % 256).toString(16)).slice(-2);
    }).join("");
}

function poc04ConstantTimeHexEquals_(expected, received) {
    if (
        typeof expected !== "string"
        || typeof received !== "string"
        || !/^[a-f0-9]{64}$/.test(expected)
        || !/^[a-f0-9]{64}$/.test(received)
    ) {
        return false;
    }

    var difference = 0;
    for (var index = 0; index < 64; index += 1) {
        difference |= expected.charCodeAt(index) ^ received.charCodeAt(index);
    }

    return difference === 0;
}

function poc04IsToken_(value) {
    return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

function poc04IsIsoDate_(value) {
    return typeof value === "string"
        && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
        && Number.isFinite(Date.parse(value));
}

function poc04HasExactKeys_(value, expectedKeys) {
    if (!poc04IsPlainObject_(value)) {
        return false;
    }

    var actual = Object.keys(value).sort();
    var expected = expectedKeys.slice().sort();

    return actual.length === expected.length && actual.every(function (key, index) {
        return key === expected[index];
    });
}

function poc04IsPlainObject_(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function poc04Failure_(code, message) {
    return {
        ok: false,
        code: code,
        message: message
    };
}

function poc04ErrorEnvelope_(action, requestId, code, message) {
    return {
        ok: false,
        action: action || null,
        requestId: requestId || null,
        data: null,
        error: {
            code: code,
            message: message
        }
    };
}

function poc04JsonOutput_(value) {
    return ContentService
        .createTextOutput(JSON.stringify(value))
        .setMimeType(ContentService.MimeType.JSON);
}
