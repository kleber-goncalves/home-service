/**
 * Conecta Local — backend demonstrativo integrado ao Google Sheets.
 *
 * Implantar como Web App separado, executando como o proprietário da planilha.
 * O navegador NUNCA chama este endpoint diretamente: somente a Vercel Function
 * encaminha chamadas assinadas por HMAC-SHA-256.
 *
 * Dados de demonstração apenas. Não usar credenciais ou dados pessoais reais.
 */

var APP_SECRET_PROPERTY = "CONECTA_LOCAL_HMAC_SECRET";
var APP_SPREADSHEET_PROPERTY = "CONECTA_LOCAL_SPREADSHEET_ID";
var APP_CANONICAL_DOMAIN = "CONECTA_LOCAL_APP_GATEWAY";
var APP_SIGNATURE_VERSION = "v1";
var APP_NONCE_PREFIX = "CONECTA_LOCAL_APP_NONCE_V1_";
var APP_CLOCK_SKEW_MS = 5 * 60 * 1000;
var APP_NONCE_RETENTION_MS = 10 * 60 * 1000 + 30 * 1000;
var APP_MAX_ACTIVE_NONCES = 2500;
var APP_LOCK_TIMEOUT_MS = 8000;
var APP_MAX_PAYLOAD_BYTES = 16 * 1024;
var APP_SESSION_IDLE_MS = 30 * 60 * 1000;
var APP_SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
var APP_VERIFICATION_TTL_MS = 10 * 60 * 1000;
var APP_VERIFICATION_MAX_ATTEMPTS = 5;
var APP_PASSWORD_ALGORITHM = "argon2id$v=19$m=19456,t=2,p=1";

var APP_ALLOWED_ACTIONS = [
    "public.catalog",
    "public.services",
    "auth.register",
    "auth.verify",
    "auth.lookup",
    "session.create",
    "session.me",
    "session.logout",
    "profile.update",
    "service.listMine",
    "service.create",
    "service.setStatus"
];

var APP_SEED_CATEGORIES = [
    "Reformas",
    "Elétrica",
    "Hidráulica",
    "Pintura",
    "Limpeza",
    "Jardinagem"
];

function doGet() {
    return appJson_(appError_(null, null, "METHOD_NOT_ALLOWED", "O endpoint aceita somente POST autenticado."));
}

function doPost(event) {
    var params = event && event.parameter ? event.parameter : {};
    var action = String(params.action || "");
    var requestId = String(params.requestId || "");
    var payloadText = String(params.payload || "");
    var timestampText = String(params.timestamp || "");
    var nonce = String(params.nonce || "");
    var signature = String(params.signature || "");
    var version = String(params.signatureVersion || "");

    if (
        version !== APP_SIGNATURE_VERSION
        || !/^[A-Za-z0-9_-]{8,80}$/.test(requestId)
        || !/^[a-z][a-zA-Z0-9_.-]{1,80}$/.test(action)
        || !/^\d{13}$/.test(timestampText)
        || !/^[a-f0-9]{64}$/.test(nonce)
        || !/^[a-f0-9]{64}$/.test(signature)
    ) {
        return appJson_(appError_(action, requestId, "AUTHENTICATION_FAILED", "A chamada interna não foi autenticada."));
    }

    if (APP_ALLOWED_ACTIONS.indexOf(action) === -1) {
        return appJson_(appError_(action, requestId, "ACTION_NOT_ALLOWED", "A operação não está liberada."));
    }

    var timestamp = Number(timestampText);
    var nowMs = Date.now();
    if (!Number.isSafeInteger(timestamp) || Math.abs(nowMs - timestamp) > APP_CLOCK_SKEW_MS) {
        return appJson_(appError_(action, requestId, "REQUEST_EXPIRED", "A chamada interna expirou."));
    }

    var secret;
    try {
        secret = PropertiesService.getScriptProperties().getProperty(APP_SECRET_PROPERTY);
    } catch (error) {
        return appJson_(appError_(action, requestId, "AUTH_CONFIG_ERROR", "A configuração interna não está disponível."));
    }

    if (typeof secret !== "string" || !/^[a-f0-9]{64}$/.test(secret)) {
        return appJson_(appError_(action, requestId, "AUTH_CONFIG_ERROR", "A configuração interna não está disponível."));
    }

    if (Utilities.newBlob(payloadText).getBytes().length > APP_MAX_PAYLOAD_BYTES) {
        return appJson_(appError_(action, requestId, "INVALID_PAYLOAD", "O conteúdo enviado excede o limite."));
    }

    var payloadHash = appBytesToHex_(Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        payloadText,
        Utilities.Charset.UTF_8
    ));

    var canonical = [
        APP_CANONICAL_DOMAIN,
        APP_SIGNATURE_VERSION,
        "POST",
        timestampText,
        nonce,
        action,
        requestId,
        payloadHash
    ].join("\n");

    var expectedSignature = appBytesToHex_(Utilities.computeHmacSha256Signature(
        canonical,
        secret,
        Utilities.Charset.UTF_8
    ));

    if (!appConstantTimeHexEquals_(expectedSignature, signature)) {
        return appJson_(appError_(action, requestId, "AUTHENTICATION_FAILED", "A chamada interna não foi autenticada."));
    }

    var nonceResult = appReserveNonce_(nonce, nowMs);
    if (nonceResult !== "reserved") {
        return appJson_(appError_(
            action,
            requestId,
            nonceResult === "replay" ? "REPLAY_DETECTED" : "NONCE_STORE_UNAVAILABLE",
            "A chamada não passou pelo controle de uso único."
        ));
    }

    var payload;
    try {
        payload = JSON.parse(payloadText);
    } catch (error) {
        return appJson_(appError_(action, requestId, "INVALID_PAYLOAD", "O payload não contém JSON válido."));
    }

    if (!appIsPlainObject_(payload)) {
        return appJson_(appError_(action, requestId, "INVALID_PAYLOAD", "O payload deve ser um objeto JSON."));
    }

    try {
        var data = appDispatch_(action, payload, nowMs, secret);
        return appJson_({
            ok: true,
            action: action,
            requestId: requestId,
            data: data
        });
    } catch (error) {
        var code = error && error.appCode ? error.appCode : "APP_OPERATION_FAILED";
        var message = error && error.appMessage ? error.appMessage : "Não foi possível concluir a operação.";
        return appJson_(appError_(action, requestId, code, message));
    }
}

function appDispatch_(action, payload, nowMs, secret) {
    if (action === "public.catalog") return appGetCatalog_();
    if (action === "public.services") return appGetPublicServices_();
    if (action === "auth.register") return appRegister_(payload, nowMs, secret);
    if (action === "auth.verify") return appVerifyEmail_(payload, nowMs, secret);
    if (action === "auth.lookup") return appLookupCredentials_(payload);
    if (action === "session.create") return appCreateSession_(payload, nowMs);
    if (action === "session.me") return appSessionMe_(payload, nowMs);
    if (action === "session.logout") return appLogout_(payload, nowMs);
    if (action === "profile.update") return appUpdateProfile_(payload, nowMs);
    if (action === "service.listMine") return appListMyServices_(payload, nowMs);
    if (action === "service.create") return appCreateService_(payload, nowMs);
    if (action === "service.setStatus") return appSetServiceStatus_(payload, nowMs);
    throw appFault_("ACTION_NOT_ALLOWED", "A operação não está liberada.");
}

/* -------------------------- Estrutura e leitura -------------------------- */

function appSpreadsheet_() {
    var id = PropertiesService.getScriptProperties().getProperty(APP_SPREADSHEET_PROPERTY);
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{20,}$/.test(id)) {
        throw appFault_("STORE_NOT_CONFIGURED", "O identificador da planilha não foi configurado no Apps Script.");
    }
    try {
        return SpreadsheetApp.openById(id);
    } catch (error) {
        throw appFault_("STORE_UNAVAILABLE", "Não foi possível abrir a planilha de dados.");
    }
}

function appSheet_(name) {
    var sheet = appSpreadsheet_().getSheetByName(name);
    if (!sheet) throw appFault_("STORE_SCHEMA_INVALID", "A aba " + name + " não foi encontrada.");
    return sheet;
}

function appHeaders_(sheet) {
    var count = sheet.getLastColumn();
    if (count < 1) throw appFault_("STORE_SCHEMA_INVALID", "A aba não possui cabeçalho.");
    return sheet.getRange(1, 1, 1, count).getValues()[0].map(String);
}

function appRecords_(sheetName) {
    var sheet = appSheet_(sheetName);
    var headers = appHeaders_(sheet);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    return values.map(function (row, index) {
        var item = { _row: index + 2 };
        headers.forEach(function (header, column) {
            item[header] = row[column] === null ? "" : row[column];
        });
        return item;
    });
}

function appAppend_(sheetName, record) {
    var sheet = appSheet_(sheetName);
    var headers = appHeaders_(sheet);
    var row = headers.map(function (header) {
        return typeof record[header] === "undefined" ? "" : record[header];
    });
    sheet.appendRow(row);
    return sheet.getLastRow();
}

function appUpdate_(sheetName, rowNumber, record) {
    var sheet = appSheet_(sheetName);
    var headers = appHeaders_(sheet);
    var range = sheet.getRange(rowNumber, 1, 1, headers.length);
    var current = range.getValues()[0];
    var next = headers.map(function (header, index) {
        return typeof record[header] === "undefined" ? current[index] : record[header];
    });
    range.setValues([next]);
}

function appFind_(sheetName, field, value) {
    var records = appRecords_(sheetName);
    for (var i = 0; i < records.length; i += 1) {
        if (String(records[i][field]) === String(value)) return records[i];
    }
    return null;
}

function appFindByEmail_(email) {
    var normalized = appNormalizeEmail_(email);
    var records = appRecords_("USUARIOS");
    for (var i = 0; i < records.length; i += 1) {
        if (String(records[i].email).toLowerCase() === normalized) return records[i];
    }
    return null;
}

function appSafeUser_(user, profile) {
    return {
        idUsuario: String(user.id_usuario),
        idProfissional: profile ? String(profile.id_profissional) : null,
        email: String(user.email),
        status: String(user.status),
        role: String(user.papel),
        fullName: profile ? String(profile.nome_completo) : "",
        publicName: profile ? String(profile.nome_publico) : "",
        presentation: profile ? String(profile.apresentacao) : "",
        cityId: profile ? String(profile.id_cidade_principal) : "",
        neighborhoods: profile ? String(profile.bairros_regioes_atendidos || "") : "",
        whatsapp: profile ? String(profile.whatsapp || "") : ""
    };
}

function appGetProfile_(userId) {
    return appFind_("PROFISSIONAIS", "id_usuario", userId);
}

function appEnsureSeedData_() {
    var categories = appRecords_("CATEGORIAS");
    if (categories.length === 0) {
        appWithLock_(function () {
            var current = appRecords_("CATEGORIAS");
            if (current.length > 0) return;
            var nowIso = new Date().toISOString();
            APP_SEED_CATEGORIES.forEach(function (name) {
                appAppend_("CATEGORIAS", {
                    id_categoria: Utilities.getUuid(),
                    nome: name,
                    status: "active",
                    criado_em: nowIso,
                    atualizado_em: nowIso
                });
            });
        });
    }

    var cities = appRecords_("CIDADES");
    if (cities.length === 0) {
        appWithLock_(function () {
            var current = appRecords_("CIDADES");
            if (current.length > 0) return;
            var nowIso = new Date().toISOString();
            appAppend_("CIDADES", {
                id_cidade: Utilities.getUuid(),
                nome: "Capelinha",
                uf: "MG",
                codigo_ibge: "",
                status: "active",
                criado_em: nowIso,
                atualizado_em: nowIso
            });
        });
    }
}

function appGetCatalog_() {
    appEnsureSeedData_();
    return {
        categories: appRecords_("CATEGORIAS")
            .filter(function (item) { return String(item.status) === "active"; })
            .map(function (item) { return { id: String(item.id_categoria), name: String(item.nome) }; }),
        cities: appRecords_("CIDADES")
            .filter(function (item) { return String(item.status) === "active"; })
            .map(function (item) { return { id: String(item.id_cidade), name: String(item.nome), state: String(item.uf) }; })
    };
}

/* ------------------------------ Cadastro -------------------------------- */

function appRegister_(payload, nowMs, secret) {
    appEnsureSeedData_();
    var required = [
        "email", "senha_hash", "senha_salt", "senha_algoritmo",
        "nome_completo", "nome_publico", "apresentacao",
        "id_cidade_principal", "whatsapp", "verificationCode"
    ];
    if (!appHasKeys_(payload, required)) {
        throw appFault_("INVALID_INPUT", "Preencha todos os campos obrigatórios do cadastro.");
    }

    var email = appNormalizeEmail_(payload.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
        throw appFault_("INVALID_EMAIL", "O e-mail informado é inválido.");
    }
    if (appFindByEmail_(email)) {
        throw appFault_("EMAIL_ALREADY_EXISTS", "Este e-mail já possui cadastro.");
    }

    if (
        payload.senha_algoritmo !== APP_PASSWORD_ALGORITHM
        || !/^[0-9a-f]{32}$/.test(String(payload.senha_salt))
        || !/^[0-9a-f]{64}$/.test(String(payload.senha_hash))
    ) {
        throw appFault_("PASSWORD_RECORD_INVALID", "O registro de senha não foi gerado corretamente.");
    }

    var fullName = appText_(payload.nome_completo, 2, 120, "Nome completo");
    var publicName = appText_(payload.nome_publico, 2, 80, "Nome público");
    var presentation = appText_(payload.apresentacao, 10, 500, "Apresentação");
    var whatsapp = appNormalizePhone_(payload.whatsapp);
    var city = appFind_("CIDADES", "id_cidade", payload.id_cidade_principal);
    if (!city || String(city.status) !== "active") {
        throw appFault_("CITY_INVALID", "Selecione uma cidade válida.");
    }

    var verificationCode = String(payload.verificationCode || "");
    if (!/^\d{6}$/.test(verificationCode)) {
        throw appFault_("VERIFICATION_CODE_INVALID", "Não foi possível gerar o código de confirmação.");
    }

    return appWithLock_(function () {
        if (appFindByEmail_(email)) {
            throw appFault_("EMAIL_ALREADY_EXISTS", "Este e-mail já possui cadastro.");
        }

        var createdAt = new Date(nowMs).toISOString();
        var userId = Utilities.getUuid();
        var profileId = Utilities.getUuid();
        var verificationId = Utilities.getUuid();
        var codeHmac = appVerificationHmac_(secret, userId, verificationCode);

        appAppend_("USUARIOS", {
            id_usuario: userId,
            email: email,
            senha_hash: String(payload.senha_hash),
            senha_salt: String(payload.senha_salt),
            senha_algoritmo: APP_PASSWORD_ALGORITHM,
            papel: "professional",
            status: "pending_activation",
            email_verificado_em: "",
            criado_em: createdAt,
            atualizado_em: createdAt,
            ultimo_login_em: ""
        });

        appAppend_("PROFISSIONAIS", {
            id_profissional: profileId,
            id_usuario: userId,
            nome_completo: fullName,
            nome_publico: publicName,
            apresentacao: presentation,
            id_cidade_principal: String(city.id_cidade),
            bairros_regioes_atendidos: "",
            whatsapp: whatsapp,
            telefone_alternativo: "",
            criado_em: createdAt,
            atualizado_em: createdAt
        });

        appAppend_("CODIGOS_VERIFICACAO", {
            id_codigo: verificationId,
            id_usuario: userId,
            finalidade: "verify_email",
            email_destino: email,
            codigo_hmac: codeHmac,
            criado_em: createdAt,
            expira_em: new Date(nowMs + APP_VERIFICATION_TTL_MS).toISOString(),
            tentativas: 0,
            utilizado_em: "",
            invalidado_em: ""
        });

        appAudit_(userId, "user", "auth.register", "USUARIOS", userId, "success", "Cadastro demonstrativo criado.");
        return {
            registered: true,
            requiresVerification: true,
            user: appSafeUser_({ id_usuario: userId, email: email, status: "pending_activation", papel: "professional" }, appGetProfile_(userId))
        };
    });
}

function appVerifyEmail_(payload, nowMs, secret) {
    if (!appHasKeys_(payload, ["email", "code"])) {
        throw appFault_("INVALID_INPUT", "Informe o e-mail e o código de confirmação.");
    }

    var email = appNormalizeEmail_(payload.email);
    var code = String(payload.code || "");
    if (!/^\d{6}$/.test(code)) throw appFault_("VERIFICATION_FAILED", "O código de confirmação é inválido.");

    return appWithLock_(function () {
        var user = appFindByEmail_(email);
        if (!user || String(user.status) !== "pending_activation") {
            throw appFault_("VERIFICATION_FAILED", "O cadastro não está aguardando confirmação.");
        }

        var candidates = appRecords_("CODIGOS_VERIFICACAO").filter(function (item) {
            return String(item.id_usuario) === String(user.id_usuario)
                && String(item.finalidade) === "verify_email"
                && !item.utilizado_em
                && !item.invalidado_em;
        }).sort(function (a, b) {
            return String(b.criado_em).localeCompare(String(a.criado_em));
        });

        var record = candidates[0];
        if (!record || new Date(record.expira_em).getTime() <= nowMs) {
            throw appFault_("VERIFICATION_EXPIRED", "O código expirou. Inicie novamente o cadastro.");
        }

        var expected = appVerificationHmac_(secret, String(user.id_usuario), code);
        if (!appConstantTimeHexEquals_(expected, String(record.codigo_hmac))) {
            var attempts = Number(record.tentativas || 0) + 1;
            appUpdate_("CODIGOS_VERIFICACAO", record._row, {
                tentativas: attempts,
                invalidado_em: attempts >= APP_VERIFICATION_MAX_ATTEMPTS ? new Date(nowMs).toISOString() : ""
            });
            throw appFault_("VERIFICATION_FAILED", "O código informado não confere.");
        }

        var verifiedAt = new Date(nowMs).toISOString();
        appUpdate_("CODIGOS_VERIFICACAO", record._row, { utilizado_em: verifiedAt });
        appUpdate_("USUARIOS", user._row, {
            status: "active",
            email_verificado_em: verifiedAt,
            atualizado_em: verifiedAt
        });
        appAudit_(String(user.id_usuario), "user", "auth.verify_email", "USUARIOS", String(user.id_usuario), "success", "E-mail demonstrativo confirmado.");
        var updatedUser = appFind_("USUARIOS", "id_usuario", user.id_usuario);
        return {
            verified: true,
            user: appSafeUser_(updatedUser, appGetProfile_(String(user.id_usuario)))
        };
    });
}

function appLookupCredentials_(payload) {
    if (!appHasKeys_(payload, ["email"])) throw appFault_("INVALID_INPUT", "Informe o e-mail.");
    var user = appFindByEmail_(payload.email);
    if (!user) throw appFault_("INVALID_CREDENTIALS", "E-mail ou senha inválidos.");
    if (String(user.status) !== "active") {
        throw appFault_(
            String(user.status) === "pending_activation" ? "ACCOUNT_PENDING" : "ACCOUNT_UNAVAILABLE",
            String(user.status) === "pending_activation" ? "Confirme seu e-mail antes de entrar." : "Esta conta não está disponível."
        );
    }
    return {
        idUsuario: String(user.id_usuario),
        status: String(user.status),
        algoritmo: String(user.senha_algoritmo),
        salt: String(user.senha_salt),
        hash: String(user.senha_hash)
    };
}

/* ------------------------------- Sessões -------------------------------- */

function appCreateSession_(payload, nowMs) {
    if (!appHasKeys_(payload, ["idUsuario", "tokenHash"])) {
        throw appFault_("INVALID_INPUT", "Não foi possível criar a sessão.");
    }
    if (!/^[0-9a-f]{64}$/.test(String(payload.tokenHash))) {
        throw appFault_("INVALID_SESSION_TOKEN", "O token de sessão é inválido.");
    }

    return appWithLock_(function () {
        var user = appFind_("USUARIOS", "id_usuario", payload.idUsuario);
        if (!user || String(user.status) !== "active") {
            throw appFault_("ACCOUNT_UNAVAILABLE", "A conta não está disponível.");
        }

        var profile = appGetProfile_(String(user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil profissional não está disponível.");

        var nowIso = new Date(nowMs).toISOString();
        var expiresAt = new Date(nowMs + APP_SESSION_ABSOLUTE_MS).toISOString();
        appAppend_("SESSOES", {
            id_sessao: Utilities.getUuid(),
            id_usuario: String(user.id_usuario),
            token_hash: String(payload.tokenHash),
            criado_em: nowIso,
            ultima_atividade_em: nowIso,
            expira_em: expiresAt,
            revogada_em: ""
        });
        appUpdate_("USUARIOS", user._row, {
            ultimo_login_em: nowIso,
            atualizado_em: nowIso
        });
        appAudit_(String(user.id_usuario), "user", "auth.login", "SESSOES", "", "success", "Sessão iniciada.");
        return {
            authenticated: true,
            user: appSafeUser_(user, profile),
            expiresAt: expiresAt
        };
    });
}

function appRequireSession_(tokenHash, nowMs, updateActivity) {
    if (typeof tokenHash !== "string" || !/^[0-9a-f]{64}$/.test(tokenHash)) {
        throw appFault_("SESSION_INVALID", "Entre novamente para continuar.");
    }

    var session = appFind_("SESSOES", "token_hash", tokenHash);
    if (!session || session.revogada_em) {
        throw appFault_("SESSION_INVALID", "Entre novamente para continuar.");
    }

    var createdAt = new Date(session.criado_em).getTime();
    var lastActivity = new Date(session.ultima_atividade_em).getTime();
    var absoluteExpiry = new Date(session.expira_em).getTime();

    if (
        !Number.isFinite(createdAt)
        || !Number.isFinite(lastActivity)
        || !Number.isFinite(absoluteExpiry)
        || nowMs - lastActivity >= APP_SESSION_IDLE_MS
        || nowMs >= absoluteExpiry
    ) {
        appUpdate_("SESSOES", session._row, { revogada_em: new Date(nowMs).toISOString() });
        throw appFault_("SESSION_EXPIRED", "Sua sessão expirou. Entre novamente.");
    }

    var user = appFind_("USUARIOS", "id_usuario", session.id_usuario);
    if (!user || String(user.status) !== "active") {
        appUpdate_("SESSOES", session._row, { revogada_em: new Date(nowMs).toISOString() });
        throw appFault_("SESSION_INVALID", "Entre novamente para continuar.");
    }

    if (updateActivity) {
        appUpdate_("SESSOES", session._row, {
            ultima_atividade_em: new Date(nowMs).toISOString()
        });
    }

    return { session: session, user: user };
}

function appSessionMe_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash"])) throw appFault_("SESSION_INVALID", "Entre novamente para continuar.");
    return appWithLock_(function () {
        var state = appRequireSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(state.user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil profissional não está disponível.");
        return {
            authenticated: true,
            user: appSafeUser_(state.user, profile),
            services: appGetServicesForUser_(String(state.user.id_usuario))
        };
    });
}

function appLogout_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash"])) throw appFault_("SESSION_INVALID", "A sessão não foi localizada.");
    return appWithLock_(function () {
        var session = appFind_("SESSOES", "token_hash", String(payload.tokenHash));
        if (!session || session.revogada_em) return { revoked: true };
        var nowIso = new Date(nowMs).toISOString();
        appUpdate_("SESSOES", session._row, { revogada_em: nowIso });
        appAudit_(String(session.id_usuario), "user", "auth.logout", "SESSOES", String(session.id_sessao), "success", "Sessão encerrada.");
        return { revoked: true };
    });
}

/* ------------------------- Perfil e serviços --------------------------- */

function appUpdateProfile_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash", "nome_publico", "apresentacao", "id_cidade_principal", "whatsapp"])) {
        throw appFault_("INVALID_INPUT", "Preencha os campos do perfil.");
    }

    return appWithLock_(function () {
        var state = appRequireSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(state.user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil não está disponível.");
        var city = appFind_("CIDADES", "id_cidade", payload.id_cidade_principal);
        if (!city || String(city.status) !== "active") throw appFault_("CITY_INVALID", "Selecione uma cidade válida.");

        appUpdate_("PROFISSIONAIS", profile._row, {
            nome_publico: appText_(payload.nome_publico, 2, 80, "Nome público"),
            apresentacao: appText_(payload.apresentacao, 10, 500, "Apresentação"),
            id_cidade_principal: String(city.id_cidade),
            whatsapp: appNormalizePhone_(payload.whatsapp),
            atualizado_em: new Date(nowMs).toISOString()
        });
        appAudit_(String(state.user.id_usuario), "user", "profile.update", "PROFISSIONAIS", String(profile.id_profissional), "success", "Perfil atualizado.");
        var updated = appGetProfile_(String(state.user.id_usuario));
        return { user: appSafeUser_(state.user, updated) };
    });
}

function appGetServicesForUser_(userId) {
    var profile = appGetProfile_(userId);
    if (!profile) return [];
    var categories = appRecords_("CATEGORIAS");
    var categoryMap = {};
    categories.forEach(function (item) { categoryMap[String(item.id_categoria)] = String(item.nome); });

    return appRecords_("SERVICOS")
        .filter(function (item) { return String(item.id_profissional) === String(profile.id_profissional); })
        .map(function (item) {
            return {
                id: String(item.id_servico),
                categoryId: String(item.id_categoria),
                category: categoryMap[String(item.id_categoria)] || "Outros",
                title: String(item.nome_servico),
                description: String(item.descricao),
                status: String(item.status),
                priceMode: String(item.modalidade_preco || "not_informed"),
                price: item.valor_preco === "" ? null : Number(item.valor_preco)
            };
        });
}

function appListMyServices_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash"])) throw appFault_("SESSION_INVALID", "Entre novamente para continuar.");
    return appWithLock_(function () {
        var state = appRequireSession_(String(payload.tokenHash), nowMs, true);
        return { services: appGetServicesForUser_(String(state.user.id_usuario)) };
    });
}

function appCreateService_(payload, nowMs) {
    var required = ["tokenHash", "categoryId", "title", "description"];
    if (!appHasKeys_(payload, required)) throw appFault_("INVALID_INPUT", "Preencha o nome, categoria e descrição do serviço.");

    return appWithLock_(function () {
        var state = appRequireSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(state.user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil profissional não está disponível.");

        var category = appFind_("CATEGORIAS", "id_categoria", payload.categoryId);
        if (!category || String(category.status) !== "active") throw appFault_("CATEGORY_INVALID", "Selecione uma categoria válida.");

        var title = appText_(payload.title, 3, 80, "Nome do serviço");
        var description = appText_(payload.description, 10, 500, "Descrição");
        var nowIso = new Date(nowMs).toISOString();

        var serviceId = Utilities.getUuid();
        appAppend_("SERVICOS", {
            id_servico: serviceId,
            id_profissional: String(profile.id_profissional),
            id_categoria: String(category.id_categoria),
            nome_servico: title,
            descricao: description,
            bairros_regioes: "",
            modalidade_preco: "not_informed",
            valor_preco: "",
            status: "published",
            criado_em: nowIso,
            atualizado_em: nowIso,
            publicado_em: nowIso
        });

        appAudit_(String(state.user.id_usuario), "user", "service.create", "SERVICOS", serviceId, "success", "Serviço demonstrativo cadastrado.");
        return { created: true, service: appGetServicesForUser_(String(state.user.id_usuario)).filter(function (item) { return item.id === serviceId; })[0] };
    });
}

function appSetServiceStatus_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash", "serviceId", "status"])) {
        throw appFault_("INVALID_INPUT", "Não foi possível atualizar o serviço.");
    }
    var nextStatus = String(payload.status);
    if (nextStatus !== "published" && nextStatus !== "paused") {
        throw appFault_("INVALID_STATUS", "Estado de serviço inválido.");
    }

    return appWithLock_(function () {
        var state = appRequireSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(state.user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil profissional não está disponível.");

        var service = appFind_("SERVICOS", "id_servico", String(payload.serviceId));
        if (!service || String(service.id_profissional) !== String(profile.id_profissional)) {
            throw appFault_("SERVICE_NOT_FOUND", "Serviço não encontrado.");
        }

        var nowIso = new Date(nowMs).toISOString();
        appUpdate_("SERVICOS", service._row, {
            status: nextStatus,
            atualizado_em: nowIso,
            publicado_em: nextStatus === "published" ? (service.publicado_em || nowIso) : service.publicado_em
        });
        appAudit_(String(state.user.id_usuario), "user", "service.status", "SERVICOS", String(service.id_servico), "success", "Estado do serviço atualizado.");
        return {
            updated: true,
            service: appGetServicesForUser_(String(state.user.id_usuario)).filter(function (item) { return item.id === String(service.id_servico); })[0]
        };
    });
}

function appGetPublicServices_() {
    appEnsureSeedData_();
    var users = appRecords_("USUARIOS");
    var profiles = appRecords_("PROFISSIONAIS");
    var categories = appRecords_("CATEGORIAS");
    var cities = appRecords_("CIDADES");
    var usersById = {};
    var cityById = {};
    var categoryById = {};
    var profileById = {};

    users.forEach(function (item) { usersById[String(item.id_usuario)] = item; });
    cities.forEach(function (item) { cityById[String(item.id_cidade)] = item; });
    categories.forEach(function (item) { categoryById[String(item.id_categoria)] = item; });
    profiles.forEach(function (item) { profileById[String(item.id_profissional)] = item; });

    return appRecords_("SERVICOS")
        .filter(function (service) {
            var profile = profileById[String(service.id_profissional)];
            var user = profile ? usersById[String(profile.id_usuario)] : null;
            var category = categoryById[String(service.id_categoria)];
            return String(service.status) === "published"
                && profile
                && user
                && String(user.status) === "active"
                && category
                && String(category.status) === "active";
        })
        .slice(-100)
        .reverse()
        .map(function (service) {
            var profile = profileById[String(service.id_profissional)];
            var city = cityById[String(profile.id_cidade_principal)];
            var category = categoryById[String(service.id_categoria)];
            return {
                id: String(service.id_servico),
                title: String(service.nome_servico),
                description: String(service.descricao),
                category: String(category.nome),
                professional: String(profile.nome_publico),
                city: city ? String(city.nome) + " - " + String(city.uf) : "",
                whatsapp: String(profile.whatsapp || "")
            };
        });
}

/* ---------------------------- Auditoria --------------------------------- */

function appAudit_(userId, actorType, action, entity, recordId, result, details) {
    appAppend_("AUDITORIA", {
        id_evento: Utilities.getUuid(),
        id_usuario_ator: userId || "",
        tipo_ator: actorType || "system",
        acao: action,
        entidade_afetada: entity,
        id_registro_afetado: recordId || "",
        resultado: result,
        detalhes: details || "",
        criado_em: new Date().toISOString()
    });
}

/* --------------------------- Utilitários -------------------------------- */

function appWithLock_(callback) {
    var lock = LockService.getScriptLock();
    var acquired = false;
    try {
        acquired = lock.tryLock(APP_LOCK_TIMEOUT_MS);
        if (!acquired) throw appFault_("STORE_BUSY", "A planilha está ocupada. Tente novamente.");
        return callback();
    } finally {
        if (acquired && lock.hasLock()) lock.releaseLock();
    }
}

function appNormalizeEmail_(value) {
    if (typeof value !== "string") throw appFault_("INVALID_EMAIL", "O e-mail informado é inválido.");
    return value.trim().toLowerCase();
}

function appNormalizePhone_(value) {
    if (typeof value !== "string") throw appFault_("INVALID_PHONE", "Informe um WhatsApp válido.");
    var digits = value.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) throw appFault_("INVALID_PHONE", "Informe um WhatsApp com DDD e número.");
    return digits;
}

function appText_(value, min, max, label) {
    if (typeof value !== "string") throw appFault_("INVALID_INPUT", label + " inválido.");
    var text = value.trim();
    if (text.length < min || text.length > max) throw appFault_("INVALID_INPUT", label + " deve ter entre " + min + " e " + max + " caracteres.");
    return text;
}

function appHasKeys_(value, keys) {
    if (!appIsPlainObject_(value)) return false;
    return keys.every(function (key) {
        return Object.prototype.hasOwnProperty.call(value, key);
    });
}

function appIsPlainObject_(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function appVerificationHmac_(secret, userId, code) {
    var message = ["CONECTA_LOCAL_EMAIL_VERIFY_V1", userId, code].join("\n");
    return appBytesToHex_(Utilities.computeHmacSha256Signature(message, secret, Utilities.Charset.UTF_8));
}

function appReserveNonce_(nonce, nowMs) {
    var lock = LockService.getScriptLock();
    var acquired = false;
    try {
        acquired = lock.tryLock(APP_LOCK_TIMEOUT_MS);
        if (!acquired) return "busy";

        var properties = PropertiesService.getScriptProperties();
        var all = properties.getProperties();
        var key = APP_NONCE_PREFIX + nonce;
        if (Object.prototype.hasOwnProperty.call(all, key)) {
            var expiry = Number(all[key]);
            if (!Number.isFinite(expiry) || expiry > nowMs) return "replay";
            properties.deleteProperty(key);
        }

        var active = 0;
        Object.keys(all).forEach(function (propertyKey) {
            if (propertyKey.indexOf(APP_NONCE_PREFIX) !== 0) return;
            var expiryAt = Number(all[propertyKey]);
            if (!Number.isFinite(expiryAt) || expiryAt <= nowMs) {
                properties.deleteProperty(propertyKey);
            } else {
                active += 1;
            }
        });

        if (active >= APP_MAX_ACTIVE_NONCES) return "busy";
        properties.setProperty(key, String(nowMs + APP_NONCE_RETENTION_MS));
        return "reserved";
    } catch (error) {
        return "unavailable";
    } finally {
        if (acquired && lock.hasLock()) lock.releaseLock();
    }
}

function appBytesToHex_(bytes) {
    return bytes.map(function (value) {
        var unsigned = value < 0 ? value + 256 : value;
        return ("0" + unsigned.toString(16)).slice(-2);
    }).join("");
}

function appConstantTimeHexEquals_(left, right) {
    if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
    var difference = 0;
    for (var i = 0; i < left.length; i += 1) {
        difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
    }
    return difference === 0;
}

function appFault_(code, message) {
    var error = new Error(message);
    error.appCode = code;
    error.appMessage = message;
    return error;
}

function appError_(action, requestId, code, message) {
    return {
        ok: false,
        action: action || null,
        requestId: requestId || null,
        error: { code: code, message: message }
    };
}

function appJson_(value) {
    return ContentService.createTextOutput(JSON.stringify(value))
        .setMimeType(ContentService.MimeType.JSON);
}
