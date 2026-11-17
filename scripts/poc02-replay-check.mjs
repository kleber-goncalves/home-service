import { createHash, createHmac, randomBytes } from "node:crypto";

const endpoint = process.env.APPS_SCRIPT_WEB_APP_URL;
const secret = process.env.APPS_SCRIPT_HMAC_SECRET;

if (!endpoint || !secret || !/^[a-f0-9]{64}$/.test(secret)) {
    console.error("Configure APPS_SCRIPT_WEB_APP_URL e APPS_SCRIPT_HMAC_SECRET no ambiente local.");
    process.exit(1);
}

const requestId = `poc02-${randomBytes(8).toString("hex")}`;
const payloadText = JSON.stringify({
    message: "Teste sintético de assinatura e replay — Conecta Local POC-02.",
});
const action = "poc.echo";

function createSignedForm({ timestamp, nonce = randomBytes(32).toString("hex") }) {
    const timestampText = String(timestamp);
    const payloadSha256 = createHash("sha256")
        .update(payloadText, "utf8")
        .digest("hex");
    const canonicalMessage = [
        "CONECTA_LOCAL_GATEWAY",
        "v1",
        "POST",
        timestampText,
        nonce,
        action,
        requestId,
        payloadSha256,
    ].join("\n");
    const signature = createHmac("sha256", Buffer.from(secret, "utf8"))
        .update(canonicalMessage, "utf8")
        .digest("hex");

    return new URLSearchParams({
        signatureVersion: "v1",
        timestamp: timestampText,
        nonce,
        signature,
        action,
        requestId,
        payload: payloadText,
    });
}

async function sendForm(form) {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: form.toString(),
        redirect: "follow",
    });
    const text = await response.text();

    let body;
    try {
        body = JSON.parse(text);
    } catch {
        throw new Error("O Apps Script não devolveu um envelope JSON.");
    }

    return {
        httpStatus: response.status,
        redirected: response.redirected,
        body,
    };
}

function assertCode(result, expectedCode, label) {
    if (result.body?.error?.code !== expectedCode) {
        throw new Error(`${label}: esperado ${expectedCode}, recebido ${result.body?.error?.code || "sem código"}.`);
    }
    console.log(`[OK] ${label}: ${expectedCode} (HTTP ${result.httpStatus}; redirect=${result.redirected}).`);
}

async function main() {
    const unsigned = new URLSearchParams({
        action,
        requestId,
        payload: payloadText,
    });
    const unsignedResult = await sendForm(unsigned);
    assertCode(unsignedResult, "AUTHENTICATION_FAILED", "Chamada direta sem assinatura");

    const expired = createSignedForm({
        timestamp: Date.now() - (5 * 60 * 1000) - 1,
    });
    const expiredResult = await sendForm(expired);
    assertCode(expiredResult, "REQUEST_EXPIRED", "Timestamp expirado");

    const valid = createSignedForm({ timestamp: Date.now() });
    const firstResult = await sendForm(valid);
    if (firstResult.body?.ok !== true) {
        throw new Error(`Primeira chamada assinada deveria ser aceita; código recebido: ${firstResult.body?.error?.code || "desconhecido"}.`);
    }
    console.log(`[OK] Primeira chamada assinada: aceita (HTTP ${firstResult.httpStatus}; redirect=${firstResult.redirected}).`);

    const replayResult = await sendForm(valid);
    assertCode(replayResult, "REPLAY_DETECTED", "Repetição exata da mesma chamada");

    const tampered = new URLSearchParams(valid);
    tampered.set("payload", JSON.stringify({ message: "payload alterado depois da assinatura" }));
    const tamperedResult = await sendForm(tampered);
    assertCode(tamperedResult, "AUTHENTICATION_FAILED", "Payload adulterado");

    console.log("POC-02: todos os testes manuais diretos foram aprovados.");
}

main().catch((error) => {
    console.error(`POC-02: falha na validação manual: ${error.message}`);
    process.exitCode = 1;
});
