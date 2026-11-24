import test from "node:test";
import assert from "node:assert/strict";
import { createDemoCategories, createDemoServices, filterPublicServices, mapPublicService } from "../../src/lib/public-catalog.js";

const imageIds = {
    first: "00000000-0000-4000-8000-000000000001",
    second: "00000000-0000-4000-8000-000000000002",
    third: "00000000-0000-4000-8000-000000000003",
    removed: "00000000-0000-4000-8000-000000000004",
    invalid: "not-a-valid-image-id",
};
const driveImage = (id, order, status = "active") => ({
    id,
    order,
    mimeType: "image/jpeg",
    sizeBytes: 2048,
    status,
    url: `https://drive.google.com/uc?export=view&id=${id}`,
});

test("preserva as imagens públicas ativas e ordena pela posição de exibição", () => {
    const service = mapPublicService({
        id: "service-1",
        categoryId: "category-1",
        category: "Elétrica",
        title: "Instalação elétrica",
        description: "Instalações residenciais.",
        professional: "Profissional de teste",
        cityIds: ["city-1"],
        cities: [{ id: "city-1", name: "Capelinha", state: "MG" }],
        images: [driveImage(imageIds.third, 3), driveImage(imageIds.first, 1), driveImage(imageIds.second, 2)],
    });

    assert.equal(service.categoryId, "category-1");
    assert.equal(service.images.length, 3);
    assert.deepEqual(service.images.map((image) => image.order), [1, 2, 3]);
    assert.equal(service.cityLabel, "Capelinha - MG");
    assert.equal(service.isPersisted, true);
});

test("ignora imagens removidas ou com identificador inválido e usa a rota interna de entrega", () => {
    const service = mapPublicService({
        id: "service-2",
        images: [
            driveImage(imageIds.first, 1),
            driveImage(imageIds.removed, 2, "removed"),
            driveImage(imageIds.invalid, 3),
        ],
    });

    assert.equal(service.images.length, 1);
    assert.equal(service.images[0].id, imageIds.first);
    assert.equal(service.images[0].url, "/api/public-images?id=" + imageIds.first);
});

test("filtra por categoria, cidade e texto usando todos os municípios atendidos", () => {
    const services = [
        mapPublicService({
            id: "service-1",
            categoryId: "category-electric",
            category: "Elétrica",
            title: "Instalação de tomadas",
            description: "Manutenção residencial.",
            professional: "Carlos",
            cities: [
                { id: "city-1", name: "Capelinha", state: "MG" },
                { id: "city-2", name: "Turmalina", state: "MG" },
            ],
        }),
        mapPublicService({
            id: "service-2",
            categoryId: "category-cleaning",
            category: "Limpeza",
            title: "Limpeza residencial",
            description: "Limpeza de casas.",
            professional: "Ana",
            cities: [{ id: "city-3", name: "Itamarandiba", state: "MG" }],
        }),
    ];

    assert.deepEqual(filterPublicServices(services, { categoryId: "category-electric" }).map((item) => item.id), ["service-1"]);
    assert.deepEqual(filterPublicServices(services, { city: "turmalina" }).map((item) => item.id), ["service-1"]);
    assert.deepEqual(filterPublicServices(services, { city: "Capelinha - MG" }).map((item) => item.id), ["service-1"]);
    assert.deepEqual(filterPublicServices(services, { city: "turmalina - mg", query: "carlos" }).map((item) => item.id), ["service-1"]);
    assert.deepEqual(filterPublicServices(services, { query: "carlos" }).map((item) => item.id), ["service-1"]);
    assert.deepEqual(filterPublicServices(services, { query: "limpeza" }).map((item) => item.id), ["service-2"]);
});


test("mantém exemplos fictícios junto aos serviços cadastrados e os associa às categorias ativas", () => {
    const categories = [
        { id: "category-cleaning", name: "Limpeza" },
        { id: "category-electric", name: "Elétrica" },
    ];
    const demoServices = createDemoServices(categories);

    assert.ok(demoServices.length > 0);
    assert.ok(demoServices.every((service) => service.isDemo === true && service.isPersisted === false));
    assert.ok(demoServices.some((service) => service.categoryId === "category-cleaning"));
    assert.ok(demoServices.some((service) => service.categoryId === "category-electric"));
    assert.ok(demoServices.every((service) => service.whatsapp === ""));
    assert.ok(demoServices.every((service) => service.cities.length === 0));
    assert.ok(demoServices.every((service) => service.images[0].url.startsWith("https://")));
});

test("cria categorias locais de demonstração quando o catálogo remoto não está disponível", () => {
    const demoCategories = createDemoCategories();

    assert.ok(demoCategories.length > 0);
    assert.ok(demoCategories.every((category) => category.isDemo === true));
    assert.ok(demoCategories.every((category) => category.id.startsWith("demo-category-")));
});

test("mantém exemplos na busca textual e por categoria, mas nunca os associa a uma cidade real", () => {
    const demoServices = createDemoServices([
        { id: "category-cleaning", name: "Limpeza" },
        { id: "category-electric", name: "Elétrica" },
    ]);
    const cleaningDemo = demoServices.find((service) => service.category === "Limpeza");

    assert.ok(cleaningDemo);
    assert.deepEqual(
        filterPublicServices(demoServices, { categoryId: "category-cleaning" }).map((service) => service.id),
        [cleaningDemo.id],
    );
    assert.deepEqual(
        filterPublicServices(demoServices, { query: "limpeza residencial" }).map((service) => service.id),
        [cleaningDemo.id],
    );
    assert.deepEqual(
        filterPublicServices(demoServices, { city: "Capelinha - MG" }),
        [],
    );
});
