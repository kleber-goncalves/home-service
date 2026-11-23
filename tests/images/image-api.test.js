import assert from "node:assert/strict";
import test from "node:test";

import { uploadProfilePhoto, uploadServiceImage } from "../../src/services/image-api.js";

const CHUNK_BYTES = 1024 * 1024;

function jsonResponse(data, status = 200, error = null) {
    return new Response(JSON.stringify({ ok: status >= 200 && status < 300, data, error }), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

async function withFetchMock(mock, callback) {
    const original = globalThis.fetch;
    globalThis.fetch = mock;
    try {
        await callback();
    } finally {
        globalThis.fetch = original;
    }
}

function createFile(size = CHUNK_BYTES + 17) {
    return new File([new Uint8Array(size)], "synthetic-service-image.jpg", {
        type: "image/jpeg",
        lastModified: 1,
    });
}

test("uploadServiceImage envia blocos de 1 MiB e conclui após confirmação do Drive", async () => {
    await withFetchMock(async (url, options) => {
        if (url === "/api/app") {
            const body = JSON.parse(options.body);
            if (body.action === "image.upload.start") {
                assert.equal(body.payload.fileSize, CHUNK_BYTES + 17);
                return jsonResponse({ uploadId: "00000000-0000-4000-8000-000000000001", nextOffset: 0 });
            }
            assert.fail("Não era esperado consultar status neste teste: " + body.action);
        }

        assert.equal(url, "/api/images");
        assert.equal(options.method, "POST");
        assert.equal(options.credentials, "same-origin");
        assert.equal(options.headers["Content-Type"], "application/octet-stream");
        assert.equal(options.headers["X-Image-Upload-Id"], "00000000-0000-4000-8000-000000000001");

        if (options.headers["X-Image-Start-Offset"] === "0") {
            assert.equal(options.body.size, CHUNK_BYTES);
            return jsonResponse({
                completed: false,
                nextOffset: CHUNK_BYTES,
                totalSize: CHUNK_BYTES + 17,
            });
        }

        assert.equal(options.headers["X-Image-Start-Offset"], String(CHUNK_BYTES));
        assert.equal(options.body.size, 17);
        return jsonResponse({
            completed: true,
            image: { id: "synthetic-image-1", order: 1, status: "active", url: "https://drive.google.com/example" },
        });
    }, async () => {
        const progress = [];
        const result = await uploadServiceImage({
            serviceId: "synthetic-service-1",
            file: createFile(),
            csrfToken: "a".repeat(64),
            onProgress: (value) => progress.push(value),
        });

        assert.equal(result.id, "synthetic-image-1");
        assert.equal(progress[0], 0);
        assert.equal(progress.at(-1), 100);
    });
});

test("uploadServiceImage reconcilia o progresso quando a resposta do bloco se perde", async () => {
    let chunkCalls = 0;
    const image = { id: "synthetic-image-recovered", order: 1, status: "active", url: null };

    await withFetchMock(async (url, options) => {
        if (url !== "/api/app") {
            chunkCalls += 1;
            throw new TypeError("conexão interrompida depois do envio");
        }

        const body = JSON.parse(options.body);
        if (body.action === "image.upload.start") {
            return jsonResponse({ uploadId: "00000000-0000-4000-8000-000000000002", nextOffset: 0 });
        }
        if (body.action === "image.upload.status") {
            return jsonResponse({ completed: true, nextOffset: 1024, totalSize: 1024, image });
        }
        assert.fail("Ação inesperada: " + body.action);
    }, async () => {
        const result = await uploadServiceImage({
            serviceId: "synthetic-service-2",
            file: createFile(1024),
            csrfToken: "b".repeat(64),
        });

        assert.equal(chunkCalls, 1);
        assert.equal(result.id, image.id);
    });
});

test("uploadServiceImage cancela uma intenção não iniciada quando o usuário interrompe", async () => {
    const actions = [];
    const controller = new AbortController();

    await withFetchMock(async (url, options) => {
        assert.equal(url, "/api/app");
        const body = JSON.parse(options.body);
        actions.push(body.action);

        if (body.action === "image.upload.start") {
            return jsonResponse({ uploadId: "00000000-0000-4000-8000-000000000003", nextOffset: 0 });
        }
        if (body.action === "image.upload.status") {
            return jsonResponse({ completed: false, nextOffset: 0, totalSize: 1024 });
        }
        if (body.action === "image.upload.cancel") {
            return jsonResponse({ cancelled: true });
        }
        assert.fail("Ação inesperada: " + body.action);
    }, async () => {
        await assert.rejects(
            uploadServiceImage({
                serviceId: "synthetic-service-3",
                file: createFile(1024),
                csrfToken: "c".repeat(64),
                signal: controller.signal,
                onUploadStarted: () => controller.abort(),
            }),
            (error) => error.name === "AbortError",
        );
    });

    assert.deepEqual(actions, ["image.upload.start", "image.upload.status", "image.upload.cancel"]);
});


test("uploadProfilePhoto usa ações próprias de perfil e o mesmo transporte em blocos", async () => {
    const actions = [];
    const photo = {
        id: "synthetic-profile-photo-1",
        order: 1,
        status: "active",
        url: "/api/public-images?id=synthetic-profile-photo-1",
    };

    await withFetchMock(async (url, options) => {
        if (url === "/api/app") {
            const body = JSON.parse(options.body);
            actions.push(body.action);
            if (body.action === "profile.photo.upload.start") {
                assert.equal(body.payload.fileSize, 24);
                assert.equal(body.payload.mimeType, "image/jpeg");
                return jsonResponse({ uploadId: "00000000-0000-4000-8000-000000000010", nextOffset: 0 });
            }
            assert.fail("Não era esperada uma consulta adicional: " + body.action);
        }

        assert.equal(url, "/api/images");
        assert.equal(options.method, "POST");
        assert.equal(options.credentials, "same-origin");
        assert.equal(options.headers["Content-Type"], "application/octet-stream");
        assert.equal(options.headers["X-Image-Upload-Id"], "00000000-0000-4000-8000-000000000010");
        assert.equal(options.body.size, 24);
        return jsonResponse({ completed: true, image: photo });
    }, async () => {
        const result = await uploadProfilePhoto({
            file: createFile(24),
            csrfToken: "d".repeat(64),
        });
        assert.equal(result.id, photo.id);
        assert.equal(result.url, photo.url);
    });

    assert.deepEqual(actions, ["profile.photo.upload.start"]);
});

test("uploadProfilePhoto reconcilia e cancela usando as ações de perfil", async () => {
    const actions = [];
    const controller = new AbortController();

    await withFetchMock(async (url, options) => {
        assert.equal(url, "/api/app");
        const body = JSON.parse(options.body);
        actions.push(body.action);

        if (body.action === "profile.photo.upload.start") {
            return jsonResponse({ uploadId: "00000000-0000-4000-8000-000000000011", nextOffset: 0 });
        }
        if (body.action === "profile.photo.upload.status") {
            return jsonResponse({ completed: false, nextOffset: 0, totalSize: 1024 });
        }
        if (body.action === "profile.photo.upload.cancel") {
            return jsonResponse({ cancelled: true });
        }
        assert.fail("Ação inesperada: " + body.action);
    }, async () => {
        await assert.rejects(
            uploadProfilePhoto({
                file: createFile(1024),
                csrfToken: "e".repeat(64),
                signal: controller.signal,
                onUploadStarted: () => controller.abort(),
            }),
            (error) => error.name === "AbortError",
        );
    });

    assert.deepEqual(actions, [
        "profile.photo.upload.start",
        "profile.photo.upload.status",
        "profile.photo.upload.cancel",
    ]);
});
