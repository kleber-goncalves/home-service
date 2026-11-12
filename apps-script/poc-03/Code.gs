/**
 * Conecta Local — POC-03 (EXPERIMENTO ISOLADO)
 *
 * Objetivo:
 * - verificar PBKDF2-HMAC-SHA-256 com a primitiva oficial
 *   Utilities.computeHmacSha256Signature;
 * - conferir vetores de referência;
 * - medir o custo no runtime V8 real do Apps Script.
 *
 * SEGURANÇA:
 * - NÃO é implementação de autenticação.
 * - NÃO armazenar contas, senhas, salts, tokens ou sessões.
 * - NÃO publicar como Web App. Não há doGet/doPost.
 * - NÃO copiar este código experimental para o sistema de negócio.
 * - Vetores corretos não equivalem a auditoria criptográfica.
 */

var POC03_HMAC_SHA256_BYTES = 32;
var POC03_RFC_80000_ITERATIONS = 80000;
var POC03_TARGET_ITERATIONS = 600000;
var POC03_MAX_BENCHMARK_MS = 180000;
var POC03_ARGON2_RECORD_ALGORITHM = "argon2id$v=19$m=19456,t=2,p=1";
var POC03_ARGON2_RECORD_MEMORY_KIB = 19456;
var POC03_ARGON2_RECORD_ITERATIONS = 2;
var POC03_ARGON2_RECORD_PARALLELISM = 1;
var POC03_ARGON2_RECORD_HASH_BYTES = 32;
var POC03_PASSWORD_MIN_CODE_POINTS = 15;
var POC03_PASSWORD_MAX_CODE_POINTS = 128;
var POC03_PASSWORD_MAX_UTF8_BYTES = 512;
var POC03_LOGIN_FAILURE_LIMIT = 5;
var POC03_LOGIN_WINDOW_MS = 15 * 60 * 1000;
var POC03_LOGIN_LOCK_MS = 15 * 60 * 1000;


/**
 * Testes rápidos de compatibilidade:
 * - vetor RFC 7914 (1 iteração);
 * - senha UTF-8 com acentos/emoji (2 iterações);
 * - senha de 80 bytes (chave HMAC maior que o bloco SHA-256).
 *
 * Os dois últimos vetores foram calculados com implementação
 * PBKDF2-HMAC-SHA-256 independente usando UTF-8.
 */
function poc03RunKnownAnswerTests() {
    var tests = [
        {
            name: "RFC 7914 — c=1, dkLen=64",
            password: "passwd",
            salt: "salt",
            iterations: 1,
            length: 64,
            expected: "55ac046e56e3089fec1691c22544b605"
                + "f94185216dde0465e68b9d57c20dacbc"
                + "49ca9cccf179b645991664b39d77ef31"
                + "7c71b845b1e30bd509112041d3a19783"
        },
        {
            name: "UTF-8 com acentos e emoji — c=2, dkLen=32",
            password: "Senha com acentuação 🔐",
            salt: "sal-çã-🙂",
            iterations: 2,
            length: 32,
            expected: "59d26f0530a57adbdcd9d4ccfedbc6a3"
                + "b8c37180453b2d3349c1594a606e3ddb"
        },
        {
            name: "senha de 80 bytes — c=2, dkLen=32",
            password: new Array(81).join("P"),
            salt: "salt-long-key",
            iterations: 2,
            length: 32,
            expected: "d768929eda12d53077f456ce9420b924"
                + "a8646ae98d9d1de7c00e6ab28a76c757"
        }
    ];

    var failures = [];

    tests.forEach(function (test) {
        var actual = pbkdf2HmacSha256ForPoc_(
            utf8BytesForPoc_(test.password),
            utf8BytesForPoc_(test.salt),
            test.iterations,
            test.length
        );
        var actualHex = bytesToHexForPoc_(actual);

        if (actualHex !== test.expected) {
            failures.push(test.name);
            Logger.log("FAIL: " + test.name);
        } else {
            Logger.log("PASS: " + test.name);
        }
    });

    if (failures.length > 0) {
        throw new Error(
            "POC-03: " + failures.length + " vetor(es) falharam: "
            + failures.join(", ")
        );
    }

    Logger.log("POC-03: todos os vetores rápidos passaram.");
}

/**
 * Vetor PBKDF2-HMAC-SHA-256 da RFC 7914, seção 11:
 * P="Password", S="NaCl", c=80000, dkLen=64.
 *
 * Limite de três minutos para não consumir toda a janela máxima
 * de execução do Apps Script.
 */
function poc03RunRfc80000Vector() {
    var startedAt = Date.now();
    var deadline = startedAt + POC03_MAX_BENCHMARK_MS;
    var expected = "4ddcd8f60b98be21830cee5ef22701f9"
        + "641a4418d04c0414aeff08876b34ab56"
        + "a1d425a1225833549adb841b51c9b317"
        + "6a272bdebba1d078478f62b397f33c8d";
    var actual;

    try {
        actual = pbkdf2HmacSha256ForPoc_(
            utf8BytesForPoc_("Password"),
            utf8BytesForPoc_("NaCl"),
            POC03_RFC_80000_ITERATIONS,
            64,
            deadline
        );
    } catch (error) {
        Logger.log(JSON.stringify({
            test: "RFC 7914 c=80000",
            status: "INTERRUPTED_OR_FAILED",
            elapsedMs: Date.now() - startedAt,
            message: String(error && error.message ? error.message : error)
        }));
        throw error;
    }

    var elapsedMs = Date.now() - startedAt;
    var passed = bytesToHexForPoc_(actual) === expected;

    Logger.log(JSON.stringify({
        test: "RFC 7914 c=80000",
        status: passed ? "PASS" : "FAIL",
        iterations: POC03_RFC_80000_ITERATIONS,
        derivedKeyBytes: 64,
        elapsedMs: elapsedMs
    }));

    if (!passed) {
        throw new Error("O vetor RFC 7914 de 80.000 iterações não corresponde.");
    }
}

/**
 * Mede uma derivação de 600.000 iterações com chave derivada de 32 bytes.
 * Não registra o hash nem qualquer segredo. Interrompe após três minutos.
 */
function poc03Benchmark600k() {
    var startedAt = Date.now();
    var deadline = startedAt + POC03_MAX_BENCHMARK_MS;
    var iterationsCompleted = 0;

    try {
        pbkdf2HmacSha256ForPoc_(
            utf8BytesForPoc_("POC03-only-dummy-password"),
            utf8BytesForPoc_("POC03-only-dummy-salt"),
            POC03_TARGET_ITERATIONS,
            32,
            deadline,
            function (completed) {
                iterationsCompleted = completed;
            }
        );

        Logger.log(JSON.stringify({
            test: "PBKDF2-HMAC-SHA-256 benchmark",
            status: "COMPLETED",
            iterations: POC03_TARGET_ITERATIONS,
            derivedKeyBytes: 32,
            elapsedMs: Date.now() - startedAt
        }));
    } catch (error) {
        Logger.log(JSON.stringify({
            test: "PBKDF2-HMAC-SHA-256 benchmark",
            status: "STOPPED",
            targetIterations: POC03_TARGET_ITERATIONS,
            iterationsCompleted: iterationsCompleted,
            elapsedMs: Date.now() - startedAt,
            message: String(error && error.message ? error.message : error)
        }));
        throw error;
    }
}

/**
 * Verifica se o runtime real suporta WebAssembly e reserva a memória mínima
 * recomendada pela OWASP para Argon2id (19 MiB).
 *
 * Esta função NÃO executa Argon2id; apenas testa capacidades do runtime.
 */
function poc03ProbeWebAssembly() {
    if (
        typeof WebAssembly !== "object"
        || typeof WebAssembly.Module !== "function"
        || typeof WebAssembly.Instance !== "function"
        || typeof WebAssembly.Memory !== "function"
    ) {
        throw new Error("WebAssembly não está totalmente disponível neste runtime.");
    }

    // Módulo mínimo que exporta answer() e retorna 42.
    var wasmBytes = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7f,
        0x03, 0x02, 0x01, 0x00,
        0x07, 0x0a, 0x01, 0x06, 0x61, 0x6e, 0x73, 0x77,
        0x65, 0x72, 0x00, 0x00,
        0x0a, 0x06, 0x01, 0x04, 0x00, 0x41, 0x2a, 0x0b
    ]);

    var compileStartedAt = Date.now();
    var wasmModule = new WebAssembly.Module(wasmBytes);
    var wasmInstance = new WebAssembly.Instance(wasmModule);
    var answer = wasmInstance.exports.answer();
    var compileElapsedMs = Date.now() - compileStartedAt;

    if (answer !== 42) {
        throw new Error("O módulo WebAssembly mínimo não retornou 42.");
    }

    // Argon2id: 19 MiB = 304 páginas WebAssembly de 64 KiB.
    var memoryStartedAt = Date.now();
    var memory = new WebAssembly.Memory({
        initial: 304,
        maximum: 304
    });
    var memoryBytes = memory.buffer.byteLength;
    var memoryElapsedMs = Date.now() - memoryStartedAt;

    if (memoryBytes !== 19 * 1024 * 1024) {
        throw new Error("O runtime não reservou exatamente 19 MiB de memória WASM.");
    }

    Logger.log(JSON.stringify({
        test: "Apps Script WebAssembly capability probe",
        status: "PASS",
        wasmFunctionResult: answer,
        wasmModuleCompileAndRunMs: compileElapsedMs,
        argon2idMinimumMemoryBytes: memoryBytes,
        argon2idMinimumMemoryMiB: memoryBytes / (1024 * 1024),
        memoryAllocationMs: memoryElapsedMs
    }));

    return {
        wasmAvailable: true,
        functionResult: answer,
        memoryBytes: memoryBytes
    };
}

/**
 * Implementação experimental de PBKDF2 (RFC 8018), usada somente no harness.
 * A PRF é HMAC-SHA-256 provida pelo serviço Utilities do Google.
 *
 * Não possui aprovação de segurança, hardening operacional ou revisão
 * independente. Não usar para autenticação ou persistência de contas.
 */
function pbkdf2HmacSha256ForPoc_(
    passwordBytes,
    saltBytes,
    iterations,
    derivedKeyLength,
    deadlineMs,
    progressCallback
) {
    if (!Array.isArray(passwordBytes) || !Array.isArray(saltBytes)) {
        throw new Error("PBKDF2 POC: passwordBytes e saltBytes devem ser arrays.");
    }

    if (
        !Number.isSafeInteger(iterations)
        || iterations < 1
        || !Number.isSafeInteger(derivedKeyLength)
        || derivedKeyLength < 1
        || derivedKeyLength > 1024
    ) {
        throw new Error("PBKDF2 POC: parâmetros fora dos limites do harness.");
    }

    var blockCount = Math.ceil(
        derivedKeyLength / POC03_HMAC_SHA256_BYTES
    );
    var derived = [];
    var completed = 0;

    for (var blockIndex = 1; blockIndex <= blockCount; blockIndex += 1) {
        var blockInput = concatBytesForPoc_(
            saltBytes,
            [
                (blockIndex >>> 24) & 0xff,
                (blockIndex >>> 16) & 0xff,
                (blockIndex >>> 8) & 0xff,
                blockIndex & 0xff
            ].map(toSignedByteForPoc_)
        );

        var u = Utilities.computeHmacSha256Signature(
            blockInput,
            passwordBytes
        );
        var t = u.slice();

        completed += 1;

        for (var iteration = 2; iteration <= iterations; iteration += 1) {
            if (
                deadlineMs
                && iteration % 256 === 0
                && Date.now() >= deadlineMs
            ) {
                if (typeof progressCallback === "function") {
                    progressCallback(completed);
                }
                throw new Error(
                    "Limite preventivo de três minutos atingido antes de concluir."
                );
            }

            u = Utilities.computeHmacSha256Signature(
                u,
                passwordBytes
            );

            for (var byteIndex = 0; byteIndex < t.length; byteIndex += 1) {
                t[byteIndex] = toSignedByteForPoc_(
                    (t[byteIndex] & 0xff) ^ (u[byteIndex] & 0xff)
                );
            }

            completed += 1;
        }

        derived = derived.concat(t);

        if (typeof progressCallback === "function") {
            progressCallback(completed);
        }
    }

    return derived.slice(0, derivedKeyLength);
}

function utf8BytesForPoc_(value) {
    return Utilities.newBlob(
        String(value),
        "text/plain",
        "poc03-test-input.txt"
    ).getBytes();
}

function concatBytesForPoc_(left, right) {
    return left.concat(right).map(toSignedByteForPoc_);
}

function toSignedByteForPoc_(value) {
    var unsigned = Number(value) & 0xff;
    return unsigned > 127 ? unsigned - 256 : unsigned;
}

function bytesToHexForPoc_(bytes) {
    return bytes.map(function (value) {
        var hex = (value & 0xff).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}

// -----------------------------------------------------------------------------
// Argon2id WASM — experimento isolado (hash-wasm 4.13.0)
// -----------------------------------------------------------------------------

/**
 * Executa dois vetores conhecidos de Argon2id v1.3:
 * 1) vetor pequeno, com paralelismo 4, para validar a implementação;
 * 2) perfil OWASP m=19456 KiB, t=2, p=1, para medir o runtime real.
 *
 * Requer o arquivo separado HashWasmArgon2.gs com o bundle UMD oficial
 * hash-wasm 4.13.0. Os inputs são fictícios e os salts são determinísticos
 * porque estes são testes conhecidos, não cadastro de contas.
 *
 * IMPORTANTE:
 * - Não é fluxo de autenticação e não armazena senhas.
 * - A opção secret é passada como Uint8Array vazio. A biblioteca, por padrão,
 *   tenta codificar secret="" com TextEncoder, API ausente no Apps Script.
 * - A senha e o salt também são Uint8Array para evitar TextEncoder.
 * - O resultado não é registrado no log; somente comparação PASS/FAIL.
 */
async function poc03RunArgon2idTests() {
    var suiteStartedAt = Date.now();
    var results = [];

    try {
        if (
            typeof hashwasm !== "object"
            || hashwasm === null
            || typeof hashwasm.argon2id !== "function"
        ) {
            throw new Error(
                "Biblioteca não carregada. Adicione o bundle em HashWasmArgon2.gs."
            );
        }

        var smallPassword = new Uint8Array(32);
        smallPassword.fill(1);
        var smallSalt = new Uint8Array(16);
        smallSalt.fill(2);

        var testCases = [
            {
                name: "KAT independente — Argon2id v1.3 (m=32 KiB,t=3,p=4)",
                password: smallPassword,
                salt: smallSalt,
                memorySize: 32,
                iterations: 3,
                parallelism: 4,
                expectedHex:
                    "03aab965c12001c9d7d0d2de33192c0494b684bb148196d73c1df1acaf6d0c2e"
            },
            {
                name: "Perfil OWASP — Argon2id v1.3 (m=19456 KiB,t=2,p=1)",
                password: poc03Utf8BytesForArgon2_("Conecta Local POC Argon2id test"),
                salt: poc03HexToBytesForArgon2_(
                    "00112233445566778899aabbccddeeff"
                ),
                memorySize: 19456,
                iterations: 2,
                parallelism: 1,
                expectedHex:
                    "e68ff93eaa19dc2c1721cc50614468011e94c113d2b5888d0c3c3976ff5497c4"
            }
        ];

        for (var i = 0; i < testCases.length; i += 1) {
            var testCase = testCases[i];
            var startedAt = Date.now();

            var derived = await hashwasm.argon2id({
                password: testCase.password,
                salt: testCase.salt,

                // Importante: evita a conversão secret="" via TextEncoder.
                secret: new Uint8Array(0),

                parallelism: testCase.parallelism,
                iterations: testCase.iterations,
                memorySize: testCase.memorySize,
                hashLength: 32,
                outputType: "binary"
            });

            var elapsedMs = Date.now() - startedAt;
            var expected = poc03HexToBytesForArgon2_(testCase.expectedHex);
            var passed = poc03BytesEqualForArgon2_(derived, expected);

            results.push({
                test: testCase.name,
                status: passed ? "PASS" : "FAIL",
                memoryKiB: testCase.memorySize,
                iterations: testCase.iterations,
                parallelism: testCase.parallelism,
                derivedKeyBytes: derived.length,
                elapsedMs: elapsedMs
            });

            Logger.log(JSON.stringify(results[results.length - 1]));

            if (!passed) {
                throw new Error(
                    "A saída Argon2id não corresponde ao vetor independente: "
                    + testCase.name
                );
            }
        }

        var summary = {
            test: "Argon2id WASM — hash-wasm 4.13.0",
            status: "PASS",
            testsPassed: results.length,
            testsTotal: testCases.length,
            totalElapsedMs: Date.now() - suiteStartedAt,
            performanceAssessment: "MEASURED_NOT_APPROVED",
            meaning: "vetores corretos; desempenho no Apps Script ainda precisa ser avaliado",
            profile: "m=19456 KiB,t=2,p=1,hashLength=32"
        };

        Logger.log(JSON.stringify(summary));
        return summary;
    } catch (error) {
        Logger.log(JSON.stringify({
            test: "Argon2id WASM — hash-wasm 4.13.0",
            status: "FAIL",
            elapsedMs: Date.now() - suiteStartedAt,
            message: String(error && error.message ? error.message : error)
        }));
        throw error;
    }
}


// -----------------------------------------------------------------------------
// Geração de salt — teste isolado com Utilities.getUuid()
// -----------------------------------------------------------------------------

/**
 * Converte o UUID v4 fornecido pelo Apps Script em 16 bytes hexadecimais.
 *
 * Base documental:
 * - Google documenta Utilities.getUuid() como equivalente a
 *   java.util.UUID.randomUUID().
 * - Java documenta UUID.randomUUID() como gerado por PRNG criptograficamente forte.
 *
 * A conversão preserva os 128 bits do UUID (122 bits aleatórios mais os bits
 * fixos de versão/variante). O valor em hexadecimal tem 32 caracteres.
 *
 * Este helper não grava dados e não deve ser chamado pelo navegador.
 */
function poc03GenerateSaltHex_() {
    var uuid = Utilities.getUuid();

    if (
        typeof uuid !== "string"
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
    ) {
        throw new Error(
            "Utilities.getUuid() não retornou um UUID v4 RFC 9562 válido."
        );
    }

    var saltHex = uuid.replace(/-/g, "").toLowerCase();

    if (!/^[0-9a-f]{32}$/.test(saltHex)) {
        throw new Error("Salt gerado não possui 16 bytes em hexadecimal.");
    }

    return saltHex;
}

/**
 * Teste estrutural de geração de salt.
 *
 * Gera 256 amostras e valida:
 * - UUID v4 / variante RFC;
 * - conversão para 16 bytes (32 caracteres hex);
 * - nenhuma repetição dentro desta amostra.
 *
 * ATENÇÃO: ausência de colisões numa amostra não prova CSPRNG.
 * A qualidade criptográfica baseia-se no contrato documentado das APIs
 * Google Utilities.getUuid() e Java UUID.randomUUID().
 * Nenhum valor gerado é escrito no log.
 */
function poc03RunSaltGenerationTests() {
    var sampleCount = 256;
    var seen = Object.create(null);
    var validCount = 0;
    var duplicateCount = 0;

    for (var i = 0; i < sampleCount; i += 1) {
        var saltHex = poc03GenerateSaltHex_();
        var saltBytes = poc03HexToBytesForArgon2_(saltHex);

        if (
            saltHex.length !== 32
            || saltBytes.length !== 16
        ) {
            throw new Error("Salt não possui exatamente 16 bytes.");
        }

        if (seen[saltHex]) {
            duplicateCount += 1;
        } else {
            seen[saltHex] = true;
        }

        validCount += 1;
    }

    var uniqueCount = Object.keys(seen).length;
    var passed = (
        validCount === sampleCount
        && duplicateCount === 0
        && uniqueCount === sampleCount
    );

    var result = {
        test: "Apps Script UUID v4 salt generation",
        status: passed ? "PASS" : "FAIL",
        samples: sampleCount,
        validUuidV4: validCount,
        saltBytes: 16,
        uniqueSamples: uniqueCount,
        duplicateCount: duplicateCount,
        cryptographicBasis: "Google Utilities.getUuid() -> Java UUID.randomUUID()",
        statisticalProofOfCSPRNG: false
    };

    Logger.log(JSON.stringify(result));

    if (!passed) {
        throw new Error("Falha no teste estrutural de geração de salt.");
    }

    return result;
}

/** Converte texto para UTF-8 pelo serviço nativo do Apps Script. */
function poc03Utf8BytesForArgon2_(value) {
    return new Uint8Array(
        Utilities.newBlob(String(value), "text/plain").getBytes()
    );
}

/** Converte hexadecimal em bytes sem depender de Buffer/atob. */
function poc03HexToBytesForArgon2_(hex) {
    if (
        typeof hex !== "string"
        || hex.length % 2 !== 0
        || !/^[0-9a-f]+$/i.test(hex)
    ) {
        throw new Error("Hexadecimal inválido no vetor Argon2id.");
    }

    var bytes = new Uint8Array(hex.length / 2);

    for (var i = 0; i < bytes.length; i += 1) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }

    return bytes;
}



/**
 * Rejeita UTF-16 malformado (surrogate alto/baixo sem par).
 * Isso evita que entradas inválidas sejam substituídas silenciosamente
 * durante a conversão para UTF-8.
 */
function poc03IsWellFormedUnicodeForPoc_(value) {
    for (var i = 0; i < value.length; i += 1) {
        var unit = value.charCodeAt(i);

        if (unit >= 0xD800 && unit <= 0xDBFF) {
            if (i + 1 >= value.length) {
                return false;
            }

            var nextUnit = value.charCodeAt(i + 1);

            if (nextUnit < 0xDC00 || nextUnit > 0xDFFF) {
                return false;
            }

            i += 1;
        } else if (unit >= 0xDC00 && unit <= 0xDFFF) {
            return false;
        }
    }

    return true;
}

/**
 * Política candidata de entrada:
 * - 15 a 128 pontos de código Unicode;
 * - NFC antes de derivar;
 * - até 512 bytes UTF-8;
 * - rejeita controles C0/C1 e UTF-16 malformado;
 * - não aplica trim, lowercase ou remoção de espaços.
 *
 * 128 pontos de código permitem pelo menos o máximo de 64 caracteres
 * recomendado pelo NIST, com margem para passphrases maiores.
 * O limite de 512 bytes limita o custo de entrada e suporta 128 code points
 * de até quatro bytes UTF-8 cada.
 */
function poc03NormalizeAndValidatePasswordForPoc_(password) {
    if (typeof password !== "string") {
        throw new Error("PASSWORD_TYPE_INVALID");
    }

    if (!poc03IsWellFormedUnicodeForPoc_(password)) {
        throw new Error("PASSWORD_UNICODE_INVALID");
    }

    if (typeof password.normalize !== "function") {
        throw new Error("PASSWORD_NFC_UNAVAILABLE");
    }

    var normalizedPassword = password.normalize("NFC");
    var codePointCount = Array.from(normalizedPassword).length;

    if (codePointCount < POC03_PASSWORD_MIN_CODE_POINTS) {
        throw new Error("PASSWORD_TOO_SHORT");
    }

    if (codePointCount > POC03_PASSWORD_MAX_CODE_POINTS) {
        throw new Error("PASSWORD_TOO_LONG");
    }

    // Aceita espaços e caracteres imprimíveis, mas rejeita controles C0/C1.
    for (var i = 0; i < normalizedPassword.length; ) {
        var codePoint = normalizedPassword.codePointAt(i);

        if (
            codePoint <= 0x1F
            || (codePoint >= 0x7F && codePoint <= 0x9F)
        ) {
            throw new Error("PASSWORD_CONTROL_CHARACTER");
        }

        i += codePoint > 0xFFFF ? 2 : 1;
    }

    var utf8ByteLength = Utilities.newBlob(
        normalizedPassword,
        "text/plain"
    ).getBytes().length;

    if (utf8ByteLength > POC03_PASSWORD_MAX_UTF8_BYTES) {
        throw new Error("PASSWORD_BYTES_LIMIT_EXCEEDED");
    }

    return {
        normalizedPassword: normalizedPassword,
        codePoints: codePointCount,
        utf8Bytes: utf8ByteLength
    };
}

/**
 * Valida a regra de senha em memória. Não registra valores fornecidos.
 */
function poc03RunPasswordInputPolicyTests() {
    var tests = [
        {
            name: "14 code points são rejeitados",
            action: function () {
                return poc03NormalizeAndValidatePasswordForPoc_("A".repeat(14));
            },
            expected: false
        },
        {
            name: "15 code points são aceitos",
            action: function () {
                return poc03NormalizeAndValidatePasswordForPoc_("A".repeat(15));
            },
            expected: true
        },
        {
            name: "64 code points são aceitos",
            action: function () {
                return poc03NormalizeAndValidatePasswordForPoc_("A".repeat(64));
            },
            expected: true
        },
        {
            name: "128 code points são aceitos",
            action: function () {
                return poc03NormalizeAndValidatePasswordForPoc_("A".repeat(128));
            },
            expected: true
        },
        {
            name: "129 code points são rejeitados",
            action: function () {
                return poc03NormalizeAndValidatePasswordForPoc_("A".repeat(129));
            },
            expected: false
        },
        {
            name: "15 emojis contam como 15 code points",
            action: function () {
                var result = poc03NormalizeAndValidatePasswordForPoc_("😀".repeat(15));
                return result.codePoints === 15 && result.utf8Bytes === 60;
            },
            expected: true
        },
        {
            name: "128 emojis respeitam o teto de 512 bytes",
            action: function () {
                var result = poc03NormalizeAndValidatePasswordForPoc_("😀".repeat(128));
                return result.codePoints === 128 && result.utf8Bytes === 512;
            },
            expected: true
        },
        {
            name: "129 emojis são rejeitados",
            action: function () {
                return poc03NormalizeAndValidatePasswordForPoc_("😀".repeat(129));
            },
            expected: false
        },
        {
            name: "Unicode decomposto é normalizado em NFC",
            action: function () {
                var composed = poc03NormalizeAndValidatePasswordForPoc_("\u00e9".repeat(15));
                var decomposed = poc03NormalizeAndValidatePasswordForPoc_("e\u0301".repeat(15));
                return composed.normalizedPassword === decomposed.normalizedPassword;
            },
            expected: true
        },
        {
            name: "espaços iniciais/finais são preservados",
            action: function () {
                var original = " " + "A".repeat(15) + " ";
                var result = poc03NormalizeAndValidatePasswordForPoc_(original);
                return result.normalizedPassword === original;
            },
            expected: true
        },
        {
            name: "caracteres de controle são rejeitados",
            action: function () {
                return poc03NormalizeAndValidatePasswordForPoc_("A".repeat(14) + "\u0000");
            },
            expected: false
        },
        {
            name: "surrogate isolado é rejeitado",
            action: function () {
                return poc03NormalizeAndValidatePasswordForPoc_("A".repeat(14) + "\uD800");
            },
            expected: false
        },
        {
            name: "tipos diferentes de string são rejeitados",
            action: function () {
                return poc03NormalizeAndValidatePasswordForPoc_(123456789012345);
            },
            expected: false
        }
    ];

    var passedCount = 0;

    tests.forEach(function (testCase) {
        var passed;

        try {
            var value = testCase.action();
            passed = testCase.expected
                ? value === true || Boolean(value && value.normalizedPassword)
                : false;
        } catch (error) {
            passed = testCase.expected === false;
        }

        if (passed) {
            passedCount += 1;
        }

        Logger.log(JSON.stringify({
            test: testCase.name,
            status: passed ? "PASS" : "FAIL"
        }));
    });

    // Normalização NFC também precisa ocorrer no caminho real do KDF.
    var composedPassword = "\u00e9".repeat(15);
    var decomposedPassword = "e\u0301".repeat(15);
    var record = poc03CreatePasswordRecordForPoc_(composedPassword);
    var normalizedVerification = await poc03VerifyPasswordForPoc_(
        decomposedPassword,
        record
    );
    var nfcPassed = normalizedVerification === true;

    if (nfcPassed) {
        passedCount += 1;
    }

    Logger.log(JSON.stringify({
        test: "senha equivalente em NFC verifica o mesmo registro Argon2id",
        status: nfcPassed ? "PASS" : "FAIL"
    }));

    var summary = {
        test: "Password input policy — isolated POC",
        status: passedCount === tests.length + 1 ? "PASS" : "FAIL",
        testsPassed: passedCount,
        testsTotal: tests.length + 1,
        minimumCodePoints: POC03_PASSWORD_MIN_CODE_POINTS,
        maximumCodePoints: POC03_PASSWORD_MAX_CODE_POINTS,
        maximumUtf8Bytes: POC03_PASSWORD_MAX_UTF8_BYTES,
        unicodeNormalization: "NFC",
        spacesTrimmed: false
    };

    Logger.log(JSON.stringify(summary));

    if (summary.status !== "PASS") {
        throw new Error("Falha na política de entrada de senha da POC-03.");
    }

    return summary;
}

/**
 * Modelo puro/in-memory da regra de tentativas aprovada na especificação.
 * NÃO é armazenamento nem proteção efetiva de produção.
 */
function poc03CreateLoginThrottleStateForPoc_() {
    return {
        failureCount: 0,
        windowStartedAtMs: null,
        blockedUntilMs: null
    };
}

function poc03ResetLoginThrottleStateForPoc_(state) {
    state.failureCount = 0;
    state.windowStartedAtMs = null;
    state.blockedUntilMs = null;
}

function poc03CanAttemptLoginForPoc_(state, nowMs) {
    if (
        !state
        || !Number.isSafeInteger(nowMs)
        || nowMs < 0
    ) {
        throw new Error("LOGIN_THROTTLE_STATE_INVALID");
    }

    if (state.blockedUntilMs !== null) {
        if (nowMs < state.blockedUntilMs) {
            return false;
        }

        poc03ResetLoginThrottleStateForPoc_(state);
    }

    if (
        state.windowStartedAtMs !== null
        && nowMs - state.windowStartedAtMs >= POC03_LOGIN_WINDOW_MS
    ) {
        poc03ResetLoginThrottleStateForPoc_(state);
    }

    return true;
}

function poc03RegisterLoginFailureForPoc_(state, nowMs) {
    if (!poc03CanAttemptLoginForPoc_(state, nowMs)) {
        return {
            status: "BLOCKED",
            allowed: false,
            failureCount: state.failureCount,
            blockedUntilMs: state.blockedUntilMs
        };
    }

    if (state.windowStartedAtMs === null) {
        state.windowStartedAtMs = nowMs;
    }

    state.failureCount += 1;

    if (state.failureCount >= POC03_LOGIN_FAILURE_LIMIT) {
        state.blockedUntilMs = nowMs + POC03_LOGIN_LOCK_MS;

        return {
            status: "LOCKED_AFTER_FAILURE",
            allowed: false,
            failureCount: state.failureCount,
            blockedUntilMs: state.blockedUntilMs
        };
    }

    return {
        status: "COUNTED",
        allowed: true,
        failureCount: state.failureCount,
        blockedUntilMs: null
    };
}

function poc03RegisterLoginSuccessForPoc_(state) {
    poc03ResetLoginThrottleStateForPoc_(state);
    return true;
}

/**
 * Testa a regra funcional 5 falhas/15 min -> bloqueio de 15 min.
 * Teste somente lógico e in-memory; não prova LockService/Sheets concorrentes.
 */
function poc03RunLoginThrottlePolicyTests() {
    var minute = 60 * 1000;
    var cases = [];

    // 1. Quatro erros ainda não bloqueiam; o quinto ativa o bloqueio.
    var thresholdState = poc03CreateLoginThrottleStateForPoc_();
    for (var i = 0; i < 4; i += 1) {
        poc03RegisterLoginFailureForPoc_(thresholdState, i * 1000);
    }
    var fifth = poc03RegisterLoginFailureForPoc_(thresholdState, 4000);
    cases.push({
        name: "quinta falha dentro da janela ativa bloqueio de 15 minutos",
        passed: fifth.status === "LOCKED_AFTER_FAILURE"
            && fifth.failureCount === 5
            && fifth.blockedUntilMs === 4000 + POC03_LOGIN_LOCK_MS
    });

    cases.push({
        name: "nova tentativa durante bloqueio é recusada",
        passed: poc03CanAttemptLoginForPoc_(thresholdState, 4000 + 14 * minute) === false
    });

    cases.push({
        name: "após 15 minutos o bloqueio expira e o contador reinicia",
        passed: poc03CanAttemptLoginForPoc_(
            thresholdState,
            4000 + POC03_LOGIN_LOCK_MS
        ) === true
            && thresholdState.failureCount === 0
            && thresholdState.blockedUntilMs === null
    });

    // 2. A janela é baseada no primeiro erro e reinicia em 15 minutos.
    var windowState = poc03CreateLoginThrottleStateForPoc_();
    for (var j = 0; j < 4; j += 1) {
        poc03RegisterLoginFailureForPoc_(windowState, j * minute);
    }
    var afterWindow = poc03RegisterLoginFailureForPoc_(windowState, 15 * minute);
    cases.push({
        name: "falhas fora da janela anterior começam uma nova janela",
        passed: afterWindow.status === "COUNTED"
            && afterWindow.failureCount === 1
            && windowState.blockedUntilMs === null
    });

    // 3. Login bem-sucedido limpa o contador.
    var resetState = poc03CreateLoginThrottleStateForPoc_();
    poc03RegisterLoginFailureForPoc_(resetState, 0);
    poc03RegisterLoginFailureForPoc_(resetState, 1000);
    poc03RegisterLoginFailureForPoc_(resetState, 2000);
    poc03RegisterLoginSuccessForPoc_(resetState);
    cases.push({
        name: "login bem-sucedido reinicia o controle",
        passed: resetState.failureCount === 0
            && resetState.windowStartedAtMs === null
            && resetState.blockedUntilMs === null
    });

    // 4. Tentativa bloqueada não incrementa contador.
    var blockedState = poc03CreateLoginThrottleStateForPoc_();
    for (var k = 0; k < 5; k += 1) {
        poc03RegisterLoginFailureForPoc_(blockedState, k * 1000);
    }
    var blockedCount = blockedState.failureCount;
    poc03RegisterLoginFailureForPoc_(blockedState, 6000);
    cases.push({
        name: "tentativa durante bloqueio não incrementa o contador",
        passed: blockedState.failureCount === blockedCount
    });

    var passedCount = 0;

    cases.forEach(function (testCase) {
        if (testCase.passed) {
            passedCount += 1;
        }

        Logger.log(JSON.stringify({
            test: testCase.name,
            status: testCase.passed ? "PASS" : "FAIL"
        }));
    });

    var summary = {
        test: "Login throttling policy — in-memory model only",
        status: passedCount === cases.length ? "PASS" : "FAIL",
        testsPassed: passedCount,
        testsTotal: cases.length,
        threshold: POC03_LOGIN_FAILURE_LIMIT,
        observationWindowMs: POC03_LOGIN_WINDOW_MS,
        lockDurationMs: POC03_LOGIN_LOCK_MS,
        storage: "MEMORY_ONLY_NOT_PERSISTED",
        concurrency: "NOT_TESTED"
    };

    Logger.log(JSON.stringify(summary));

    if (summary.status !== "PASS") {
        throw new Error("Falha na simulação da política de bloqueio da POC-03.");
    }

    return summary;
}

/**
 * Converte bytes Argon2id para hexadecimal minúsculo, sem Buffer/atob.
 */
function poc03BytesToHexForArgon2_(bytes) {
    if (!(bytes instanceof Uint8Array)) {
        throw new Error("A saída Argon2id precisa ser Uint8Array.");
    }

    var output = "";

    for (var i = 0; i < bytes.length; i += 1) {
        var hex = bytes[i].toString(16);
        output += hex.length === 1 ? "0" + hex : hex;
    }

    return output;
}

/**
 * Verifica estritamente o formato candidato do registro.
 *
 * Os parâmetros são fixos/allowlisted. Não aceitar memória, iterações ou
 * paralelismo arbitrários vindos do registro, pois isso poderia permitir
 * consumo excessivo de recursos.
 */
function poc03IsValidArgon2PasswordRecordForPoc_(record) {
    return Boolean(
        record
        && typeof record === "object"
        && record.senha_algoritmo === POC03_ARGON2_RECORD_ALGORITHM
        && typeof record.senha_salt === "string"
        && /^[0-9a-f]{32}$/.test(record.senha_salt)
        && typeof record.senha_hash === "string"
        && /^[0-9a-f]{64}$/.test(record.senha_hash)
    );
}

/** Deriva bytes a partir de uma string já normalizada/validada. */
async function poc03DeriveNormalizedPasswordBytesForPoc_(
    normalizedPassword,
    saltBytes
) {
    if (
        typeof hashwasm !== "object"
        || hashwasm === null
        || typeof hashwasm.argon2id !== "function"
    ) {
        throw new Error("Biblioteca Argon2id não carregada.");
    }

    if (
        typeof normalizedPassword !== "string"
        || !(saltBytes instanceof Uint8Array)
    ) {
        throw new Error("Entrada inválida para derivação Argon2id.");
    }

    return await hashwasm.argon2id({
        password: poc03Utf8BytesForArgon2_(normalizedPassword),
        salt: saltBytes,
        secret: new Uint8Array(0),
        parallelism: POC03_ARGON2_RECORD_PARALLELISM,
        iterations: POC03_ARGON2_RECORD_ITERATIONS,
        memorySize: POC03_ARGON2_RECORD_MEMORY_KIB,
        hashLength: POC03_ARGON2_RECORD_HASH_BYTES,
        outputType: "binary"
    });
}

/** Valida entrada e deriva 32 bytes com o perfil fixo da POC. */
async function poc03DerivePasswordBytesForPoc_(password, saltBytes) {
    var validation = poc03NormalizeAndValidatePasswordForPoc_(password);
    return await poc03DeriveNormalizedPasswordBytesForPoc_(
        validation.normalizedPassword,
        saltBytes
    );
}

/**
 * Cria um registro fictício em memória, sem gravar em Sheets/Properties.
 * O formato é candidato e ainda não foi aprovado para produção.
 */
async function poc03CreatePasswordRecordForPoc_(password) {
    var validation = poc03NormalizeAndValidatePasswordForPoc_(password);
    var saltHex = poc03GenerateSaltHex_();
    var saltBytes = poc03HexToBytesForArgon2_(saltHex);
    var derived = await poc03DeriveNormalizedPasswordBytesForPoc_(
        validation.normalizedPassword,
        saltBytes
    );

    return {
        senha_algoritmo: POC03_ARGON2_RECORD_ALGORITHM,
        senha_salt: saltHex,
        senha_hash: poc03BytesToHexForArgon2_(derived)
    };
}

/**
 * Verifica uma senha candidata contra um registro com formato estritamente
 * allowlisted. Retorna false para metadados malformados ou não suportados.
 *
 * A comparação percorre todos os 32 bytes com acumulador XOR, mas JavaScript/V8
 * não oferece uma garantia formal de tempo constante. Não usar esta POC como
 * rotina de autenticação sem revisão independente.
 */
async function poc03VerifyPasswordForPoc_(candidatePassword, record) {
    if (
        typeof candidatePassword !== "string"
        || !poc03IsValidArgon2PasswordRecordForPoc_(record)
    ) {
        return false;
    }

    var validation;

    try {
        validation = poc03NormalizeAndValidatePasswordForPoc_(candidatePassword);
    } catch (error) {
        return false;
    }

    var saltBytes = poc03HexToBytesForArgon2_(record.senha_salt);
    var expectedBytes = poc03HexToBytesForArgon2_(record.senha_hash);
    var actualBytes = await poc03DeriveNormalizedPasswordBytesForPoc_(
        validation.normalizedPassword,
        saltBytes
    );

    return poc03BytesEqualForArgon2_(actualBytes, expectedBytes);
}

/**
 * Prova de ponta a ponta em memória:
 * - cria um registro sintético com salt novo;
 * - aceita a senha correta;
 * - rejeita senha incorreta;
 * - rejeita salt/hash adulterados;
 * - recusa algoritmo e campos malformados.
 *
 * Não escreve Sheets/Drive/Properties, não registra senha, salt ou hash.
 */
async function poc03RunPasswordRecordVerificationTests() {
    var suiteStartedAt = Date.now();
    var dummyPassword = "POC03 synthetic password for verification";
    var results = [];

    try {
        var record = await poc03CreatePasswordRecordForPoc_(dummyPassword);

        var cases = [
            {
                name: "registro usa algoritmo/salt/hash no formato esperado",
                expected: true,
                action: function () {
                    return poc03IsValidArgon2PasswordRecordForPoc_(record);
                }
            },
            {
                name: "senha correta é aceita",
                expected: true,
                action: async function () {
                    return await poc03VerifyPasswordForPoc_(dummyPassword, record);
                }
            },
            {
                name: "senha incorreta é rejeitada",
                expected: false,
                action: async function () {
                    return await poc03VerifyPasswordForPoc_(
                        dummyPassword + " wrong",
                        record
                    );
                }
            },
            {
                name: "salt adulterado é rejeitado",
                expected: false,
                action: async function () {
                    var altered = {
                        senha_algoritmo: record.senha_algoritmo,
                        senha_salt: (record.senha_salt.charAt(0) === "0" ? "1" : "0")
                            + record.senha_salt.substring(1),
                        senha_hash: record.senha_hash
                    };
                    return await poc03VerifyPasswordForPoc_(dummyPassword, altered);
                }
            },
            {
                name: "hash adulterado é rejeitado",
                expected: false,
                action: async function () {
                    var altered = {
                        senha_algoritmo: record.senha_algoritmo,
                        senha_salt: record.senha_salt,
                        senha_hash: (record.senha_hash.charAt(0) === "0" ? "1" : "0")
                            + record.senha_hash.substring(1)
                    };
                    return await poc03VerifyPasswordForPoc_(dummyPassword, altered);
                }
            },
            {
                name: "algoritmo/parâmetros não permitidos são rejeitados",
                expected: false,
                action: async function () {
                    var altered = {
                        senha_algoritmo: "argon2id$v=19$m=999999,t=99,p=99",
                        senha_salt: record.senha_salt,
                        senha_hash: record.senha_hash
                    };
                    return await poc03VerifyPasswordForPoc_(dummyPassword, altered);
                }
            },
            {
                name: "salt malformado é rejeitado",
                expected: false,
                action: async function () {
                    var altered = {
                        senha_algoritmo: record.senha_algoritmo,
                        senha_salt: "not-a-salt",
                        senha_hash: record.senha_hash
                    };
                    return await poc03VerifyPasswordForPoc_(dummyPassword, altered);
                }
            },
            {
                name: "hash malformado é rejeitado",
                expected: false,
                action: async function () {
                    var altered = {
                        senha_algoritmo: record.senha_algoritmo,
                        senha_salt: record.senha_salt,
                        senha_hash: "bad-hash"
                    };
                    return await poc03VerifyPasswordForPoc_(dummyPassword, altered);
                }
            }
        ];

        for (var i = 0; i < cases.length; i += 1) {
            var startedAt = Date.now();
            var actual = await cases[i].action();
            var passed = actual === cases[i].expected;

            var result = {
                test: cases[i].name,
                status: passed ? "PASS" : "FAIL",
                elapsedMs: Date.now() - startedAt
            };

            results.push(result);
            Logger.log(JSON.stringify(result));

            if (!passed) {
                throw new Error("Falha no teste de verificação: " + cases[i].name);
            }
        }

        var summary = {
            test: "Argon2id password record create/verify — isolated POC",
            status: "PASS",
            testsPassed: results.length,
            testsTotal: cases.length,
            totalElapsedMs: Date.now() - suiteStartedAt,
            algorithm: POC03_ARGON2_RECORD_ALGORITHM,
            saltBytes: 16,
            hashBytes: POC03_ARGON2_RECORD_HASH_BYTES,
            storage: "MEMORY_ONLY_NOT_SAVED",
            comparison: "FIXED_LENGTH_XOR_ACCUMULATOR_NOT_PROVEN_CONSTANT_TIME"
        };

        Logger.log(JSON.stringify(summary));
        return summary;
    } catch (error) {
        Logger.log(JSON.stringify({
            test: "Argon2id password record create/verify — isolated POC",
            status: "FAIL",
            elapsedMs: Date.now() - suiteStartedAt,
            message: String(error && error.message ? error.message : error)
        }));
        throw error;
    }
}

/** Comparação byte a byte para o teste de vetor conhecido. */
function poc03BytesEqualForArgon2_(actual, expected) {
    if (
        !(actual instanceof Uint8Array)
        || !(expected instanceof Uint8Array)
        || actual.length !== expected.length
    ) {
        return false;
    }

    var difference = 0;

    for (var i = 0; i < actual.length; i += 1) {
        difference |= actual[i] ^ expected[i];
    }

    return difference === 0;
}

