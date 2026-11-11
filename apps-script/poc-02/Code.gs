/**
 * Conecta Local — POC-02
 *
 * Versão protegida do Web App isolado da POC-01.
 * - HMAC-SHA-256 entre Vercel Function e Apps Script.
 * - Timestamp com janela limitada.
 * - Nonce de uso único registrado em Script Properties sob ScriptLock.
 *
 * Somente dados sintéticos e ações poc.* são permitidos.
 * Não utilizar em produção.
 */

var POC02_ALLOWED_ACTIONS = [
    "poc.echo",
    "poc.simulate_error",
    "poc.invalid_response"
];

var POC02_SECRET_PROPERTY = "POC02_HMAC_SECRET";
var POC02_NONCE_PREFIX = "POC02_NONCE_V1_";
var POC02_MAX_PAYLOAD_BYTES = 8 * 1024;
var POC02_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
var POC02_NONCE_RETENTION_MS = 10 * 60 * 1000 + 30 * 1000;
var POC02_MAX_ACTIVE_NONCES = 2500;
var POC02_LOCK_TIMEOUT_MS = 5000;

/**
 * GET não expõe metadados do serviço. ContentService devolve envelope lógico;
 * o Apps Script não define status HTTP arbitrário nesta resposta.
 */
function doGet() {
    return jsonOutput_(errorEnvelope_(
        null,
        null,
        "METHOD_NOT_ALLOWED",
        "Esta prova de conceito aceita somente POST autenticado."
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
        signatureVersion !== "v1"
        || !/^[A-Za-z0-9_-]{8,80}$/.test(requestId)
        || !/^[a-z][a-z0-9_.-]{1,80}$/.test(action)
        || !/^\d{13}$/.test(timestampText)
        || !/^[a-f0-9]{64}$/.test(nonce)
        || !/^[a-f0-9]{64}$/.test(signature)
    ) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "AUTHENTICATION_FAILED",
            "A autenticação da chamada não foi validada."
        ));
    }

    var currentTimeMs = Date.now();
    var timestamp = Number(timestampText);

    if (
        !Number.isSafeInteger(timestamp)
        || Math.abs(currentTimeMs - timestamp) > POC02_MAX_CLOCK_SKEW_MS
    ) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "REQUEST_EXPIRED",
            "A validade temporal da requisição expirou."
        ));
    }

    var secret = PropertiesService
        .getScriptProperties()
        .getProperty(POC02_SECRET_PROPERTY);

    if (typeof secret !== "string" || !/^[a-f0-9]{64}$/.test(secret)) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "AUTH_CONFIG_ERROR",
            "A autenticação server-to-server não está disponível."
        ));
    }

    var payloadBytes = Utilities.newBlob(payloadText).getBytes().length;
    if (payloadBytes > POC02_MAX_PAYLOAD_BYTES) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "INVALID_PAYLOAD",
            "O payload excede o limite permitido para esta prova de conceito."
        ));
    }

    var payloadSha256 = bytesToHex_(Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        payloadText,
        Utilities.Charset.UTF_8
    ));

    var canonicalMessage = [
        "CONECTA_LOCAL_GATEWAY",
        "v1",
        "POST",
        timestampText,
        nonce,
        action,
        requestId,
        payloadSha256
    ].join("\n");

    var expectedSignature = bytesToHex_(Utilities.computeHmacSha256Signature(
        canonicalMessage,
        secret,
        Utilities.Charset.UTF_8
    ));

    if (!constantTimeHexEquals_(expectedSignature, signature)) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "AUTHENTICATION_FAILED",
            "A autenticação da chamada não foi validada."
        ));
    }

    if (POC02_ALLOWED_ACTIONS.indexOf(action) === -1) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "ACTION_NOT_ALLOWED",
            "A ação solicitada não está liberada nesta prova de conceito."
        ));
    }

    var nonceResult = reserveNonce_(nonce, currentTimeMs);
    if (nonceResult !== "reserved") {
        var nonceCode = nonceResult === "replay"
            ? "REPLAY_DETECTED"
            : "NONCE_STORE_UNAVAILABLE";
        var nonceMessage = nonceResult === "replay"
            ? "Esta requisição já foi processada."
            : "Não foi possível reservar o identificador de uso único.";

        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            nonceCode,
            nonceMessage
        ));
    }

    var payload;
    try {
        payload = JSON.parse(payloadText);
    } catch (error) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "INVALID_PAYLOAD",
            "O payload autenticado não contém JSON válido."
        ));
    }

    if (!isPlainObject_(payload)) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "INVALID_PAYLOAD",
            "O payload autenticado deve ser um objeto JSON."
        ));
    }

    if (action === "poc.echo") {
        return jsonOutput_({
            ok: true,
            action: action,
            requestId: requestId,
            data: {
                service: "Conecta Local — POC-02",
                authenticated: true,
                received: true,
                receivedAt: new Date().toISOString(),
                payload: payload
            }
        });
    }

    if (action === "poc.simulate_error") {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "POC_SIMULATED_ERROR",
            "Falha lógica simulada para validar o mapeamento de erros."
        ));
    }

    return ContentService
        .createTextOutput("POC-02: resposta textual inválida de propósito; isto não é JSON.")
        .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Reserva o nonce sob lock para impedir que duas execuções concorrentes
 * aceitem a mesma assinatura. Em qualquer falha, o chamador recusa a ação.
 */
function reserveNonce_(nonce, currentTimeMs) {
    var lock = LockService.getScriptLock();
    var acquired = false;

    try {
        acquired = lock.tryLock(POC02_LOCK_TIMEOUT_MS);
        if (!acquired) {
            return "busy";
        }

        var properties = PropertiesService.getScriptProperties();
        var allProperties = properties.getProperties();
        var nonceKey = POC02_NONCE_PREFIX + nonce;
        var existingValue = allProperties[nonceKey];

        if (typeof existingValue !== "undefined") {
            var existingExpiry = Number(existingValue);
            if (!Number.isFinite(existingExpiry) || existingExpiry > currentTimeMs) {
                return "replay";
            }
            properties.deleteProperty(nonceKey);
        }

        var activeNonceCount = 0;
        Object.keys(allProperties).forEach(function (key) {
            if (key.indexOf(POC02_NONCE_PREFIX) !== 0) {
                return;
            }

            var expiresAt = Number(allProperties[key]);
            if (Number.isFinite(expiresAt) && expiresAt <= currentTimeMs) {
                properties.deleteProperty(key);
                return;
            }

            // Registro inválido é tratado como ativo: nunca liberar espaço
            // apagando estado que não conseguimos interpretar com segurança.
            activeNonceCount += 1;
        });

        if (activeNonceCount >= POC02_MAX_ACTIVE_NONCES) {
            return "capacity";
        }

        properties.setProperty(
            nonceKey,
            String(currentTimeMs + POC02_NONCE_RETENTION_MS)
        );

        return "reserved";
    } catch (error) {
        return "error";
    } finally {
        if (acquired) {
            lock.releaseLock();
        }
    }
}

function constantTimeHexEquals_(expected, received) {
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

function bytesToHex_(bytes) {
    return bytes.map(function (byte) {
        return ("0" + ((byte + 256) % 256).toString(16)).slice(-2);
    }).join("");
}

function isPlainObject_(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }

    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function errorEnvelope_(action, requestId, code, message) {
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

function jsonOutput_(value) {
    return ContentService
        .createTextOutput(JSON.stringify(value))
        .setMimeType(ContentService.MimeType.JSON);
}
