import assert from "node:assert/strict";
import test from "node:test";

import { Profissional, Servico, Usuario } from "../../server/domain-entities.js";

test("Usuario mantém o e-mail como atributo e monta os dados da conta", () => {
    const usuario = new Usuario({ email: "joao@example.test" });

    assert.equal(usuario.email, "joao@example.test");
    assert.deepEqual(usuario.toAccountPayload({
        passwordHash: "hash-ficticio",
        passwordSalt: "salt-ficticio",
        passwordAlgorithm: "argon2id",
    }), {
        email: "joao@example.test",
        senha_hash: "hash-ficticio",
        senha_salt: "salt-ficticio",
        senha_algoritmo: "argon2id",
    });
});

test("Profissional herda Usuario e converte atributos do perfil para o contrato do backend", () => {
    const profissional = new Profissional({
        email: "ana@example.test",
        fullName: "Ana Silva",
        publicName: "Ana Serviços",
        whatsapp: "34999999999",
        presentation: "Profissional demonstrativa para fins acadêmicos.",
        cityId: "cidade-ficticia-01",
    });

    assert.ok(profissional instanceof Usuario);
    assert.equal(profissional.email, "ana@example.test");
    assert.equal(profissional.publicName, "Ana Serviços");
    assert.deepEqual(profissional.toRegistrationPayload({
        passwordHash: "hash-ficticio",
        passwordSalt: "salt-ficticio",
        passwordAlgorithm: "argon2id",
        verificationCode: "123456",
    }), {
        email: "ana@example.test",
        senha_hash: "hash-ficticio",
        senha_salt: "salt-ficticio",
        senha_algoritmo: "argon2id",
        nome_completo: "Ana Silva",
        nome_publico: "Ana Serviços",
        whatsapp: "34999999999",
        apresentacao: "Profissional demonstrativa para fins acadêmicos.",
        id_cidade_principal: "cidade-ficticia-01",
        verificationCode: "123456",
    });
});

test("Servico cria o payload esperado sem transportar campos internos", () => {
    const servico = new Servico({
        serviceId: "servico-ficticio-01",
        categoryId: "categoria-ficticia-01",
        title: "Instalação de chuveiro",
        description: "Instalação demonstrativa para teste acadêmico.",
        cityIds: ["cidade-ficticia-01", "cidade-ficticia-02"],
        status: "draft",
    });

    assert.deepEqual(servico.toCreatePayload(), {
        categoryId: "categoria-ficticia-01",
        title: "Instalação de chuveiro",
        description: "Instalação demonstrativa para teste acadêmico.",
        cityIds: ["cidade-ficticia-01", "cidade-ficticia-02"],
    });
});

test("Servico pode ser pausado por método de domínio", () => {
    const servico = new Servico({ serviceId: "servico-ficticio-02" });

    const resultado = servico.pausar();

    assert.equal(resultado, servico);
    assert.equal(servico.status, "paused");
    assert.deepEqual(servico.toStatusPayload(), {
        serviceId: "servico-ficticio-02",
        status: "paused",
    });
});

test("Servico pode ser publicado por método de domínio", () => {
    const servico = new Servico({
        serviceId: "servico-ficticio-03",
        status: "paused",
    });

    servico.publicar();

    assert.equal(servico.status, "published");
    assert.deepEqual(servico.toStatusPayload(), {
        serviceId: "servico-ficticio-03",
        status: "published",
    });
});


test("Servico monta payload de edição sem transportar dados de proprietário ou estado", () => {
    const servico = new Servico({
        serviceId: "servico-ficticio-04",
        categoryId: "categoria-ficticia-02",
        title: "Reparo hidráulico",
        description: "Descrição atualizada do serviço demonstrativo.",
        cityIds: ["cidade-ficticia-02"],
        status: "published",
    });

    assert.deepEqual(servico.toUpdatePayload(), {
        serviceId: "servico-ficticio-04",
        categoryId: "categoria-ficticia-02",
        title: "Reparo hidráulico",
        description: "Descrição atualizada do serviço demonstrativo.",
        cityIds: ["cidade-ficticia-02"],
    });
});

test("Servico representa remoção lógica sem transformar a operação em exclusão física", () => {
    const servico = new Servico({
        serviceId: "servico-ficticio-05",
        status: "published",
    });

    const resultado = servico.remover();

    assert.equal(resultado, servico);
    assert.equal(servico.status, "removed");
    assert.deepEqual(servico.toRemovalPayload(), {
        serviceId: "servico-ficticio-05",
    });
});
