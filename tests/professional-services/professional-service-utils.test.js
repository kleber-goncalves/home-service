import test from "node:test";
import assert from "node:assert/strict";
import {
    filterProfessionalServices,
    getServiceActiveImages,
    getServiceLocationLabel,
    getServiceStatusCounts,
} from "../../src/components/professional/services/professional-service-utils.js";

test("getServiceActiveImages mantém apenas imagens ativas e ordena pela ordem de exibição", () => {
    const images = getServiceActiveImages({
        images: [
            { id: "c", status: "active", order: 3 },
            { id: "removed", status: "removed", order: 1 },
            { id: "a", status: "active", order: 1 },
            { id: "b", status: "active", order: 2 },
        ],
    });

    assert.deepEqual(images.map((image) => image.id), ["a", "b", "c"]);
});

test("getServiceActiveImages retorna array vazio quando não há imagens", () => {
    assert.deepEqual(getServiceActiveImages({ images: null }), []);
});

test("getServiceLocationLabel combina cidades e estados sem duplicar entradas", () => {
    assert.equal(
        getServiceLocationLabel({
            cities: [
                { name: "Uberaba", state: "MG" },
                { name: "Uberaba", state: "MG" },
                { name: "Delta", state: "MG" },
            ],
            city: "Campo fallback",
        }),
        "Uberaba - MG, Delta - MG",
    );
});

test("getServiceLocationLabel usa o fallback quando cidades não estão disponíveis", () => {
    assert.equal(getServiceLocationLabel({ city: "Uberaba, Delta" }), "Uberaba, Delta");
    assert.equal(getServiceLocationLabel({}), "Localidade não informada");
});

test("filterProfessionalServices seleciona somente o estado solicitado", () => {
    const services = [
        { id: "1", status: "published" },
        { id: "2", status: "paused" },
        { id: "3", status: "draft" },
    ];

    assert.deepEqual(
        filterProfessionalServices(services, "paused").map((service) => service.id),
        ["2"],
    );
    assert.equal(filterProfessionalServices(services, "all").length, 3);
});

test("getServiceStatusCounts contabiliza todos os estados conhecidos", () => {
    const counts = getServiceStatusCounts([
        { status: "published" },
        { status: "published" },
        { status: "paused" },
        { status: "draft" },
        { status: "suspended" },
        { status: "removed" },
    ]);

    assert.deepEqual(counts, {
        all: 6,
        published: 2,
        paused: 1,
        draft: 1,
        suspended: 1,
        removed: 1,
    });
});
