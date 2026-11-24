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
var APP_IMAGE_MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
var APP_IMAGE_UPLOAD_STATE_PREFIX = "CONECTA_LOCAL_IMAGE_UPLOAD_V1_";
var APP_IMAGE_UPLOAD_SERVICE_PREFIX = "CONECTA_LOCAL_IMAGE_SERVICE_UPLOAD_V1_";
var APP_IMAGE_UPLOAD_PROFILE_PREFIX = "CONECTA_LOCAL_IMAGE_PROFILE_UPLOAD_V1_";
var APP_IMAGE_DRIVE_FOLDER_PROPERTY = "CONECTA_LOCAL_DRIVE_FOLDER_ID";
var APP_IMAGE_MAX_BYTES = 5000000;
var APP_IMAGE_CHUNK_BYTES = 1024 * 1024;
var APP_IMAGE_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;
var APP_IMAGE_IN_FLIGHT_STALE_MS = 90 * 1000;
var APP_SESSION_IDLE_MS = 30 * 60 * 1000;
var APP_SESSION_ABSOLUTE_MS = 8 * 60 * 60 * 1000;
var APP_VERIFICATION_TTL_MS = 10 * 60 * 1000;
var APP_VERIFICATION_MAX_ATTEMPTS = 5;
var APP_EMAIL_CHANGE_RESEND_MS = 60 * 1000;
var APP_REAUTH_RATE_PREFIX = "CONECTA_LOCAL_REAUTH_RATE_V1_";
var APP_REAUTH_RATE_WINDOW_MS = 15 * 60 * 1000;
var APP_REAUTH_MAX_ATTEMPTS = 5;
var APP_PASSWORD_ALGORITHM = "argon2id$v=19$m=19456,t=2,p=1";

var APP_ALLOWED_ACTIONS = [
    "public.catalog",
    "public.services",
    "public.image.resolve",
    "auth.register",
    "auth.verify",
    "auth.lookup",
    "auth.reauth.lookup",
    "auth.reauth.success",
    "email.change.start",
    "email.change.confirm",
    "session.create",
    "session.me",
    "session.logout",
    "profile.update",
    "service.listMine",
    "service.create",
    "service.update",
    "service.remove",
    "service.setStatus",
    "image.upload.start",
    "image.upload.chunk",
    "image.upload.status",
    "image.upload.cancel",
    "image.remove",
    "profile.photo.upload.start",
    "profile.photo.upload.status",
    "profile.photo.upload.cancel",
    "profile.photo.remove"
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

    var payloadLimit = action === "image.upload.chunk" ? APP_IMAGE_MAX_PAYLOAD_BYTES : APP_MAX_PAYLOAD_BYTES;
    if (Utilities.newBlob(payloadText).getBytes().length > payloadLimit) {
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
    if (action === "public.image.resolve") return appResolvePublicImage_(payload);
    if (action === "auth.register") return appRegister_(payload, nowMs, secret);
    if (action === "auth.verify") return appVerifyEmail_(payload, nowMs, secret);
    if (action === "auth.lookup") return appLookupCredentials_(payload);
    if (action === "auth.reauth.lookup") return appLookupReauthCredentials_(payload, nowMs);
    if (action === "auth.reauth.success") return appReauthSuccess_(payload, nowMs);
    if (action === "email.change.start") return appStartEmailChange_(payload, nowMs, secret);
    if (action === "email.change.confirm") return appConfirmEmailChange_(payload, nowMs, secret);
    if (action === "session.create") return appCreateSession_(payload, nowMs);
    if (action === "session.me") return appSessionMe_(payload, nowMs);
    if (action === "session.logout") return appLogout_(payload, nowMs);
    if (action === "profile.update") return appUpdateProfile_(payload, nowMs);
    if (action === "service.listMine") return appListMyServices_(payload, nowMs);
    if (action === "service.create") return appCreateService_(payload, nowMs);
    if (action === "service.update") return appUpdateService_(payload, nowMs);
    if (action === "service.remove") return appRemoveService_(payload, nowMs);
    if (action === "service.setStatus") return appSetServiceStatus_(payload, nowMs);
    if (action === "image.upload.start") return appImageUploadStart_(payload, nowMs);
    if (action === "image.upload.chunk") return appImageUploadChunk_(payload, nowMs);
    if (action === "image.upload.status") return appImageUploadStatus_(payload, nowMs);
    if (action === "image.upload.cancel") return appImageUploadCancel_(payload, nowMs);
    if (action === "image.remove") return appImageRemove_(payload, nowMs);
    if (action === "profile.photo.upload.start") return appProfilePhotoUploadStart_(payload, nowMs);
    if (action === "profile.photo.upload.status") return appImageUploadStatus_(payload, nowMs);
    if (action === "profile.photo.upload.cancel") return appImageUploadCancel_(payload, nowMs);
    if (action === "profile.photo.remove") return appProfilePhotoRemove_(payload, nowMs);
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
    var profilePhoto = profile && String(user.status) === "active"
        ? appGetProfilePhoto_(String(profile.id_profissional))
        : null;
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
        whatsapp: profile ? String(profile.whatsapp || "") : "",
        photoId: profilePhoto ? String(profilePhoto.id_imagem) : "",
        photoUrl: profilePhoto ? appImageProxyUrl_(String(profilePhoto.id_imagem)) : ""
    };
}

function appGetProfile_(userId) {
    return appFind_("PROFISSIONAIS", "id_usuario", userId);
}

function appGetProfilePhoto_(profileId) {
    var rows = appRecords_("IMAGENS").filter(function (item) {
        return String(item.id_profissional || "") === String(profileId)
            && String(item.id_servico || "") === ""
            && String(item.status) === "active";
    });
    return rows.length === 1 ? rows[0] : null;
}

function appImageProxyUrl_(imageId) {
    return "/api/public-images?id=" + encodeURIComponent(String(imageId));
}

function appBuildServiceCityIndex_() {
    var citiesById = {};
    appRecords_("CIDADES").forEach(function (city) {
        citiesById[String(city.id_cidade)] = city;
    });
    var cityIdsByService = {};
    appRecords_("SERVICO_CIDADES").forEach(function (link) {
        var serviceId = String(link.id_servico);
        var cityId = String(link.id_cidade);
        if (!cityIdsByService[serviceId]) cityIdsByService[serviceId] = [];
        if (cityIdsByService[serviceId].indexOf(cityId) === -1) cityIdsByService[serviceId].push(cityId);
    });
    return { citiesById: citiesById, cityIdsByService: cityIdsByService };
}

function appGetServiceCityIds_(serviceId, fallbackCityId, index) {
    var cityIndex = index || appBuildServiceCityIndex_();
    var linked = cityIndex.cityIdsByService[String(serviceId)] || [];
    if (linked.length) return linked.slice();
    return fallbackCityId ? [String(fallbackCityId)] : [];
}

function appGetServiceCities_(cityIds, index) {
    var cityIndex = index || appBuildServiceCityIndex_();
    return (Array.isArray(cityIds) ? cityIds : [])
        .map(function (cityId) { return cityIndex.citiesById[String(cityId)] || null; })
        .filter(function (city) { return Boolean(city); })
        .map(function (city) {
            return { id: String(city.id_cidade), name: String(city.nome), state: String(city.uf), status: String(city.status) };
        });
}

function appServiceCityLabel_(cities) {
    return (Array.isArray(cities) ? cities : [])
        .map(function (city) { return String(city.name) + " - " + String(city.state); })
        .join(", ");
}

function appNormalizeServiceCityIds_(cityIds, preservedCityIds, index) {
    if (!Array.isArray(cityIds) || cityIds.length === 0) {
        throw appFault_("CITY_INVALID", "Selecione pelo menos uma cidade atendida.");
    }
    var cityIndex = index || appBuildServiceCityIndex_();
    var preserved = {};
    (Array.isArray(preservedCityIds) ? preservedCityIds : []).forEach(function (cityId) {
        preserved[String(cityId)] = true;
    });
    var seen = {};
    return cityIds.map(function (value) {
        if (typeof value !== "string" || !value.trim()) {
            throw appFault_("CITY_INVALID", "Selecione cidades válidas.");
        }
        var cityId = value.trim();
        if (seen[cityId]) throw appFault_("INVALID_INPUT", "Não repita uma cidade no mesmo serviço.");
        seen[cityId] = true;
        var city = cityIndex.citiesById[cityId];
        if (!city || (String(city.status) !== "active" && !preserved[cityId])) {
            throw appFault_("CITY_INVALID", "Uma das cidades selecionadas não está disponível.");
        }
        return cityId;
    });
}

function appReplaceServiceCities_(serviceId, cityIds, fallbackCityId, nowMs) {
    var existingRows = appRecords_("SERVICO_CIDADES").filter(function (link) {
        return String(link.id_servico) === String(serviceId);
    });
    var existingIds = [];
    existingRows.forEach(function (link) {
        var cityId = String(link.id_cidade);
        if (existingIds.indexOf(cityId) === -1) existingIds.push(cityId);
    });
    var preservedIds = existingIds.length ? existingIds : (fallbackCityId ? [String(fallbackCityId)] : []);
    var index = appBuildServiceCityIndex_();
    var normalizedIds = appNormalizeServiceCityIds_(cityIds, preservedIds, index);
    var desired = {};
    normalizedIds.forEach(function (cityId) { desired[cityId] = true; });

    var kept = {};
    var rowsToDelete = [];
    existingRows.forEach(function (link) {
        var cityId = String(link.id_cidade);
        if (!desired[cityId] || kept[cityId]) rowsToDelete.push(link);
        else kept[cityId] = true;
    });
    var nowIso = new Date(nowMs).toISOString();
    normalizedIds.forEach(function (cityId) {
        if (kept[cityId]) return;
        appAppend_("SERVICO_CIDADES", {
            id_servico_cidade: Utilities.getUuid(),
            id_servico: String(serviceId),
            id_cidade: cityId,
            criado_em: nowIso
        });
    });
    rowsToDelete.sort(function (left, right) { return right._row - left._row; })
        .forEach(function (link) { appSheet_("SERVICO_CIDADES").deleteRow(link._row); });
    return normalizedIds;
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


function appLookupReauthCredentials_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash"])) {
        throw appFault_("INVALID_INPUT", "Não foi possível revalidar a senha.");
    }

    return appWithLock_(function () {
        var state = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var properties = PropertiesService.getScriptProperties();
        var key = APP_REAUTH_RATE_PREFIX + String(state.user.id_usuario);
        var stored = properties.getProperty(key);
        var rate = null;

        if (stored) {
            try { rate = JSON.parse(stored); } catch (error) { rate = null; }
        }

        if (
            !rate
            || !Number.isFinite(Number(rate.windowStartedAt))
            || !Number.isInteger(Number(rate.attempts))
            || nowMs - Number(rate.windowStartedAt) >= APP_REAUTH_RATE_WINDOW_MS
            || nowMs < Number(rate.windowStartedAt)
        ) {
            rate = { windowStartedAt: nowMs, attempts: 0 };
        }

        if (Number(rate.attempts) >= APP_REAUTH_MAX_ATTEMPTS) {
            throw appFault_("REAUTH_RATE_LIMITED", "Muitas tentativas de reautenticação. Aguarde 15 minutos.");
        }

        rate.attempts = Number(rate.attempts) + 1;
        properties.setProperty(key, JSON.stringify(rate));

        return {
            idUsuario: String(state.user.id_usuario),
            status: String(state.user.status),
            algoritmo: String(state.user.senha_algoritmo),
            salt: String(state.user.senha_salt),
            hash: String(state.user.senha_hash)
        };
    });
}

function appReauthSuccess_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash"])) {
        throw appFault_("INVALID_INPUT", "Não foi possível concluir a reautenticação.");
    }

    return appWithLock_(function () {
        var state = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        PropertiesService.getScriptProperties().deleteProperty(
            APP_REAUTH_RATE_PREFIX + String(state.user.id_usuario)
        );
        return { reauthenticated: true };
    });
}

function appStartEmailChange_(payload, nowMs, secret) {
    if (!appHasKeys_(payload, ["tokenHash", "newEmail", "verificationCode"])) {
        throw appFault_("INVALID_INPUT", "Informe o novo e-mail.");
    }

    var email = appNormalizeEmail_(payload.newEmail);
    var code = String(payload.verificationCode || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
        throw appFault_("INVALID_EMAIL", "O e-mail informado é inválido.");
    }
    if (!/^\d{6}$/.test(code)) {
        throw appFault_("VERIFICATION_CODE_INVALID", "Não foi possível gerar o código demonstrativo.");
    }

    return appWithLock_(function () {
        var state = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var userId = String(state.user.id_usuario);
        var currentEmail = appNormalizeEmail_(String(state.user.email));

        if (email === currentEmail) {
            throw appFault_("EMAIL_UNCHANGED", "O novo e-mail precisa ser diferente do endereço atual.");
        }

        var existingUser = appFindByEmail_(email);
        if (existingUser && String(existingUser.id_usuario) !== userId) {
            throw appFault_("EMAIL_ALREADY_EXISTS", "Este e-mail já possui cadastro.");
        }

        var codes = appRecords_("CODIGOS_VERIFICACAO");
        var userRequests = codes.filter(function (item) {
            return String(item.id_usuario) === userId
                && String(item.finalidade) === "change_email";
        }).sort(function (left, right) {
            return String(right.criado_em).localeCompare(String(left.criado_em));
        });
        var latest = userRequests[0];

        if (latest) {
            var latestCreatedAt = new Date(latest.criado_em).getTime();
            if (Number.isFinite(latestCreatedAt) && nowMs >= latestCreatedAt
                && nowMs - latestCreatedAt < APP_EMAIL_CHANGE_RESEND_MS) {
                throw appFault_("VERIFICATION_RESEND_TOO_SOON", "Aguarde 60 segundos antes de solicitar outro código.");
            }
        }

        var reservedByAnotherUser = codes.some(function (item) {
            if (
                String(item.finalidade) !== "change_email"
                || String(item.email_destino || "") !== email
                || String(item.id_usuario) === userId
                || item.utilizado_em
                || item.invalidado_em
                || Number(item.tentativas || 0) >= APP_VERIFICATION_MAX_ATTEMPTS
            ) return false;
            var expiresAt = new Date(item.expira_em).getTime();
            return Number.isFinite(expiresAt) && expiresAt > nowMs;
        });

        if (reservedByAnotherUser) {
            throw appFault_("EMAIL_ALREADY_RESERVED", "Este endereço possui uma solicitação de confirmação pendente.");
        }

        var nowIso = new Date(nowMs).toISOString();
        userRequests.forEach(function (item) {
            if (!item.utilizado_em && !item.invalidado_em) {
                appUpdate_("CODIGOS_VERIFICACAO", item._row, {
                    invalidado_em: nowIso,
                    email_destino: "",
                    codigo_hmac: ""
                });
            }
        });

        var verificationId = Utilities.getUuid();
        appAppend_("CODIGOS_VERIFICACAO", {
            id_codigo: verificationId,
            id_usuario: userId,
            finalidade: "change_email",
            email_destino: email,
            codigo_hmac: appEmailChangeVerificationHmac_(secret, userId, email, code),
            criado_em: nowIso,
            expira_em: new Date(nowMs + APP_VERIFICATION_TTL_MS).toISOString(),
            tentativas: 0,
            utilizado_em: "",
            invalidado_em: ""
        });

        appAudit_(
            userId,
            "user",
            "auth.change_email.request",
            "CODIGOS_VERIFICACAO",
            verificationId,
            "success",
            "Solicitação demonstrativa de alteração de e-mail criada."
        );

        return {
            requested: true,
            pendingEmail: email,
            expiresAt: new Date(nowMs + APP_VERIFICATION_TTL_MS).toISOString()
        };
    });
}

function appConfirmEmailChange_(payload, nowMs, secret) {
    if (!appHasKeys_(payload, ["tokenHash", "code"])) {
        throw appFault_("INVALID_INPUT", "Informe o código de confirmação.");
    }

    var code = String(payload.code || "");
    if (!/^\d{6}$/.test(code)) {
        throw appFault_("VERIFICATION_FAILED", "O código de confirmação é inválido.");
    }

    return appWithLock_(function () {
        var state = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var userId = String(state.user.id_usuario);
        var candidates = appRecords_("CODIGOS_VERIFICACAO").filter(function (item) {
            return String(item.id_usuario) === userId
                && String(item.finalidade) === "change_email"
                && !item.utilizado_em
                && !item.invalidado_em;
        }).sort(function (left, right) {
            return String(right.criado_em).localeCompare(String(left.criado_em));
        });

        var record = candidates[0];
        if (!record) {
            throw appFault_("EMAIL_CHANGE_PENDING_NOT_FOUND", "Não há uma alteração de e-mail aguardando confirmação.");
        }

        var expiresAt = new Date(record.expira_em).getTime();
        if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) {
            appUpdate_("CODIGOS_VERIFICACAO", record._row, {
                invalidado_em: new Date(nowMs).toISOString(),
                email_destino: "",
                codigo_hmac: ""
            });
            throw appFault_("VERIFICATION_EXPIRED", "O código de alteração de e-mail expirou.");
        }

        var attempts = Number(record.tentativas || 0);
        if (!Number.isInteger(attempts) || attempts >= APP_VERIFICATION_MAX_ATTEMPTS) {
            if (!record.invalidado_em) {
                appUpdate_("CODIGOS_VERIFICACAO", record._row, {
                    invalidado_em: new Date(nowMs).toISOString(),
                    email_destino: "",
                    codigo_hmac: ""
                });
            }
            throw appFault_("VERIFICATION_FAILED", "O código de confirmação não confere.");
        }

        var email = appNormalizeEmail_(String(record.email_destino || ""));
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
            appUpdate_("CODIGOS_VERIFICACAO", record._row, {
                invalidado_em: new Date(nowMs).toISOString(),
                email_destino: "",
                codigo_hmac: ""
            });
            throw appFault_("EMAIL_CHANGE_PENDING_NOT_FOUND", "A solicitação de alteração não é válida.");
        }

        var duplicate = appFindByEmail_(email);
        if (duplicate && String(duplicate.id_usuario) !== userId) {
            appUpdate_("CODIGOS_VERIFICACAO", record._row, {
                invalidado_em: new Date(nowMs).toISOString(),
                email_destino: "",
                codigo_hmac: ""
            });
            throw appFault_("EMAIL_ALREADY_EXISTS", "Este e-mail já possui cadastro.");
        }

        var expected = appEmailChangeVerificationHmac_(secret, userId, email, code);
        if (!appConstantTimeHexEquals_(expected, String(record.codigo_hmac))) {
            attempts += 1;
            appUpdate_("CODIGOS_VERIFICACAO", record._row, {
                tentativas: attempts,
                invalidado_em: attempts >= APP_VERIFICATION_MAX_ATTEMPTS ? new Date(nowMs).toISOString() : "",
                email_destino: attempts >= APP_VERIFICATION_MAX_ATTEMPTS ? "" : email,
                codigo_hmac: attempts >= APP_VERIFICATION_MAX_ATTEMPTS ? "" : record.codigo_hmac
            });
            throw appFault_("VERIFICATION_FAILED", "O código informado não confere.");
        }

        var nowIso = new Date(nowMs).toISOString();
        appUpdate_("CODIGOS_VERIFICACAO", record._row, { utilizado_em: nowIso, email_destino: "", codigo_hmac: "" });
        appUpdate_("USUARIOS", state.user._row, {
            email: email,
            email_verificado_em: nowIso,
            atualizado_em: nowIso
        });

        appRecords_("SESSOES").filter(function (session) {
            return String(session.id_usuario) === userId && !session.revogada_em;
        }).forEach(function (session) {
            appUpdate_("SESSOES", session._row, { revogada_em: nowIso });
        });

        candidates.slice(1).forEach(function (item) {
            if (!item.utilizado_em && !item.invalidado_em) {
                appUpdate_("CODIGOS_VERIFICACAO", item._row, {
                    invalidado_em: nowIso,
                    email_destino: "",
                    codigo_hmac: ""
                });
            }
        });

        appAudit_(
            userId,
            "user",
            "auth.change_email.confirm",
            "USUARIOS",
            userId,
            "success",
            "E-mail atualizado após confirmação demonstrativa; sessões revogadas."
        );

        return {
            changed: true,
            email: email,
            requiresLogin: true
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

function appRequireProfessionalSession_(tokenHash, nowMs, updateActivity) {
    var state = appRequireSession_(tokenHash, nowMs, false);
    if (String(state.user.papel) !== "professional") {
        throw appFault_("ROLE_FORBIDDEN", "A conta não possui permissão para esta operação.");
    }

    if (updateActivity) {
        appUpdate_("SESSOES", state.session._row, {
            ultima_atividade_em: new Date(nowMs).toISOString()
        });
    }

    return state;
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
    if (!appHasKeys_(payload, ["tokenHash", "nome_completo", "nome_publico", "apresentacao", "id_cidade_principal", "whatsapp"])) {
        throw appFault_("INVALID_INPUT", "Preencha os campos do perfil.");
    }

    return appWithLock_(function () {
        var state = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(state.user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil não está disponível.");
        var city = appFind_("CIDADES", "id_cidade", payload.id_cidade_principal);
        if (!city || String(city.status) !== "active") throw appFault_("CITY_INVALID", "Selecione uma cidade válida.");

        appUpdate_("PROFISSIONAIS", profile._row, {
            nome_completo: appText_(payload.nome_completo, 2, 120, "Nome completo"),
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
    var cityIndex = appBuildServiceCityIndex_();
    return appRecords_("SERVICOS")
        .filter(function (item) { return String(item.id_profissional) === String(profile.id_profissional); })
        .map(function (item) {
            var cityIds = appGetServiceCityIds_(item.id_servico, profile.id_cidade_principal, cityIndex);
            var cities = appGetServiceCities_(cityIds, cityIndex);
            return {
                id: String(item.id_servico),
                categoryId: String(item.id_categoria),
                category: categoryMap[String(item.id_categoria)] || "Outros",
                title: String(item.nome_servico),
                description: String(item.descricao),
                status: String(item.status),
                priceMode: String(item.modalidade_preco || "not_informed"),
                price: item.valor_preco === "" ? null : Number(item.valor_preco),
                cityIds: cityIds,
                cities: cities,
                city: appServiceCityLabel_(cities),
                images: appGetServiceImages_(String(item.id_servico), String(item.status) === "published")
            };
        });
}

function appListMyServices_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash"])) throw appFault_("SESSION_INVALID", "Entre novamente para continuar.");
    return appWithLock_(function () {
        var state = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        return { services: appGetServicesForUser_(String(state.user.id_usuario)) };
    });
}

function appCreateService_(payload, nowMs) {
    var required = ["tokenHash", "categoryId", "title", "description", "cityIds"];
    if (!appHasKeys_(payload, required)) throw appFault_("INVALID_INPUT", "Preencha nome, categoria, descrição e cidades do serviço.");
    return appWithLock_(function () {
        var state = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(state.user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil profissional não está disponível.");
        var category = appFind_("CATEGORIAS", "id_categoria", payload.categoryId);
        if (!category || String(category.status) !== "active") throw appFault_("CATEGORY_INVALID", "Selecione uma categoria válida.");
        var cityIds = appNormalizeServiceCityIds_(payload.cityIds, []);
        var title = appText_(payload.title, 5, 100, "Nome do serviço");
        var description = appText_(payload.description, 10, 1000, "Descrição");
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
        appReplaceServiceCities_(serviceId, cityIds, "", nowMs);
        appAudit_(String(state.user.id_usuario), "user", "service.create", "SERVICOS", serviceId, "success", "Serviço demonstrativo cadastrado. Cidades: " + cityIds.join(", "));
        return {
            created: true,
            service: appGetServicesForUser_(String(state.user.id_usuario)).filter(function (item) { return item.id === serviceId; })[0]
        };
    });
}

function appUpdateService_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash", "serviceId", "categoryId", "title", "description", "cityIds"])) {
        throw appFault_("INVALID_INPUT", "Preencha os campos obrigatórios do serviço.");
    }
    return appWithLock_(function () {
        var state = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(state.user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil profissional não está disponível.");
        var service = appFind_("SERVICOS", "id_servico", String(payload.serviceId));
        if (!service || String(service.id_profissional) !== String(profile.id_profissional)) {
            throw appFault_("SERVICE_NOT_FOUND", "Serviço não encontrado.");
        }
        if (["suspended", "removed"].indexOf(String(service.status)) !== -1) {
            throw appFault_("SERVICE_STATE_LOCKED", "Este serviço não pode mais ser alterado pelo profissional.");
        }
        var category = appFind_("CATEGORIAS", "id_categoria", String(payload.categoryId));
        var keepsExistingCategory = String(payload.categoryId) === String(service.id_categoria);
        if (!category || (!keepsExistingCategory && String(category.status) !== "active")) {
            throw appFault_("CATEGORY_INVALID", "Selecione uma categoria ativa.");
        }
        var cityIndex = appBuildServiceCityIndex_();
        var currentCityIds = appGetServiceCityIds_(service.id_servico, profile.id_cidade_principal, cityIndex);
        var cityIds = appNormalizeServiceCityIds_(payload.cityIds, currentCityIds, cityIndex);
        var title = appText_(payload.title, 5, 100, "Nome do serviço");
        var description = appText_(payload.description, 10, 1000, "Descrição");
        var nowIso = new Date(nowMs).toISOString();
        appUpdate_("SERVICOS", service._row, {
            id_categoria: String(category.id_categoria),
            nome_servico: title,
            descricao: description,
            atualizado_em: nowIso
        });
        appReplaceServiceCities_(String(service.id_servico), cityIds, profile.id_cidade_principal, nowMs);
        appAudit_(String(state.user.id_usuario), "user", "service.update", "SERVICOS", String(service.id_servico), "success", "Dados do serviço atualizados. Cidades: " + cityIds.join(", "));
        return {
            updated: true,
            service: appGetServicesForUser_(String(state.user.id_usuario))
                .filter(function (item) { return item.id === String(service.id_servico); })[0]
        };
    });
}

function appRemoveService_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash", "serviceId"])) {
        throw appFault_("INVALID_INPUT", "Não foi possível remover o serviço.");
    }

    return appWithLock_(function () {
        var state = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(state.user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil profissional não está disponível.");

        var service = appFind_("SERVICOS", "id_servico", String(payload.serviceId));
        if (!service || String(service.id_profissional) !== String(profile.id_profissional)) {
            throw appFault_("SERVICE_NOT_FOUND", "Serviço não encontrado.");
        }
        if (["suspended", "removed"].indexOf(String(service.status)) !== -1) {
            throw appFault_("SERVICE_STATE_LOCKED", "Este serviço não pode ser removido pelo profissional.");
        }

        appSetServiceImagesVisibility_(String(service.id_servico), false);
        var nowIso = new Date(nowMs).toISOString();
        appUpdate_("SERVICOS", service._row, {
            status: "removed",
            atualizado_em: nowIso
        });
        appAudit_(
            String(state.user.id_usuario),
            "user",
            "service.remove",
            "SERVICOS",
            String(service.id_servico),
            "success",
            "Serviço removido logicamente pelo profissional."
        );

        return {
            removed: true,
            service: appGetServicesForUser_(String(state.user.id_usuario))
                .filter(function (item) { return item.id === String(service.id_servico); })[0]
        };
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
        var state = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(state.user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil profissional não está disponível.");

        var service = appFind_("SERVICOS", "id_servico", String(payload.serviceId));
        if (!service || String(service.id_profissional) !== String(profile.id_profissional)) {
            throw appFault_("SERVICE_NOT_FOUND", "Serviço não encontrado.");
        }
        if (["published", "paused"].indexOf(String(service.status)) === -1) {
            throw appFault_("SERVICE_STATE_LOCKED", "Este serviço não pode ter o estado alterado pelo profissional.");
        }

        var nowIso = new Date(nowMs).toISOString();
        if (nextStatus === "paused") {
            appSetServiceImagesVisibility_(String(service.id_servico), false);
            appUpdate_("SERVICOS", service._row, {
                status: nextStatus,
                atualizado_em: nowIso,
                publicado_em: service.publicado_em
            });
        } else {
            appUpdate_("SERVICOS", service._row, {
                status: nextStatus,
                atualizado_em: nowIso,
                publicado_em: service.publicado_em || nowIso
            });
            try {
                appSetServiceImagesVisibility_(String(service.id_servico), true);
            } catch (visibilityError) {
                try { appSetServiceImagesVisibility_(String(service.id_servico), false); } catch (ignored) {}
                appUpdate_("SERVICOS", service._row, {
                    status: "paused",
                    atualizado_em: new Date().toISOString()
                });
                throw appFault_("IMAGE_PERMISSION_SYNC_FAILED", "Não foi possível liberar todas as imagens. O serviço voltou para pausa.");
            }
        }
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
    var usersById = {};
    var categoryById = {};
    var profileById = {};
    var cityIndex = appBuildServiceCityIndex_();
    users.forEach(function (item) { usersById[String(item.id_usuario)] = item; });
    categories.forEach(function (item) { categoryById[String(item.id_categoria)] = item; });
    profiles.forEach(function (item) { profileById[String(item.id_profissional)] = item; });

    return appRecords_("SERVICOS")
        .filter(function (service) {
            var profile = profileById[String(service.id_profissional)];
            var user = profile ? usersById[String(profile.id_usuario)] : null;
            var category = categoryById[String(service.id_categoria)];
            return String(service.status) === "published" && profile && user
                && String(user.status) === "active" && category;
        })
        .slice(-100).reverse()
        .map(function (service) {
            var profile = profileById[String(service.id_profissional)];
            var category = categoryById[String(service.id_categoria)];
            var cityIds = appGetServiceCityIds_(service.id_servico, profile.id_cidade_principal, cityIndex);
            var cities = appGetServiceCities_(cityIds, cityIndex);
            return {
                id: String(service.id_servico),
                categoryId: String(service.id_categoria),
                title: String(service.nome_servico),
                description: String(service.descricao),
                category: String(category.nome),
                professional: String(profile.nome_publico),
                cityIds: cityIds,
                cities: cities,
                city: appServiceCityLabel_(cities),
                whatsapp: String(profile.whatsapp || ""),
                images: appGetServiceImages_(String(service.id_servico), true).map(function (image) {
                    return {
                        id: image.id,
                        order: image.order,
                        mimeType: image.mimeType,
                        sizeBytes: image.sizeBytes,
                        status: image.status
                    };
                })
            };
        });
}


/* ------------------------ Imagens no Google Drive ------------------------ */

function appImageSheet_() {
    var sheet = appSheet_("IMAGENS");
    var required = [
        "id_imagem", "id_profissional", "id_servico", "id_arquivo_drive",
        "tipo_mime", "tamanho_bytes", "ordem_exibicao", "status",
        "criado_em", "atualizado_em"
    ];
    var headers = appHeaders_(sheet);
    if (required.some(function (header) { return headers.indexOf(header) === -1; })) {
        throw appFault_("STORE_SCHEMA_INVALID", "A aba IMAGENS não corresponde ao esquema esperado.");
    }
    return sheet;
}

function appImageUploadKey_(uploadId) {
    return APP_IMAGE_UPLOAD_STATE_PREFIX + String(uploadId);
}

function appImageServiceReservationKey_(serviceId) {
    return APP_IMAGE_UPLOAD_SERVICE_PREFIX + String(serviceId);
}

function appImageProfileReservationKey_(profileId) {
    return APP_IMAGE_UPLOAD_PROFILE_PREFIX + String(profileId);
}

function appImageReadUploadState_(uploadId) {
    if (typeof uploadId !== "string" || !/^[0-9a-f-]{36}$/i.test(uploadId)) {
        throw appFault_("IMAGE_UPLOAD_NOT_FOUND", "A sessão de envio não foi encontrada.");
    }
    var raw = PropertiesService.getScriptProperties().getProperty(appImageUploadKey_(uploadId));
    if (typeof raw !== "string" || !raw) {
        throw appFault_("IMAGE_UPLOAD_NOT_FOUND", "A sessão de envio não foi encontrada ou expirou.");
    }
    var state;
    try { state = JSON.parse(raw); } catch (error) {
        throw appFault_("IMAGE_UPLOAD_STATE_INVALID", "O estado do envio não pode ser recuperado.");
    }
    if (!appIsPlainObject_(state) || String(state.uploadId) !== uploadId) {
        throw appFault_("IMAGE_UPLOAD_STATE_INVALID", "O estado do envio não pode ser recuperado.");
    }
    if (!Number.isFinite(Number(state.expiresAt)) || Number(state.expiresAt) <= Date.now()) {
        appImageDeleteUploadState_(state);
        throw appFault_("IMAGE_UPLOAD_EXPIRED", "A sessão de envio expirou. Inicie um novo envio.");
    }
    return state;
}

function appImageStoreUploadState_(state) {
    PropertiesService.getScriptProperties().setProperty(
        appImageUploadKey_(String(state.uploadId)),
        JSON.stringify(state)
    );
}

function appImageDeleteUploadState_(state) {
    var properties = PropertiesService.getScriptProperties();
    if (!state || !state.uploadId) return;
    properties.deleteProperty(appImageUploadKey_(String(state.uploadId)));
    if (String(state.kind || "service") === "profile") {
        properties.deleteProperty(appImageProfileReservationKey_(String(state.profileId)));
    } else {
        properties.deleteProperty(appImageServiceReservationKey_(String(state.serviceId)));
    }
}

function appImageMimeAllowed_(mimeType) {
    return ["image/jpeg", "image/png", "image/webp"].indexOf(String(mimeType)) !== -1;
}

function appImageExtension_(mimeType) {
    if (mimeType === "image/jpeg") return "jpg";
    if (mimeType === "image/png") return "png";
    if (mimeType === "image/webp") return "webp";
    throw appFault_("IMAGE_MIME_INVALID", "Formato de imagem não permitido.");
}

function appImageByte_(value) {
    return (Number(value) + 256) % 256;
}

function appImageSignatureMatches_(bytes, mimeType) {
    if (!Array.isArray(bytes) || bytes.length < 12) return false;
    var first = bytes.slice(0, 12).map(appImageByte_);
    if (mimeType === "image/jpeg") return first[0] === 255 && first[1] === 216 && first[2] === 255;
    if (mimeType === "image/png") {
        return first[0] === 137 && first[1] === 80 && first[2] === 78 && first[3] === 71
            && first[4] === 13 && first[5] === 10 && first[6] === 26 && first[7] === 10;
    }
    if (mimeType === "image/webp") {
        return first[0] === 82 && first[1] === 73 && first[2] === 70 && first[3] === 70
            && first[8] === 87 && first[9] === 69 && first[10] === 66 && first[11] === 80;
    }
    return false;
}

function appImagePrivateFolderId_() {
    var folderId = PropertiesService.getScriptProperties().getProperty(APP_IMAGE_DRIVE_FOLDER_PROPERTY);
    if (typeof folderId !== "string" || !/^[A-Za-z0-9_-]{20,}$/.test(folderId)) {
        throw appFault_("DRIVE_FOLDER_NOT_CONFIGURED", "A pasta privada de imagens ainda não foi configurada no Apps Script.");
    }
    try {
        var folder = DriveApp.getFolderById(folderId);
        if (!folder || String(folder.getId()) !== folderId || folder.getSharingAccess() !== DriveApp.Access.PRIVATE) {
            throw new Error("Folder is not private.");
        }
    } catch (error) {
        throw appFault_("DRIVE_FOLDER_NOT_PRIVATE", "A pasta raiz de imagens não está disponível ou não é privada.");
    }
    return folderId;
}

function appImageResponseHeader_(response, name) {
    var headers = response.getAllHeaders ? response.getAllHeaders() : {};
    var expected = String(name).toLowerCase();
    var keys = Object.keys(headers || {});
    for (var i = 0; i < keys.length; i += 1) {
        if (String(keys[i]).toLowerCase() === expected) return String(headers[keys[i]]);
    }
    return "";
}

function appImageDriveSessionUriIsValid_(value) {
    if (typeof value !== "string" || value.length > 2048) return false;

    // O Google pode devolver parâmetros adicionais, como "fields" e "session_crd".
    // A URL permanece restrita ao endpoint HTTPS oficial de upload do Drive.
    var match = /^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?([^#]+)$/i.exec(value);
    if (!match) return false;

    var parts = match[1].split("&");
    var uploadTypeCount = 0;
    var uploadIdCount = 0;

    for (var i = 0; i < parts.length; i += 1) {
        if (!parts[i]) return false;
        var separator = parts[i].indexOf("=");
        if (separator <= 0) return false;

        var key;
        var parameterValue;
        try {
            key = decodeURIComponent(parts[i].substring(0, separator).replace(/\+/g, "%20"));
            parameterValue = decodeURIComponent(parts[i].substring(separator + 1).replace(/\+/g, "%20"));
        } catch (error) {
            return false;
        }

        if (key === "uploadType") {
            uploadTypeCount += 1;
            if (parameterValue !== "resumable") return false;
        } else if (key === "upload_id") {
            uploadIdCount += 1;
            if (!/^[A-Za-z0-9_-]{1,512}$/.test(parameterValue)) return false;
        }
    }

    // Exige exatamente um tipo de upload e um identificador de sessão.
    return uploadTypeCount === 1 && uploadIdCount === 1;
}

function appImageDriveStartSession_(state, folderId) {
    var token = ScriptApp.getOAuthToken();
    if (typeof token !== "string" || !token) {
        throw appFault_("DRIVE_AUTH_UNAVAILABLE", "A autorização do Google Drive não está disponível.");
    }
    var filePrefix = String(state.kind || "service") === "profile" ? "conecta-profile-" : "conecta-service-";
    var resourceId = String(state.kind || "service") === "profile" ? String(state.profileId) : String(state.serviceId);
    var fileName = filePrefix + resourceId + "-" + String(state.uploadId) + "." + appImageExtension_(state.mimeType);
    var url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id%2Cname%2CmimeType%2Csize%2Cparents";
    var response;
    try {
        response = UrlFetchApp.fetch(url, {
            method: "post",
            contentType: "application/json; charset=UTF-8",
            headers: {
                Authorization: "Bearer " + token,
                "X-Upload-Content-Type": String(state.mimeType),
                "X-Upload-Content-Length": String(state.fileSize)
            },
            payload: JSON.stringify({
                name: fileName,
                mimeType: String(state.mimeType),
                parents: [String(folderId)]
            }),
            muteHttpExceptions: true,
            followRedirects: false
        });
    } catch (error) {
        throw appFault_("DRIVE_UPLOAD_START_FAILED", "Não foi possível iniciar a sessão de envio no Google Drive.");
    }
    var code = response.getResponseCode();
    var sessionUri = appImageResponseHeader_(response, "Location");
    if ((code !== 200 && code !== 201) || !appImageDriveSessionUriIsValid_(sessionUri)) {
        throw appFault_("DRIVE_UPLOAD_START_FAILED", "O Google Drive não confirmou a criação da sessão de envio.");
    }
    return sessionUri;
}

function appImageRequireUpload_(payload, nowMs) {
    var state = appImageReadUploadState_(String(payload.uploadId || ""));
    var session = appRequireProfessionalSession_(String(payload.tokenHash || ""), nowMs, true);
    if (String(state.userId) !== String(session.user.id_usuario)) {
        throw appFault_("IMAGE_UPLOAD_NOT_FOUND", "A sessão de envio não foi encontrada.");
    }
    var profile = appGetProfile_(String(session.user.id_usuario));
    if (!profile || String(state.profileId) !== String(profile.id_profissional)) {
        throw appFault_(String(state.kind || "service") === "profile" ? "PROFILE_PHOTO_NOT_FOUND" : "SERVICE_NOT_FOUND",
            String(state.kind || "service") === "profile" ? "Foto de perfil não encontrada." : "Serviço não encontrado.");
    }
    if (String(state.kind || "service") === "profile") {
        if (String(state.serviceId || "") !== "" || Number(state.order) !== 1) {
            throw appFault_("IMAGE_UPLOAD_STATE_INVALID", "O estado do envio de foto de perfil é inválido.");
        }
        return { state: state, service: null, profile: profile, user: session.user };
    }
    var service = appFind_("SERVICOS", "id_servico", String(state.serviceId));
    if (!service || String(service.id_profissional) !== String(profile.id_profissional)) {
        throw appFault_("SERVICE_NOT_FOUND", "Serviço não encontrado.");
    }
    if (state.status !== "completed" && ["suspended", "removed"].indexOf(String(service.status)) !== -1) {
        throw appFault_("SERVICE_STATE_LOCKED", "Este serviço não permite alteração de imagens.");
    }
    return { state: state, service: service, profile: profile, user: session.user };
}

function appImageGetDriveOffset_(state) {
    var token = ScriptApp.getOAuthToken();
    var response;
    try {
        response = UrlFetchApp.fetch(String(state.sessionUri), {
            method: "put",
            contentType: String(state.mimeType),
            headers: {
                Authorization: "Bearer " + token,
                "Content-Range": "bytes */" + String(state.fileSize)
            },
            payload: "",
            muteHttpExceptions: true,
            followRedirects: false
        });
    } catch (error) {
        throw appFault_("DRIVE_STATUS_UNAVAILABLE", "Não foi possível consultar o progresso confirmado pelo Google Drive.");
    }
    var code = response.getResponseCode();
    if (code === 308) {
        var range = appImageResponseHeader_(response, "Range");
        if (!range) return { completed: false, nextOffset: 0 };
        var match = range.match(/^bytes=0-(\d+)$/);
        if (!match) throw appFault_("DRIVE_STATUS_INVALID", "O Google Drive retornou um progresso inválido.");
        return { completed: false, nextOffset: Number(match[1]) + 1 };
    }
    if (code === 200 || code === 201) {
        var file = appImageParseDriveFile_(response);
        return { completed: true, file: file, nextOffset: Number(state.fileSize) };
    }
    if (code === 404 || code === 410) {
        throw appFault_("IMAGE_UPLOAD_EXPIRED", "A sessão de envio do Google Drive expirou.");
    }
    throw appFault_("DRIVE_STATUS_UNAVAILABLE", "O Google Drive não confirmou o estado do envio.");
}

function appImageParseDriveFile_(response) {
    var file;
    try { file = JSON.parse(response.getContentText()); } catch (error) {
        throw appFault_("DRIVE_FILE_METADATA_INVALID", "O Google Drive concluiu o envio sem retornar metadados válidos.");
    }
    if (!appIsPlainObject_(file) || typeof file.id !== "string" || !file.id
        || Number(file.size) <= 0 || !Array.isArray(file.parents)) {
        throw appFault_("DRIVE_FILE_METADATA_INVALID", "Os metadados do arquivo no Google Drive são inválidos.");
    }
    return file;
}

function appImageDrivePutChunk_(state, bytes, startOffset) {
    var endOffset = startOffset + bytes.length - 1;
    var token = ScriptApp.getOAuthToken();
    var response;
    try {
        response = UrlFetchApp.fetch(String(state.sessionUri), {
            method: "put",
            contentType: String(state.mimeType),
            headers: {
                Authorization: "Bearer " + token,
                "Content-Range": "bytes " + startOffset + "-" + endOffset + "/" + String(state.fileSize)
            },
            payload: bytes,
            muteHttpExceptions: true,
            followRedirects: false
        });
    } catch (error) {
        throw appFault_("DRIVE_CHUNK_TRANSPORT_FAILED", "A conexão com o Google Drive foi interrompida. Consulte o progresso antes de reenviar.");
    }
    var code = response.getResponseCode();
    if (code === 308) {
        var range = appImageResponseHeader_(response, "Range");
        if (!range) {
            throw appFault_("DRIVE_CHUNK_OFFSET_UNKNOWN", "O Google Drive não confirmou o intervalo recebido.");
        }
        var match = range.match(/^bytes=0-(\d+)$/);
        if (!match) throw appFault_("DRIVE_CHUNK_OFFSET_UNKNOWN", "O Google Drive não confirmou o intervalo recebido.");
        return { completed: false, nextOffset: Number(match[1]) + 1 };
    }
    if (code === 200 || code === 201) {
        return { completed: true, file: appImageParseDriveFile_(response), nextOffset: Number(state.fileSize) };
    }
    if (code === 404 || code === 410) {
        throw appFault_("IMAGE_UPLOAD_EXPIRED", "A sessão de envio do Google Drive expirou.");
    }
    throw appFault_("DRIVE_CHUNK_REJECTED", "O Google Drive recusou o bloco enviado.");
}

function appImageFinalizeUpload_(state, driveMetadata) {
    var folderId = String(state.folderId);
    if (!appIsPlainObject_(driveMetadata)
        || typeof driveMetadata.id !== "string"
        || !driveMetadata.id
        || String(driveMetadata.mimeType) !== String(state.mimeType)
        || Number(driveMetadata.size) !== Number(state.fileSize)
        || !Array.isArray(driveMetadata.parents)
        || driveMetadata.parents.indexOf(folderId) === -1) {
        try {
            if (driveMetadata && driveMetadata.id) {
                var invalidDriveFile = DriveApp.getFileById(String(driveMetadata.id));
                invalidDriveFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
                invalidDriveFile.setTrashed(true);
            }
        } catch (ignored) {}
        appImageDeleteUploadState_(state);
        throw appFault_("DRIVE_FILE_VALIDATION_FAILED", "O arquivo concluído no Google Drive não corresponde ao envio.");
    }

    if (String(state.kind || "service") === "profile") {
        return appImageFinalizeProfilePhotoUpload_(state, driveMetadata);
    }

    return appWithLock_(function () {
        var currentState = appImageReadUploadState_(String(state.uploadId));
        if (String(currentState.userId) !== String(state.userId) || String(currentState.serviceId) !== String(state.serviceId)) {
            throw appFault_("IMAGE_UPLOAD_NOT_FOUND", "A sessão de envio não foi encontrada.");
        }
        var service = appFind_("SERVICOS", "id_servico", String(currentState.serviceId));
        var profile = service ? appFind_("PROFISSIONAIS", "id_profissional", String(service.id_profissional)) : null;
        var user = profile ? appFind_("USUARIOS", "id_usuario", String(profile.id_usuario)) : null;
        if (!service || !profile || !user || String(user.id_usuario) !== String(currentState.userId)
            || String(profile.id_profissional) !== String(currentState.profileId)
            || ["suspended", "removed"].indexOf(String(service.status)) !== -1
            || String(user.status) !== "active") {
            throw appFault_("SERVICE_NOT_FOUND", "Serviço não encontrado ou não disponível para receber imagens.");
        }

        var rows = appRecords_("IMAGENS").filter(function (item) {
            return String(item.id_servico) === String(service.id_servico) && String(item.status) === "active";
        });
        if (rows.length >= 5 || rows.some(function (item) { return Number(item.ordem_exibicao) === Number(currentState.order); })) {
            throw appFault_("IMAGE_LIMIT_REACHED", "O serviço já atingiu o limite de imagens ativas.");
        }

        var driveFile;
        try {
            driveFile = DriveApp.getFileById(String(driveMetadata.id));
            driveFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
        } catch (error) {
            appImageDeleteUploadState_(currentState);
            throw appFault_("IMAGE_PERMISSION_SYNC_FAILED", "Não foi possível manter privada a imagem concluída no Google Drive.");
        }

        var nowIso = new Date().toISOString();
        var imageId = Utilities.getUuid();
        var imageRow;
        try {
            imageRow = appAppend_("IMAGENS", {
                id_imagem: imageId,
                id_profissional: "",
                id_servico: String(service.id_servico),
                id_arquivo_drive: String(driveFile.getId()),
                tipo_mime: String(currentState.mimeType),
                tamanho_bytes: Number(currentState.fileSize),
                ordem_exibicao: Number(currentState.order),
                status: "active",
                criado_em: nowIso,
                atualizado_em: nowIso
            });
            appAudit_(String(user.id_usuario), "user", "image.upload", "IMAGENS", imageId, "success", "Imagem de serviço enviada ao Drive.");
        } catch (error) {
            if (imageRow) {
                try {
                    appUpdate_("IMAGENS", imageRow, {
                        status: "removed",
                        atualizado_em: new Date().toISOString()
                    });
                } catch (ignored) {}
            }
            try {
                driveFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
                driveFile.setTrashed(true);
            } catch (ignored) {}
            appImageDeleteUploadState_(currentState);
            throw appFault_("IMAGE_METADATA_SAVE_FAILED", "O arquivo foi recebido, mas não foi possível registrar seus metadados. O arquivo foi restringido.");
        }

        if (String(service.status) === "published") {
            try {
                driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            } catch (error) {
                try {
                    driveFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
                    driveFile.setTrashed(true);
                } catch (ignored) {}
                try {
                    appUpdate_("IMAGENS", imageRow, {
                        status: "removed",
                        atualizado_em: new Date().toISOString()
                    });
                } catch (ignored) {}
                appImageDeleteUploadState_(currentState);
                throw appFault_("IMAGE_PERMISSION_SYNC_FAILED", "Não foi possível liberar a imagem. O arquivo foi restringido e o vínculo foi removido.");
            }
        }

        currentState.status = "completed";
        currentState.sessionUri = "";
        currentState.inFlight = false;
        currentState.inFlightAt = 0;
        currentState.nextOffset = Number(currentState.fileSize);
        currentState.completedImageId = imageId;
        currentState.completedDriveFileId = String(driveFile.getId());
        currentState.completedAt = nowIso;
        currentState.completedImage = {
            id: imageId,
            order: Number(currentState.order),
            mimeType: String(currentState.mimeType),
            sizeBytes: Number(currentState.fileSize),
            status: "active"
        };
        PropertiesService.getScriptProperties().deleteProperty(
            appImageServiceReservationKey_(String(currentState.serviceId))
        );
        appImageStoreUploadState_(currentState);
        return {
            completed: true,
            image: {
                id: imageId,
                order: Number(currentState.order),
                mimeType: String(currentState.mimeType),
                sizeBytes: Number(currentState.fileSize),
                status: "active",
                url: String(service.status) === "published"
                    ? appImagePublicUrl_(String(driveFile.getId()))
                    : null
            }
        };
    });
}


function appImageFinalizeProfilePhotoUpload_(state, driveMetadata) {
    return appWithLock_(function () {
        var currentState = appImageReadUploadState_(String(state.uploadId));
        var profile = appFind_("PROFISSIONAIS", "id_profissional", String(currentState.profileId));
        var user = profile ? appFind_("USUARIOS", "id_usuario", String(profile.id_usuario)) : null;
        if (String(currentState.kind || "") !== "profile"
            || !profile
            || !user
            || String(currentState.userId) !== String(user.id_usuario)
            || String(profile.id_profissional) !== String(currentState.profileId)
            || String(user.status) !== "active") {
            try {
                var rejectedFile = DriveApp.getFileById(String(driveMetadata.id));
                rejectedFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
                rejectedFile.setTrashed(true);
            } catch (ignored) {}
            appImageDeleteUploadState_(currentState);
            throw appFault_("PROFILE_PHOTO_NOT_FOUND", "A sessão de foto de perfil não está disponível.");
        }

        var imageRows = appRecords_("IMAGENS");
        var activeRows = imageRows.filter(function (item) {
            return String(item.id_profissional || "") === String(profile.id_profissional)
                && String(item.id_servico || "") === ""
                && String(item.status) === "active";
        });
        var driveFile;
        try {
            driveFile = DriveApp.getFileById(String(driveMetadata.id));
            driveFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
            if (driveFile.isTrashed && driveFile.isTrashed()) throw new Error("Arquivo removido.");
        } catch (error) {
            try {
                var rejectedDriveFile = DriveApp.getFileById(String(driveMetadata.id));
                rejectedDriveFile.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
                rejectedDriveFile.setTrashed(true);
            } catch (ignored) {}
            appImageDeleteUploadState_(currentState);
            throw appFault_("IMAGE_PERMISSION_SYNC_FAILED", "Não foi possível manter privada a nova foto no Google Drive.");
        }
        if (activeRows.length > 1) {
            try { driveFile.setTrashed(true); } catch (ignored) {}
            appImageDeleteUploadState_(currentState);
            throw appFault_("PROFILE_PHOTO_CONFLICT", "Há mais de uma foto de perfil ativa. Regularize os registros antes de substituir.");
        }

        var previous = activeRows[0] || null;
        var nowIso = new Date().toISOString();
        var imageId = Utilities.getUuid();
        var imageRow = 0;
        var previousRestricted = false;
        try {
            // A foto permanece privada no Drive; a leitura pública passa pelo gateway,
            // que revalida a conta ativa e nunca expõe o token OAuth ao navegador.
            if (previous) {
                appImageSetFilePrivate_(String(previous.id_arquivo_drive));
                previousRestricted = true;
                appUpdate_("IMAGENS", previous._row, {
                    status: "removed",
                    atualizado_em: nowIso
                });
            }

            imageRow = appAppend_("IMAGENS", {
                id_imagem: imageId,
                id_profissional: String(profile.id_profissional),
                id_servico: "",
                id_arquivo_drive: String(driveFile.getId()),
                tipo_mime: String(currentState.mimeType),
                tamanho_bytes: Number(currentState.fileSize),
                ordem_exibicao: 1,
                status: "active",
                criado_em: nowIso,
                atualizado_em: nowIso
            });

            appAudit_(
                String(user.id_usuario),
                "user",
                previous ? "profile.photo.replace" : "profile.photo.upload",
                "IMAGENS",
                imageId,
                "success",
                previous ? "Foto de perfil substituída; arquivo anterior restringido." : "Foto de perfil enviada ao Drive."
            );
        } catch (error) {
            if (imageRow) {
                try {
                    appUpdate_("IMAGENS", imageRow, {
                        status: "removed",
                        atualizado_em: new Date().toISOString()
                    });
                } catch (ignored) {}
            }
            try {
                appImageSetFilePrivate_(String(driveFile.getId()));
                driveFile.setTrashed(true);
            } catch (ignored) {}
            if (previous && previousRestricted) {
                try {
                    appImageSetFilePrivate_(String(previous.id_arquivo_drive));
                    appUpdate_("IMAGENS", previous._row, {
                        status: "active",
                        atualizado_em: new Date().toISOString()
                    });
                } catch (ignored) {}
            }
            appImageDeleteUploadState_(currentState);
            throw appFault_("IMAGE_METADATA_SAVE_FAILED", "Não foi possível registrar a nova foto de perfil. A foto anterior foi preservada quando possível.");
        }

        currentState.status = "completed";
        currentState.sessionUri = "";
        currentState.inFlight = false;
        currentState.inFlightAt = 0;
        currentState.nextOffset = Number(currentState.fileSize);
        currentState.completedImageId = imageId;
        currentState.completedDriveFileId = String(driveFile.getId());
        currentState.completedAt = nowIso;
        currentState.completedImage = {
            id: imageId,
            order: 1,
            mimeType: String(currentState.mimeType),
            sizeBytes: Number(currentState.fileSize),
            status: "active",
            url: appImageProxyUrl_(imageId)
        };
        PropertiesService.getScriptProperties().deleteProperty(
            appImageProfileReservationKey_(String(profile.id_profissional))
        );
        appImageStoreUploadState_(currentState);

        return {
            completed: true,
            image: currentState.completedImage
        };
    });
}

function appProfilePhotoUploadStart_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash", "fileSize", "mimeType"])) {
        throw appFault_("INVALID_INPUT", "Os dados para iniciar a foto de perfil estão incompletos.");
    }
    var fileSize = Number(payload.fileSize);
    var mimeType = String(payload.mimeType || "");
    if (!Number.isSafeInteger(fileSize) || fileSize < 12 || fileSize > APP_IMAGE_MAX_BYTES) {
        throw appFault_("IMAGE_SIZE_INVALID", "A foto deve ter entre 12 bytes e 5.000.000 bytes.");
    }
    if (!appImageMimeAllowed_(mimeType)) throw appFault_("IMAGE_MIME_INVALID", "Use uma foto JPG, PNG ou WebP.");

    var preflightSession = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, false);
    var preflightProfile = appGetProfile_(String(preflightSession.user.id_usuario));
    if (!preflightProfile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil profissional não está disponível.");

    appImageSheet_();
    var folderId = appImagePrivateFolderId_();
    var state = appWithLock_(function () {
        var session = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(session.user.id_usuario));
        if (!profile || String(session.user.status) !== "active") {
            throw appFault_("PROFILE_UNAVAILABLE", "O perfil profissional não está disponível.");
        }
        var properties = PropertiesService.getScriptProperties();
        var reservationKey = appImageProfileReservationKey_(String(profile.id_profissional));
        var existingUploadId = properties.getProperty(reservationKey);
        if (existingUploadId) {
            var existingRaw = properties.getProperty(appImageUploadKey_(String(existingUploadId)));
            var existing = null;
            try { existing = existingRaw ? JSON.parse(existingRaw) : null; } catch (ignored) {}
            if (existing && Number(existing.expiresAt) > nowMs) {
                throw appFault_("IMAGE_UPLOAD_IN_PROGRESS", "Já existe um envio de foto de perfil em andamento.");
            }
            properties.deleteProperty(appImageUploadKey_(String(existingUploadId)));
            properties.deleteProperty(reservationKey);
        }

        var uploadId = Utilities.getUuid();
        var createdAt = new Date(nowMs).toISOString();
        var nextState = {
            kind: "profile",
            uploadId: uploadId,
            userId: String(session.user.id_usuario),
            profileId: String(profile.id_profissional),
            serviceId: "",
            folderId: String(folderId),
            mimeType: mimeType,
            fileSize: fileSize,
            order: 1,
            sessionUri: "",
            nextOffset: 0,
            signatureValidated: false,
            inFlight: false,
            inFlightAt: 0,
            status: "creating",
            createdAt: createdAt,
            expiresAt: nowMs + APP_IMAGE_UPLOAD_TTL_MS
        };
        appImageStoreUploadState_(nextState);
        properties.setProperty(reservationKey, uploadId);
        return nextState;
    });

    try {
        state.sessionUri = appImageDriveStartSession_(state, folderId);
        state.status = "uploading";
        appWithLock_(function () { appImageStoreUploadState_(state); });
        return {
            uploadId: String(state.uploadId),
            order: 1,
            chunkSize: APP_IMAGE_CHUNK_BYTES,
            nextOffset: 0,
            expiresAt: Number(state.expiresAt)
        };
    } catch (error) {
        try { appImageDeleteUploadState_(state); } catch (ignored) {}
        throw error;
    }
}

function appImageUploadStart_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash", "serviceId", "fileSize", "mimeType"])) {
        throw appFault_("INVALID_INPUT", "Os dados para iniciar o envio estão incompletos.");
    }
    var fileSize = Number(payload.fileSize);
    var mimeType = String(payload.mimeType || "");
    if (!Number.isSafeInteger(fileSize) || fileSize < 12 || fileSize > APP_IMAGE_MAX_BYTES) {
        throw appFault_("IMAGE_SIZE_INVALID", "Cada imagem deve ter entre 12 bytes e 5.000.000 bytes.");
    }
    if (!appImageMimeAllowed_(mimeType)) throw appFault_("IMAGE_MIME_INVALID", "Use uma imagem JPG, PNG ou WebP.");

    var preflightSession = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, false);
    var preflightProfile = appGetProfile_(String(preflightSession.user.id_usuario));
    var preflightService = preflightProfile
        ? appFind_("SERVICOS", "id_servico", String(payload.serviceId))
        : null;
    if (!preflightProfile || !preflightService
        || String(preflightService.id_profissional) !== String(preflightProfile.id_profissional)) {
        throw appFault_("SERVICE_NOT_FOUND", "Serviço não encontrado.");
    }
    if (["suspended", "removed"].indexOf(String(preflightService.status)) !== -1) {
        throw appFault_("SERVICE_STATE_LOCKED", "Este serviço não permite imagens.");
    }

    appImageSheet_();
    var folderId = appImagePrivateFolderId_();

    var state = appWithLock_(function () {
        var session = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(session.user.id_usuario));
        var service = profile ? appFind_("SERVICOS", "id_servico", String(payload.serviceId)) : null;
        if (!profile || !service || String(service.id_profissional) !== String(profile.id_profissional)) {
            throw appFault_("SERVICE_NOT_FOUND", "Serviço não encontrado.");
        }
        if (["suspended", "removed"].indexOf(String(service.status)) !== -1) {
            throw appFault_("SERVICE_STATE_LOCKED", "Este serviço não permite imagens.");
        }

        var properties = PropertiesService.getScriptProperties();
        var reservationKey = appImageServiceReservationKey_(String(service.id_servico));
        var existingUploadId = properties.getProperty(reservationKey);
        if (existingUploadId) {
            var existingRaw = properties.getProperty(appImageUploadKey_(String(existingUploadId)));
            var existing = null;
            try { existing = existingRaw ? JSON.parse(existingRaw) : null; } catch (ignored) {}
            if (existing && Number(existing.expiresAt) > nowMs) {
                throw appFault_("IMAGE_UPLOAD_IN_PROGRESS", "Já existe um envio em andamento para este serviço.");
            }
            if (existingUploadId) properties.deleteProperty(appImageUploadKey_(String(existingUploadId)));
            properties.deleteProperty(reservationKey);
        }

        var activeRows = appRecords_("IMAGENS").filter(function (item) {
            return String(item.id_servico) === String(service.id_servico) && String(item.status) === "active";
        });
        if (activeRows.length >= 5) throw appFault_("IMAGE_LIMIT_REACHED", "O serviço já possui cinco imagens ativas.");
        var used = {};
        activeRows.forEach(function (item) { used[String(item.ordem_exibicao)] = true; });
        var order = 0;
        for (var candidate = 1; candidate <= 5; candidate += 1) {
            if (!used[String(candidate)]) { order = candidate; break; }
        }
        if (!order) throw appFault_("IMAGE_LIMIT_REACHED", "Não há posição disponível para outra imagem.");

        var uploadId = Utilities.getUuid();
        var createdAt = new Date(nowMs).toISOString();
        var nextState = {
            uploadId: uploadId,
            userId: String(session.user.id_usuario),
            profileId: String(profile.id_profissional),
            serviceId: String(service.id_servico),
            folderId: String(folderId),
            mimeType: mimeType,
            fileSize: fileSize,
            order: order,
            sessionUri: "",
            nextOffset: 0,
            signatureValidated: false,
            inFlight: false,
            inFlightAt: 0,
            status: "creating",
            createdAt: createdAt,
            expiresAt: nowMs + APP_IMAGE_UPLOAD_TTL_MS
        };
        appImageStoreUploadState_(nextState);
        properties.setProperty(reservationKey, uploadId);
        return nextState;
    });

    try {
        state.sessionUri = appImageDriveStartSession_(state, folderId);
        state.status = "uploading";
        appWithLock_(function () {
            appImageStoreUploadState_(state);
        });
        return {
            uploadId: String(state.uploadId),
            order: Number(state.order),
            chunkSize: APP_IMAGE_CHUNK_BYTES,
            nextOffset: 0,
            expiresAt: Number(state.expiresAt)
        };
    } catch (error) {
        try { appImageDeleteUploadState_(state); } catch (ignored) {}
        throw error;
    }
}

function appImageUploadChunk_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash", "uploadId", "startOffset", "totalSize", "chunkBase64"])) {
        throw appFault_("INVALID_INPUT", "O bloco de imagem está incompleto.");
    }
    var startOffset = Number(payload.startOffset);
    var totalSize = Number(payload.totalSize);
    var base64 = String(payload.chunkBase64 || "");
    if (!Number.isSafeInteger(startOffset) || !Number.isSafeInteger(totalSize)
        || startOffset < 0 || totalSize < 12 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
        throw appFault_("IMAGE_CHUNK_INVALID", "O bloco de imagem é inválido.");
    }
    var bytes;
    try { bytes = Utilities.base64Decode(base64); } catch (error) {
        throw appFault_("IMAGE_CHUNK_INVALID", "O bloco de imagem não contém Base64 válido.");
    }
    if (!Array.isArray(bytes) || bytes.length < 1 || bytes.length > APP_IMAGE_CHUNK_BYTES) {
        throw appFault_("IMAGE_CHUNK_INVALID", "O tamanho do bloco de imagem é inválido.");
    }

    var state = appWithLock_(function () {
        var authorized = appImageRequireUpload_(payload, nowMs);
        var current = authorized.state;
        if (Number(current.fileSize) !== totalSize || Number(current.nextOffset) !== startOffset) {
            throw appFault_("IMAGE_UPLOAD_OFFSET_MISMATCH", "O bloco não corresponde à próxima posição confirmada. Consulte o progresso do envio.");
        }
        if (current.status !== "uploading" || !current.sessionUri) {
            throw appFault_("IMAGE_UPLOAD_STATE_INVALID", "A sessão de envio não está pronta para receber blocos.");
        }
        var expectedLength = Math.min(APP_IMAGE_CHUNK_BYTES, totalSize - startOffset);
        if (bytes.length !== expectedLength) {
            throw appFault_("IMAGE_CHUNK_INVALID", "O bloco deve ter 1 MiB, exceto o último bloco do arquivo.");
        }
        if (startOffset === 0 && !current.signatureValidated) {
            if (!appImageSignatureMatches_(bytes, String(current.mimeType))) {
                throw appFault_("IMAGE_CONTENT_INVALID", "O conteúdo do arquivo não corresponde ao formato declarado.");
            }
            current.signatureValidated = true;
        }
        if (current.inFlight && nowMs - Number(current.inFlightAt || 0) < APP_IMAGE_IN_FLIGHT_STALE_MS) {
            throw appFault_("IMAGE_UPLOAD_BUSY", "Já existe um bloco sendo processado para este envio.");
        }
        current.inFlight = true;
        current.inFlightAt = nowMs;
        appImageStoreUploadState_(current);
        return current;
    });

    var driveResult;
    try {
        driveResult = appImageDrivePutChunk_(state, bytes, startOffset);
    } catch (error) {
        try {
            appWithLock_(function () {
                var latest = appImageReadUploadState_(String(state.uploadId));
                latest.inFlight = false;
                latest.inFlightAt = 0;
                appImageStoreUploadState_(latest);
            });
        } catch (ignored) {}
        throw error;
    }

    if (driveResult.completed) {
        return appImageFinalizeUpload_(state, driveResult.file);
    }

    appWithLock_(function () {
        var latest = appImageReadUploadState_(String(state.uploadId));
        latest.nextOffset = Number(driveResult.nextOffset);
        latest.inFlight = false;
        latest.inFlightAt = 0;
        latest.lastActivityAt = nowMs;
        appImageStoreUploadState_(latest);
    });
    return {
        completed: false,
        uploadId: String(state.uploadId),
        nextOffset: Number(driveResult.nextOffset),
        totalSize: Number(state.fileSize)
    };
}

function appImageUploadStatus_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash", "uploadId"])) {
        throw appFault_("INVALID_INPUT", "Informe a sessão de envio.");
    }
    var authorized = appWithLock_(function () {
        var result = appImageRequireUpload_(payload, nowMs);
        var current = result.state;
        if (current.status === "completed") return result;
        if (current.inFlight && nowMs - Number(current.inFlightAt || 0) < APP_IMAGE_IN_FLIGHT_STALE_MS) {
            throw appFault_("IMAGE_UPLOAD_BUSY", "O envio ainda está sendo processado. Consulte novamente em instantes.");
        }
        current.inFlight = true;
        current.inFlightAt = nowMs;
        appImageStoreUploadState_(current);
        return result;
    });

    if (authorized.state.status === "completed") {
        var completedImage = appFind_("IMAGENS", "id_imagem", String(authorized.state.completedImageId || ""));
        if (!completedImage) throw appFault_("IMAGE_UPLOAD_STATE_INVALID", "O recibo de conclusão não corresponde a uma imagem registrada.");
        var imageIsPublic = String(completedImage.status) === "active"
            && String(authorized.user.status) === "active";
        if (String(authorized.state.kind || "service") !== "profile") {
            imageIsPublic = imageIsPublic && authorized.service && String(authorized.service.status) === "published";
        }
        return {
            completed: true,
            image: {
                id: String(completedImage.id_imagem),
                order: Number(completedImage.ordem_exibicao),
                mimeType: String(completedImage.tipo_mime),
                sizeBytes: Number(completedImage.tamanho_bytes),
                status: String(completedImage.status),
                url: imageIsPublic
                    ? (String(authorized.state.kind || "service") === "profile"
                        ? appImageProxyUrl_(String(completedImage.id_imagem))
                        : appImagePublicUrl_(String(completedImage.id_arquivo_drive)))
                    : null
            }
        };
    }
    var state = authorized.state;

    var result;
    try {
        result = appImageGetDriveOffset_(state);
    } catch (error) {
        try {
            appWithLock_(function () {
                var latest = appImageReadUploadState_(String(state.uploadId));
                latest.inFlight = false;
                latest.inFlightAt = 0;
                appImageStoreUploadState_(latest);
            });
        } catch (ignored) {}
        throw error;
    }

    if (result.completed) return appImageFinalizeUpload_(state, result.file);

    appWithLock_(function () {
        var latest = appImageReadUploadState_(String(state.uploadId));
        latest.nextOffset = Number(result.nextOffset);
        latest.inFlight = false;
        latest.inFlightAt = 0;
        latest.lastActivityAt = nowMs;
        appImageStoreUploadState_(latest);
    });
    return {
        completed: false,
        uploadId: String(state.uploadId),
        nextOffset: Number(result.nextOffset),
        totalSize: Number(state.fileSize)
    };
}

function appImageUploadCancel_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash", "uploadId"])) {
        throw appFault_("INVALID_INPUT", "Informe a sessão de envio.");
    }
    return appWithLock_(function () {
        var authorized = appImageRequireUpload_(payload, nowMs);
        if (authorized.state.status === "completed") {
            return { cancelled: false, completed: true };
        }
        if (authorized.state.inFlight && nowMs - Number(authorized.state.inFlightAt || 0) < APP_IMAGE_IN_FLIGHT_STALE_MS) {
            throw appFault_("IMAGE_UPLOAD_BUSY", "Aguarde o bloco em andamento antes de cancelar.");
        }
        appImageDeleteUploadState_(authorized.state);
        return { cancelled: true };
    });
}

function appImageSetFilePrivate_(fileId) {
    try {
        DriveApp.getFileById(String(fileId)).setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW);
    } catch (error) {
        throw appFault_("IMAGE_PERMISSION_SYNC_FAILED", "Não foi possível restringir o acesso da imagem no Google Drive.");
    }
}

function appImageSetFilePublic_(fileId) {
    try {
        DriveApp.getFileById(String(fileId)).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (error) {
        throw appFault_("IMAGE_PERMISSION_SYNC_FAILED", "Não foi possível liberar a visualização da imagem no Google Drive.");
    }
}

function appSetServiceImagesVisibility_(serviceId, publicAccess) {
    var images = appRecords_("IMAGENS").filter(function (item) {
        return String(item.id_servico) === String(serviceId) && String(item.status) === "active";
    });
    var failedCount = 0;
    images.forEach(function (image) {
        try {
            if (publicAccess) appImageSetFilePublic_(String(image.id_arquivo_drive));
            else appImageSetFilePrivate_(String(image.id_arquivo_drive));
        } catch (error) {
            failedCount += 1;
        }
    });
    if (failedCount > 0) {
        throw appFault_(
            "IMAGE_PERMISSION_SYNC_FAILED",
            "Não foi possível atualizar a permissão de todas as imagens do serviço."
        );
    }
}

function appImagePublicUrl_(fileId) {
    return "https://drive.google.com/uc?export=view&id=" + encodeURIComponent(String(fileId));
}

function appGetServiceImages_(serviceId, publicAccess) {
    return appRecords_("IMAGENS")
        .filter(function (item) {
            return String(item.id_servico) === String(serviceId) && String(item.status) === "active";
        })
        .sort(function (left, right) { return Number(left.ordem_exibicao) - Number(right.ordem_exibicao); })
        .map(function (item) {
            return {
                id: String(item.id_imagem),
                order: Number(item.ordem_exibicao),
                mimeType: String(item.tipo_mime),
                sizeBytes: Number(item.tamanho_bytes),
                status: String(item.status),
                url: publicAccess ? appImagePublicUrl_(String(item.id_arquivo_drive)) : null
            };
        });
}


// Esta ação só é chamada pelo gateway Vercel assinado por HMAC.
// O token OAuth do Apps Script nunca é enviado ao navegador.
function appResolvePublicImage_(payload) {
    if (!appHasKeys_(payload, ["imageId"])) {
        throw appFault_("INVALID_INPUT", "Informe a imagem solicitada.");
    }

    var imageId = String(payload.imageId || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(imageId)) {
        throw appFault_("IMAGE_NOT_FOUND", "Imagem não encontrada.");
    }

    var image = appFind_("IMAGENS", "id_imagem", imageId);
    if (!image || String(image.status) !== "active") {
        throw appFault_("IMAGE_NOT_FOUND", "Imagem não encontrada ou indisponível.");
    }

    var serviceId = String(image.id_servico || "");
    var profileId = String(image.id_profissional || "");
    if ((serviceId === "" && profileId === "") || (serviceId !== "" && profileId !== "")) {
        throw appFault_("IMAGE_NOT_FOUND", "Imagem não encontrada ou indisponível.");
    }

    var profile;
    var user;
    if (profileId !== "") {
        profile = appFind_("PROFISSIONAIS", "id_profissional", profileId);
        user = profile ? appFind_("USUARIOS", "id_usuario", String(profile.id_usuario || "")) : null;
        var activeProfilePhoto = profile ? appGetProfilePhoto_(profileId) : null;
        if (!profile || !user || String(user.status) !== "active"
            || !activeProfilePhoto
            || String(activeProfilePhoto.id_imagem) !== imageId
            || Number(image.ordem_exibicao) !== 1) {
            throw appFault_("IMAGE_NOT_FOUND", "Imagem não encontrada ou indisponível.");
        }
    } else {
        var service = appFind_("SERVICOS", "id_servico", serviceId);
        profile = service
            ? appFind_("PROFISSIONAIS", "id_profissional", String(service.id_profissional || ""))
            : null;
        user = profile
            ? appFind_("USUARIOS", "id_usuario", String(profile.id_usuario || ""))
            : null;
        var category = service
            ? appFind_("CATEGORIAS", "id_categoria", String(service.id_categoria || ""))
            : null;
        if (!service || String(service.status) !== "published" || !profile || !user
            || String(user.status) !== "active" || !category) {
            throw appFault_("IMAGE_NOT_FOUND", "Imagem não encontrada ou indisponível.");
        }
    }

    var fileId = String(image.id_arquivo_drive || "");
    if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) {
        throw appFault_("IMAGE_NOT_FOUND", "Imagem não encontrada ou indisponível.");
    }

    var file;
    try {
        file = DriveApp.getFileById(fileId);
        if (file.isTrashed()) throw new Error("Arquivo removido.");
    } catch (error) {
        throw appFault_("IMAGE_NOT_FOUND", "Imagem não encontrada ou indisponível.");
    }

    var mimeType = String(file.getMimeType() || "").toLowerCase();
    var sizeBytes = Number(file.getSize());
    if (!appImageMimeAllowed_(mimeType)
        || mimeType !== String(image.tipo_mime || "").toLowerCase()
        || !Number.isSafeInteger(sizeBytes) || sizeBytes < 12 || sizeBytes > APP_IMAGE_MAX_BYTES
        || sizeBytes !== Number(image.tamanho_bytes)) {
        throw appFault_("IMAGE_NOT_FOUND", "Imagem não encontrada ou indisponível.");
    }

    var accessToken;
    try {
        accessToken = ScriptApp.getOAuthToken();
    } catch (error) {
        throw appFault_("DRIVE_AUTH_UNAVAILABLE", "A autorização de leitura do Google Drive não está disponível.");
    }
    if (typeof accessToken !== "string" || accessToken.length < 32) {
        throw appFault_("DRIVE_AUTH_UNAVAILABLE", "A autorização de leitura do Google Drive não está disponível.");
    }

    return {
        fileId: fileId,
        mimeType: mimeType,
        sizeBytes: sizeBytes,
        accessToken: accessToken
    };
}


function appProfilePhotoRemove_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash", "imageId"])) {
        throw appFault_("INVALID_INPUT", "Informe a foto de perfil que deseja remover.");
    }
    return appWithLock_(function () {
        var session = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(session.user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil profissional não está disponível.");
        var image = appFind_("IMAGENS", "id_imagem", String(payload.imageId));
        if (!image
            || String(image.id_profissional || "") !== String(profile.id_profissional)
            || String(image.id_servico || "") !== "") {
            throw appFault_("PROFILE_PHOTO_NOT_FOUND", "Foto de perfil não encontrada.");
        }
        appImageSetFilePrivate_(String(image.id_arquivo_drive));
        if (String(image.status) === "removed") {
            return { removed: true, imageId: String(image.id_imagem), alreadyRemoved: true };
        }
        appUpdate_("IMAGENS", image._row, {
            status: "removed",
            atualizado_em: new Date(nowMs).toISOString()
        });
        appAudit_(String(session.user.id_usuario), "user", "profile.photo.remove", "IMAGENS", String(image.id_imagem), "success", "Foto de perfil removida e acesso restringido.");
        return { removed: true, imageId: String(image.id_imagem) };
    });
}

function appImageRemove_(payload, nowMs) {
    if (!appHasKeys_(payload, ["tokenHash", "imageId"])) {
        throw appFault_("INVALID_INPUT", "Informe a imagem que deseja remover.");
    }
    return appWithLock_(function () {
        var session = appRequireProfessionalSession_(String(payload.tokenHash), nowMs, true);
        var profile = appGetProfile_(String(session.user.id_usuario));
        if (!profile) throw appFault_("PROFILE_UNAVAILABLE", "O perfil não está disponível.");
        var image = appFind_("IMAGENS", "id_imagem", String(payload.imageId));
        if (!image || String(image.id_profissional || "") !== ""
            || String(image.id_servico || "") === "") {
            throw appFault_("IMAGE_NOT_FOUND", "Imagem não encontrada.");
        }
        var service = appFind_("SERVICOS", "id_servico", String(image.id_servico));
        if (!service || String(service.id_profissional) !== String(profile.id_profissional)) {
            throw appFault_("IMAGE_NOT_FOUND", "Imagem não encontrada.");
        }
        appImageSetFilePrivate_(String(image.id_arquivo_drive));
        if (String(image.status) === "removed") {
            return { removed: true, imageId: String(image.id_imagem), alreadyRemoved: true };
        }
        appUpdate_("IMAGENS", image._row, {
            status: "removed",
            atualizado_em: new Date(nowMs).toISOString()
        });
        appAudit_(String(session.user.id_usuario), "user", "image.remove", "IMAGENS", String(image.id_imagem), "success", "Imagem removida logicamente e acesso restringido.");
        return { removed: true, imageId: String(image.id_imagem) };
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
    if (digits.length === 10 || digits.length === 11) {
        digits = "55" + digits;
    }
    if (!/^55\d{10,11}$/.test(digits)) {
        throw appFault_("INVALID_PHONE", "Informe um WhatsApp brasileiro com DDD e número.");
    }
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

function appEmailChangeVerificationHmac_(secret, userId, email, code) {
    var message = ["CONECTA_LOCAL_EMAIL_CHANGE_V1", userId, email, code].join("\n");
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
