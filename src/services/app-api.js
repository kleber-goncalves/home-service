function createRequestId() {
    if (!globalThis.crypto?.randomUUID) {
        throw new Error("Este navegador não oferece um gerador seguro para a requisição.");
    }
    return globalThis.crypto.randomUUID();
}

export async function appRequest(action, payload = {}, csrfToken = "") {
    const headers = {
        "Content-Type": "application/json",
    };
    if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

    const response = await fetch("/api/app", {
        method: "POST",
        credentials: "same-origin",
        headers,
        body: JSON.stringify({
            action,
            requestId: createRequestId(),
            payload,
        }),
    });

    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error("O servidor retornou uma resposta inválida.");
    }

    if (!response.ok || !result?.ok) {
        const error = new Error(result?.error?.message || "Não foi possível concluir a operação.");
        error.code = result?.error?.code || "REQUEST_FAILED";
        error.status = response.status;
        throw error;
    }

    return result.data;
}
