const SERVICE_STATUS = Object.freeze({
    PUBLISHED: "published",
    PAUSED: "paused",
});

export class Usuario {
    constructor({ email }) {
        this.email = email;
    }

    toAccountPayload({ passwordHash, passwordSalt, passwordAlgorithm }) {
        return {
            email: this.email,
            senha_hash: passwordHash,
            senha_salt: passwordSalt,
            senha_algoritmo: passwordAlgorithm,
        };
    }
}

export class Profissional extends Usuario {
    constructor({
        email,
        fullName,
        publicName,
        whatsapp,
        presentation,
        cityId,
    }) {
        super({ email });
        this.fullName = fullName;
        this.publicName = publicName;
        this.whatsapp = whatsapp;
        this.presentation = presentation;
        this.cityId = cityId;
    }

    toRegistrationPayload(credentials) {
        const { verificationCode, ...accountCredentials } = credentials;

        return {
            ...super.toAccountPayload(accountCredentials),
            nome_completo: this.fullName,
            nome_publico: this.publicName,
            whatsapp: this.whatsapp,
            apresentacao: this.presentation,
            id_cidade_principal: this.cityId,
            verificationCode,
        };
    }
}

export class Servico {
    constructor({
        serviceId = null,
        categoryId = null,
        title = null,
        description = null,
        status = null,
    } = {}) {
        this.serviceId = serviceId;
        this.categoryId = categoryId;
        this.title = title;
        this.description = description;
        this.status = status;
    }

    toCreatePayload() {
        return {
            categoryId: this.categoryId,
            title: this.title,
            description: this.description,
        };
    }

    publicar() {
        this.status = SERVICE_STATUS.PUBLISHED;
        return this;
    }

    pausar() {
        this.status = SERVICE_STATUS.PAUSED;
        return this;
    }

    toStatusPayload() {
        return {
            serviceId: this.serviceId,
            status: this.status,
        };
    }
}
