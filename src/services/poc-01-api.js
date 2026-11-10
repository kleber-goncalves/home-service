const SCENARIOS = {
    echo: {
        action: "poc.echo",
        payload: {
            message: "Mensagem sintética enviada pelo React.",
            source: "React/Vite",
            sentAt: new Date().toISOString(),
        },
    },
    simulatedError: {
        action: "poc.simulate_error",
        payload: { scenario: "simulated-backend-error" },
    },
    invalidResponse: {
        action: "poc.invalid_response",
        payload: { scenario: "invalid-upstream-response" },
    },
};

async function readResult(response) {
    const rawText = await response.text();
    let body;

    try {
        body = JSON.parse(rawText);
    } catch {
        body = {
            ok: false,
            error: {
                code: "INVALID_GATEWAY_RESPONSE",
                message: "A rota da Vercel não devolveu JSON válido.",
            },
            raw: rawText.slice(0, 500),
        };
    }

    return {
        httpStatus: response.status,
        httpOk: response.ok,
        body,
    };
}

export async function executePocScenario(scenario) {
    if (scenario === "methodNotAllowed") {
        return readResult(await fetch("/api/backend", {
            method: "GET",
            headers: { Accept: "application/json" },
        }));
    }

    if (scenario === "invalidBrowserJson") {
        return readResult(await fetch("/api/backend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{",
        }));
    }

    const selected = SCENARIOS[scenario];
    if (!selected) {
        throw new Error("Cenário de teste desconhecido.");
    }

    const requestBody = {
        action: selected.action,
        requestId: crypto.randomUUID(),
        payload: selected.payload,
    };

    return readResult(await fetch("/api/backend", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
    }));
}
