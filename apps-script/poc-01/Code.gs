/**
 * Conecta Local — POC-01
 *
 * Endpoint de eco para testar somente o transporte HTTP:
 * React -> Vercel Function -> Apps Script.
 *
 * IMPORTANTE:
 * - Projeto Apps Script isolado, sem planilha, Drive ou outros recursos pessoais.
 * - Não implementar login, sessão, autorização ou operações privilegiadas aqui.
 * - Esta POC ainda NÃO valida assinatura HMAC. A proteção server-to-server será
 *   implementada e testada separadamente na POC-02.
 * - A implantação anônima permite chamadas diretas por terceiros. Por isso,
 *   este script aceita somente ações permitidas e mensagens sintéticas limitadas.
 */

var ALLOWED_ACTIONS = [
    "poc.echo",
    "poc.simulate_error",
    "poc.invalid_response"
];

var MAX_PAYLOAD_BYTES = 8 * 1024;

function doGet() {
    return jsonOutput_({
        ok: true,
        service: "Conecta Local — POC-01",
        message: "Endpoint de teste ativo. Utilize POST para executar os cenários.",
        allowedActions: ALLOWED_ACTIONS
    });
}

function doPost(event) {
    var parameters = event && event.parameter ? event.parameter : {};
    var action = String(parameters.action || "");
    var requestId = String(parameters.requestId || "");
    var payloadText = String(parameters.payload || "");
    var payload;
    var payloadBytes;

    if (!/^[A-Za-z0-9_-]{8,80}$/.test(requestId)) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "INVALID_REQUEST_ID",
            "Identificador da requisição inválido."
        ));
    }

    // A validação é repetida aqui porque chamadas diretas podem ignorar o gateway.
    if (ALLOWED_ACTIONS.indexOf(action) === -1) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "ACTION_NOT_ALLOWED",
            "Ação não permitida na POC-01."
        ));
    }

    payloadBytes = Utilities.newBlob(payloadText).getBytes().length;
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "PAYLOAD_TOO_LARGE",
            "Os dados enviados excedem o limite de 8 KiB da POC-01."
        ));
    }

    try {
        payload = JSON.parse(payloadText);
    } catch (error) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "INVALID_PAYLOAD",
            "O campo payload não contém JSON válido."
        ));
    }

    if (!isPlainObject_(payload)) {
        return jsonOutput_(errorEnvelope_(
            action,
            requestId,
            "INVALID_PAYLOAD",
            "O campo payload deve ser um objeto."
        ));
    }

    if (action === "poc.echo") {
        return jsonOutput_({
            ok: true,
            action: action,
            requestId: requestId,
            data: {
                service: "Conecta Local — POC-01",
                received: true,
                receivedAt: new Date().toISOString(),
                payload: payload
            }
        });
    }

    if (action === "poc.simulate_error") {
        return jsonOutput_({
            ok: false,
            action: action,
            requestId: requestId,
            error: {
                code: "POC_SIMULATED_ERROR",
                message: "Falha lógica simulada para validar o mapeamento de erros."
            }
        });
    }

    // Este cenário prova o tratamento de uma resposta não JSON pelo gateway.
    return ContentService
        .createTextOutput("POC-01: resposta textual inválida de propósito; isto não é JSON.")
        .setMimeType(ContentService.MimeType.TEXT);
}

function isPlainObject_(value) {
    return value !== null
        && typeof value === "object"
        && Object.prototype.toString.call(value) === "[object Object]"
        && !Array.isArray(value);
}

function errorEnvelope_(action, requestId, code, message) {
    return {
        ok: false,
        action: action,
        requestId: requestId,
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
