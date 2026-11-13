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
async function poc03RunPasswordInputPolicyTests() {
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
    var failedTests = [];

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
        } else {
            failedTests.push(testCase.name);
        }

        Logger.log(JSON.stringify({
            test: testCase.name,
            status: passed ? "PASS" : "FAIL"
        }));
    });

    // Compara a derivação Argon2id das duas formas Unicode usando o mesmo salt.
    // Isso isola NFC da geração/armazenamento do registro.
    var composedPassword = "\u00e9".repeat(15);
    var decomposedPassword = "e\u0301".repeat(15);
    var composedValidation = poc03NormalizeAndValidatePasswordForPoc_(
        composedPassword
    );
    var decomposedValidation = poc03NormalizeAndValidatePasswordForPoc_(
        decomposedPassword
    );
    var fixedTestSalt = new Uint8Array(16);
    fixedTestSalt.fill(0x5A);

    var composedDerived = await poc03DeriveNormalizedPasswordBytesForPoc_(
        composedValidation.normalizedPassword,
        fixedTestSalt
    );
    var decomposedDerived = await poc03DeriveNormalizedPasswordBytesForPoc_(
        decomposedValidation.normalizedPassword,
        fixedTestSalt
    );

    var nfcPassed = poc03BytesEqualForArgon2_(
        composedDerived,
        decomposedDerived
    );

    if (nfcPassed) {
        passedCount += 1;
    } else {
        failedTests.push("derivação Argon2id equivalente após NFC");
    }

    Logger.log(JSON.stringify({
        test: "formas Unicode compostas/decompostas derivam o mesmo Argon2id após NFC",
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
        spacesTrimmed: false,
        failedTests: failedTests
    };

    Logger.log(JSON.stringify(summary));

    if (summary.status !== "PASS") {
        throw new Error(
            "Falha na política de entrada de senha da POC-03: "
            + failedTests.join("; ")
        );
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



// -----------------------------------------------------------------------------
// Throttling persistente — POC isolada com PropertiesService + ScriptLock
// -----------------------------------------------------------------------------

var POC03_THROTTLE_TEST_PREFIX = "POC03_THROTTLE_TEST_";
var POC03_THROTTLE_TEST_SECRET_KEY =
    POC03_THROTTLE_TEST_PREFIX + "HMAC_SECRET_V1";
var POC03_THROTTLE_TEST_STATE_PREFIX =
    POC03_THROTTLE_TEST_PREFIX + "STATE_V1_";
var POC03_THROTTLE_PROBE_RUN_ID_KEY =
    POC03_THROTTLE_TEST_PREFIX + "PROBE_RUN_ID";
var POC03_THROTTLE_PROBE_RESULTS_KEY =
    POC03_THROTTLE_TEST_PREFIX + "PROBE_RESULTS";
var POC03_THROTTLE_LOCK_TIMEOUT_MS = 15000;
var POC03_THROTTLE_TEST_IDENTIFIER =
    "poc03-synthetic-account@invalid.example";
var POC03_THROTTLE_CONCURRENCY_HOLD_MS = 150;
var POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS = 10;

// Sonda coordenada: dez gatilhos de execução única aguardam uma barreira comum.
var POC03_THROTTLE_COORD_META_KEY =
    POC03_THROTTLE_TEST_PREFIX + "COORD_META_V1";
var POC03_THROTTLE_COORD_ARRIVAL_COUNT_KEY =
    POC03_THROTTLE_TEST_PREFIX + "COORD_ARRIVAL_COUNT_V1";
var POC03_THROTTLE_COORD_ARRIVAL_PREFIX =
    POC03_THROTTLE_TEST_PREFIX + "COORD_ARRIVAL_V1_";
var POC03_THROTTLE_COORD_DETAIL_PREFIX =
    POC03_THROTTLE_TEST_PREFIX + "COORD_DETAIL_V1_";
var POC03_THROTTLE_COORDINATED_WORKER_HANDLERS = [
    "poc03RunPersistentThrottleCoordinatedWorker00_",
    "poc03RunPersistentThrottleCoordinatedWorker01_",
    "poc03RunPersistentThrottleCoordinatedWorker02_",
    "poc03RunPersistentThrottleCoordinatedWorker03_",
    "poc03RunPersistentThrottleCoordinatedWorker04_",
    "poc03RunPersistentThrottleCoordinatedWorker05_",
    "poc03RunPersistentThrottleCoordinatedWorker06_",
    "poc03RunPersistentThrottleCoordinatedWorker07_",
    "poc03RunPersistentThrottleCoordinatedWorker08_",
    "poc03RunPersistentThrottleCoordinatedWorker09_"
];
var POC03_THROTTLE_COORDINATED_HOLD_MS = 350;
var POC03_THROTTLE_COORDINATED_META_TIMEOUT_MS = 30000;
var POC03_THROTTLE_COORDINATED_BARRIER_TIMEOUT_MS = 180000;
var POC03_THROTTLE_COORDINATED_TRIGGER_DELAY_MS = 1000;

/**
 * Retorna somente o Script Properties do projeto isolado.
 * Nunca usar este armazenamento como substituto definitivo da entidade
 * CONTROLE_AUTENTICACAO: ele serve aqui para provar read-modify-write sob lock.
 */
function poc03GetThrottleTestProperties_() {
    if (
        typeof PropertiesService !== "object"
        || PropertiesService === null
        || typeof PropertiesService.getScriptProperties !== "function"
    ) {
        throw new Error("THROTTLE_PROPERTIES_UNAVAILABLE");
    }

    var properties = PropertiesService.getScriptProperties();

    if (
        !properties
        || typeof properties.getProperty !== "function"
        || typeof properties.setProperty !== "function"
        || typeof properties.deleteProperty !== "function"
        || typeof properties.getKeys !== "function"
    ) {
        throw new Error("THROTTLE_PROPERTIES_UNAVAILABLE");
    }

    return properties;
}

/**
 * Cria e guarda uma chave HMAC exclusiva para os dados sintéticos desta POC.
 * Ela não é uma chave de produção nem é reutilizada pela POC-02.
 * O valor nunca é registrado no log.
 */
function poc03GetOrCreateThrottleTestSecretLocked_(properties) {
    var existing = properties.getProperty(POC03_THROTTLE_TEST_SECRET_KEY);

    if (existing !== null && typeof existing !== "undefined") {
        if (!/^[0-9a-f]{64}$/.test(existing)) {
            throw new Error("THROTTLE_TEST_SECRET_INVALID");
        }

        return existing;
    }

    var firstUuid = Utilities.getUuid();
    var secondUuid = Utilities.getUuid();

    if (
        typeof firstUuid !== "string"
        || typeof secondUuid !== "string"
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstUuid)
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(secondUuid)
    ) {
        throw new Error("THROTTLE_TEST_SECRET_GENERATION_FAILED");
    }

    var secret = (
        firstUuid.replace(/-/g, "")
        + secondUuid.replace(/-/g, "")
    ).toLowerCase();

    if (!/^[0-9a-f]{64}$/.test(secret)) {
        throw new Error("THROTTLE_TEST_SECRET_GENERATION_FAILED");
    }

    properties.setProperty(POC03_THROTTLE_TEST_SECRET_KEY, secret);
    return secret;
}

/**
 * Deriva a chave de estado com HMAC-SHA-256 do identificador normalizado.
 * O valor de entrada desta POC é sempre sintético (.invalid.example).
 */
function poc03GetThrottleTestStateKeyLocked_(properties, identifier) {
    if (
        typeof identifier !== "string"
        || identifier.trim().length < 1
        || identifier.trim().length > 254
    ) {
        throw new Error("THROTTLE_IDENTIFIER_INVALID");
    }

    var normalizedIdentifier = identifier.trim().toLowerCase();
    var secret = poc03GetOrCreateThrottleTestSecretLocked_(properties);
    var digest = Utilities.computeHmacSha256Signature(
        normalizedIdentifier,
        secret
    );
    var identifierHash = bytesToHexForPoc_(digest);

    if (!/^[0-9a-f]{64}$/.test(identifierHash)) {
        throw new Error("THROTTLE_IDENTIFIER_HASH_INVALID");
    }

    return POC03_THROTTLE_TEST_STATE_PREFIX + identifierHash;
}

function poc03CreateEmptyPersistentThrottleState_() {
    return {
        schemaVersion: 1,
        failureCount: 0,
        windowStartedAtMs: null,
        blockedUntilMs: null,
        updatedAtMs: null
    };
}

/**
 * Valida rigorosamente o estado persistido antes de usá-lo.
 * Estado desconhecido/corrompido falha fechado; nunca zera silenciosamente.
 */
function poc03IsValidPersistentThrottleState_(state) {
    if (
        !state
        || typeof state !== "object"
        || Array.isArray(state)
        || state.schemaVersion !== 1
        || !Number.isInteger(state.failureCount)
        || state.failureCount < 1
        || state.failureCount > POC03_LOGIN_FAILURE_LIMIT
        || !Number.isSafeInteger(state.windowStartedAtMs)
        || state.windowStartedAtMs <= 0
        || !Number.isSafeInteger(state.updatedAtMs)
        || state.updatedAtMs <= 0
    ) {
        return false;
    }

    if (state.failureCount < POC03_LOGIN_FAILURE_LIMIT) {
        return state.blockedUntilMs === null;
    }

    return Number.isSafeInteger(state.blockedUntilMs)
        && state.blockedUntilMs > 0
        && state.blockedUntilMs >= state.updatedAtMs;
}

function poc03ReadPersistentThrottleStateLocked_(properties, stateKey) {
    var raw = properties.getProperty(stateKey);

    if (raw === null || typeof raw === "undefined") {
        return {
            ok: true,
            exists: false,
            state: poc03CreateEmptyPersistentThrottleState_()
        };
    }

    if (typeof raw !== "string" || raw.length > 2048) {
        return { ok: false, reason: "CORRUPT_STATE" };
    }

    var state;

    try {
        state = JSON.parse(raw);
    } catch (error) {
        return { ok: false, reason: "CORRUPT_STATE" };
    }

    if (!poc03IsValidPersistentThrottleState_(state)) {
        return { ok: false, reason: "CORRUPT_STATE" };
    }

    return {
        ok: true,
        exists: true,
        state: state
    };
}

function poc03AcquireThrottleScriptLock_() {
    if (
        typeof LockService !== "object"
        || LockService === null
        || typeof LockService.getScriptLock !== "function"
    ) {
        return {
            ok: false,
            reason: "LOCK_UNAVAILABLE",
            lock: null
        };
    }

    try {
        var lock = LockService.getScriptLock();

        if (!lock || typeof lock.tryLock !== "function") {
            return {
                ok: false,
                reason: "LOCK_UNAVAILABLE",
                lock: null
            };
        }

        if (!lock.tryLock(POC03_THROTTLE_LOCK_TIMEOUT_MS)) {
            return {
                ok: false,
                reason: "LOCK_TIMEOUT",
                lock: null
            };
        }

        return {
            ok: true,
            lock: lock
        };
    } catch (error) {
        return {
            ok: false,
            reason: "LOCK_UNAVAILABLE",
            lock: null
        };
    }
}

/**
 * Atualiza um único estado sob ScriptLock.
 *
 * Esta função é síncrona de propósito: adquire o lock, lê a propriedade,
 * calcula a transição e grava antes de liberar o lock.
 * Em falha de lock/propriedade/estado corrompido, não autoriza a tentativa.
 */
function poc03RegisterPersistentThrottleFailureForPoc_(
    identifier,
    nowMs,
    options
) {
    var safeOptions = options && typeof options === "object" ? options : {};
    var holdLockMs = safeOptions.holdLockMs || 0;
    var probeMode = safeOptions.probeMode === true;

    if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
        return {
            status: "INVALID_TIMESTAMP",
            allowed: false,
            failureCount: null,
            blockedUntilMs: null
        };
    }

    if (
        !Number.isInteger(holdLockMs)
        || holdLockMs < 0
        || holdLockMs > 1000
    ) {
        return {
            status: "INVALID_TEST_OPTION",
            allowed: false,
            failureCount: null,
            blockedUntilMs: null
        };
    }

    var timing = safeOptions.timing && typeof safeOptions.timing === "object"
        ? safeOptions.timing
        : null;
    if (timing) {
        timing.lockRequestedAtMs = Date.now();
    }

    var lockResult = poc03AcquireThrottleScriptLock_();

    if (timing) {
        timing.lockAcquiredAtMs = lockResult.ok ? Date.now() : null;
        timing.lockWaitMs = Date.now() - timing.lockRequestedAtMs;
    }

    if (!lockResult.ok) {
        return {
            status: lockResult.reason,
            allowed: false,
            failureCount: null,
            blockedUntilMs: null
        };
    }

    var lock = lockResult.lock;

    try {
        var properties = poc03GetThrottleTestProperties_();
        var stateKey = poc03GetThrottleTestStateKeyLocked_(
            properties,
            identifier
        );

        // A espera existe apenas na sonda de concorrência para ampliar
        // deliberadamente a janela de contenção; nunca no fluxo normal.
        if (holdLockMs > 0) {
            Utilities.sleep(holdLockMs);
        }

        var stored = poc03ReadPersistentThrottleStateLocked_(
            properties,
            stateKey
        );

        if (!stored.ok) {
            return {
                status: "PERSISTED_STATE_CORRUPT",
                allowed: false,
                failureCount: null,
                blockedUntilMs: null
            };
        }

        var state = stored.state;
        var transition = poc03RegisterLoginFailureForPoc_(state, nowMs);

        if (transition.status !== "BLOCKED") {
            state.updatedAtMs = nowMs;
            properties.setProperty(stateKey, JSON.stringify(state));
        }

        var result = {
            status: transition.status,
            allowed: transition.allowed,
            failureCount: transition.failureCount,
            blockedUntilMs: transition.blockedUntilMs
        };

        if (probeMode) {
            var runId = properties.getProperty(POC03_THROTTLE_PROBE_RUN_ID_KEY);
            var rawResults = properties.getProperty(POC03_THROTTLE_PROBE_RESULTS_KEY);
            var probeResults;

            if (
                typeof runId !== "string"
                || !/^[0-9a-f]{32}$/.test(runId)
                || typeof rawResults !== "string"
                || rawResults.length > 8192
            ) {
                return {
                    status: "PROBE_NOT_INITIALIZED",
                    allowed: false,
                    failureCount: result.failureCount,
                    blockedUntilMs: result.blockedUntilMs
                };
            }

            try {
                probeResults = JSON.parse(rawResults);
            } catch (error) {
                return {
                    status: "PROBE_STATE_CORRUPT",
                    allowed: false,
                    failureCount: result.failureCount,
                    blockedUntilMs: result.blockedUntilMs
                };
            }

            if (!Array.isArray(probeResults)) {
                return {
                    status: "PROBE_STATE_CORRUPT",
                    allowed: false,
                    failureCount: result.failureCount,
                    blockedUntilMs: result.blockedUntilMs
                };
            }

            probeResults.push({
                status: result.status,
                failureCount: result.failureCount,
                executedAtMs: nowMs
            });

            properties.setProperty(
                POC03_THROTTLE_PROBE_RESULTS_KEY,
                JSON.stringify(probeResults)
            );
        }

        return result;
    } catch (error) {
        return {
            status: "PERSISTENCE_UNAVAILABLE",
            allowed: false,
            failureCount: null,
            blockedUntilMs: null
        };
    } finally {
        try {
            lock.releaseLock();
        } catch (error) {
            // Nenhum detalhe interno ou dado de teste é registrado.
        }

        if (timing) {
            timing.lockReleasedAtMs = Date.now();
            timing.lockHeldMs = timing.lockAcquiredAtMs === null
                ? null
                : timing.lockReleasedAtMs - timing.lockAcquiredAtMs;
        }
    }
}

/**
 * Um login bem-sucedido limpa somente o estado de controle do identificador.
 * A exclusão também ocorre sob ScriptLock.
 */
function poc03ResetPersistentThrottleForPoc_(identifier) {
    var lockResult = poc03AcquireThrottleScriptLock_();

    if (!lockResult.ok) {
        return {
            status: lockResult.reason,
            reset: false
        };
    }

    var lock = lockResult.lock;

    try {
        var properties = poc03GetThrottleTestProperties_();
        var stateKey = poc03GetThrottleTestStateKeyLocked_(
            properties,
            identifier
        );

        properties.deleteProperty(stateKey);

        return {
            status: "RESET",
            reset: true
        };
    } catch (error) {
        return {
            status: "PERSISTENCE_UNAVAILABLE",
            reset: false
        };
    } finally {
        try {
            lock.releaseLock();
        } catch (error) {
            // Falha de liberação não deve expor detalhes da execução.
        }
    }
}

/** Consulta o estado sintético sob o mesmo lock, sem retornar chave/hash. */
function poc03InspectPersistentThrottleForPoc_(identifier) {
    var lockResult = poc03AcquireThrottleScriptLock_();

    if (!lockResult.ok) {
        return {
            ok: false,
            status: lockResult.reason,
            exists: false,
            state: null
        };
    }

    var lock = lockResult.lock;

    try {
        var properties = poc03GetThrottleTestProperties_();
        var stateKey = poc03GetThrottleTestStateKeyLocked_(
            properties,
            identifier
        );
        var stored = poc03ReadPersistentThrottleStateLocked_(
            properties,
            stateKey
        );

        if (!stored.ok) {
            return {
                ok: false,
                status: "PERSISTED_STATE_CORRUPT",
                exists: true,
                state: null
            };
        }

        return {
            ok: true,
            status: "READ",
            exists: stored.exists,
            state: stored.state
        };
    } catch (error) {
        return {
            ok: false,
            status: "PERSISTENCE_UNAVAILABLE",
            exists: false,
            state: null
        };
    } finally {
        try {
            lock.releaseLock();
        } catch (error) {
            // No-op para não vazar informações do estado.
        }
    }
}

/** Instala um conteúdo inválido somente para verificar falha fechada. */
function poc03CorruptPersistentThrottleForPoc_(identifier) {
    var lockResult = poc03AcquireThrottleScriptLock_();

    if (!lockResult.ok) {
        return false;
    }

    var lock = lockResult.lock;

    try {
        var properties = poc03GetThrottleTestProperties_();
        var stateKey = poc03GetThrottleTestStateKeyLocked_(
            properties,
            identifier
        );
        properties.setProperty(stateKey, "{invalid-json");
        return true;
    } catch (error) {
        return false;
    } finally {
        try {
            lock.releaseLock();
        } catch (error) {
            // No-op.
        }
    }
}

/**
 * Remove somente propriedades iniciadas por POC03_THROTTLE_TEST_.
 * Não chama deleteAllProperties e não toca nas propriedades de POC-02.
 */
function poc03CleanupPersistentThrottleTestData() {
    var lockResult = poc03AcquireThrottleScriptLock_();

    if (!lockResult.ok) {
        throw new Error("Não foi possível obter o lock para limpar dados POC-03.");
    }

    var lock = lockResult.lock;

    try {
        var properties = poc03GetThrottleTestProperties_();
        var keys = properties.getKeys();
        var removedCount = 0;

        keys.forEach(function (key) {
            if (key.indexOf(POC03_THROTTLE_TEST_PREFIX) === 0) {
                properties.deleteProperty(key);
                removedCount += 1;
            }
        });

        var summary = {
            test: "POC-03 persistent throttle cleanup",
            status: "PASS",
            removedPoc03Properties: removedCount,
            scope: "POC03_THROTTLE_TEST_PREFIX_ONLY"
        };

        Logger.log(JSON.stringify(summary));
        return summary;
    } finally {
        try {
            lock.releaseLock();
        } catch (error) {
            // No-op.
        }
    }
}

/**
 * Bateria sequencial com PropertiesService real e ScriptLock real.
 * Os timestamps simulados deixam a expiração determinística.
 * Usa um único identificador .invalid e apaga os dados ao final.
 */
function poc03RunPersistentThrottlePolicyTests() {
    var identifier = POC03_THROTTLE_TEST_IDENTIFIER;
    var minute = 60 * 1000;
    var startTime = Date.now();
    var cases = [];
    var cleanupCompleted = false;

    try {
        poc03CleanupPersistentThrottleTestData();

        var failures = [];
        for (var i = 0; i < 4; i += 1) {
            failures.push(
                poc03RegisterPersistentThrottleFailureForPoc_(
                    identifier,
                    startTime + i * 1000
                )
            );
        }

        var afterFour = poc03InspectPersistentThrottleForPoc_(identifier);
        cases.push({
            name: "quatro falhas ficam persistidas entre chamadas",
            passed: failures.every(function (item, index) {
                return item.status === "COUNTED"
                    && item.failureCount === index + 1;
            })
                && afterFour.ok
                && afterFour.exists
                && afterFour.state.failureCount === 4
        });

        var fifth = poc03RegisterPersistentThrottleFailureForPoc_(
            identifier,
            startTime + 4000
        );
        cases.push({
            name: "quinta falha persiste bloqueio por 15 minutos",
            passed: fifth.status === "LOCKED_AFTER_FAILURE"
                && fifth.failureCount === 5
                && fifth.blockedUntilMs === startTime + 4000 + POC03_LOGIN_LOCK_MS
        });

        var blockedBeforeExpiry = poc03RegisterPersistentThrottleFailureForPoc_(
            identifier,
            startTime + 5000
        );
        var afterBlockedAttempt = poc03InspectPersistentThrottleForPoc_(identifier);
        cases.push({
            name: "tentativa durante bloqueio é recusada sem alterar estado",
            passed: blockedBeforeExpiry.status === "BLOCKED"
                && afterBlockedAttempt.ok
                && afterBlockedAttempt.state.failureCount === 5
                && afterBlockedAttempt.state.blockedUntilMs === fifth.blockedUntilMs
        });

        var afterExpiry = poc03RegisterPersistentThrottleFailureForPoc_(
            identifier,
            fifth.blockedUntilMs
        );
        cases.push({
            name: "após expiração, uma nova janela começa em 1",
            passed: afterExpiry.status === "COUNTED"
                && afterExpiry.failureCount === 1
                && afterExpiry.blockedUntilMs === null
        });

        var successReset = poc03ResetPersistentThrottleForPoc_(identifier);
        var afterSuccess = poc03InspectPersistentThrottleForPoc_(identifier);
        cases.push({
            name: "login bem-sucedido remove o estado persistido",
            passed: successReset.reset === true
                && afterSuccess.ok
                && afterSuccess.exists === false
        });

        var corruptInstalled = poc03CorruptPersistentThrottleForPoc_(identifier);
        var corruptAttempt = poc03RegisterPersistentThrottleFailureForPoc_(
            identifier,
            Date.now()
        );
        cases.push({
            name: "estado corrompido falha fechado sem autorizar tentativa",
            passed: corruptInstalled === true
                && corruptAttempt.status === "PERSISTED_STATE_CORRUPT"
                && corruptAttempt.allowed === false
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
            test: "Persistent login throttling — isolated Apps Script POC",
            status: passedCount === cases.length ? "PASS" : "FAIL",
            testsPassed: passedCount,
            testsTotal: cases.length,
            threshold: POC03_LOGIN_FAILURE_LIMIT,
            observationWindowMs: POC03_LOGIN_WINDOW_MS,
            lockDurationMs: POC03_LOGIN_LOCK_MS,
            persistence: "SCRIPT_PROPERTIES_TEST_ONLY",
            synchronization: "SCRIPT_LOCK",
            failClosedOnCorruptState: true,
            concurrency: "NOT_TESTED_IN_THIS_SUITE",
            syntheticIdentifier: "NOT_LOGGED",
            realAccountsUsed: false
        };

        Logger.log(JSON.stringify(summary));

        if (summary.status !== "PASS") {
            throw new Error("Falha na bateria persistente de throttling.");
        }

        return summary;
    } finally {
        try {
            poc03CleanupPersistentThrottleTestData();
            cleanupCompleted = true;
        } catch (cleanupError) {
            Logger.log(JSON.stringify({
                test: "persistent throttle test data cleanup",
                status: "FAIL"
            }));
        }

        if (!cleanupCompleted) {
            throw new Error(
                "A bateria terminou, mas os dados POC-03 não puderam ser limpos."
            );
        }
    }
}

/**
 * Prepara a sonda manual de concorrência. Execute uma vez antes de abrir
 * dez execuções do worker. Somente propriedades POC-03 sintéticas são usadas.
 */
function poc03ResetPersistentThrottleConcurrencyProbe() {
    var lockResult = poc03AcquireThrottleScriptLock_();

    if (!lockResult.ok) {
        throw new Error("Não foi possível obter o lock para iniciar a sonda.");
    }

    var lock = lockResult.lock;

    try {
        var properties = poc03GetThrottleTestProperties_();
        var keys = properties.getKeys();

        keys.forEach(function (key) {
            if (key.indexOf(POC03_THROTTLE_TEST_PREFIX) === 0) {
                properties.deleteProperty(key);
            }
        });

        poc03GetOrCreateThrottleTestSecretLocked_(properties);

        var runId = Utilities.getUuid().replace(/-/g, "").toLowerCase();

        if (!/^[0-9a-f]{32}$/.test(runId)) {
            throw new Error("Identificador da sonda inválido.");
        }

        properties.setProperty(POC03_THROTTLE_PROBE_RUN_ID_KEY, runId);
        properties.setProperty(POC03_THROTTLE_PROBE_RESULTS_KEY, "[]");

        var summary = {
            test: "Persistent throttle concurrency probe reset",
            status: "READY",
            expectedWorkers: POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS,
            artificialLockHoldMs: POC03_THROTTLE_CONCURRENCY_HOLD_MS,
            identifier: "SYNTHETIC_ONLY_NOT_LOGGED"
        };

        Logger.log(JSON.stringify(summary));
        return summary;
    } finally {
        try {
            lock.releaseLock();
        } catch (error) {
            // No-op.
        }
    }
}

/**
 * Execute esta função em dez execuções Apps Script separadas, iniciadas
 * com poucos segundos de diferença. O atraso artificial existe somente para
 * ampliar a disputa pelo ScriptLock durante o experimento.
 */
function poc03RunPersistentThrottleConcurrencyWorker() {
    var result = poc03RegisterPersistentThrottleFailureForPoc_(
        POC03_THROTTLE_TEST_IDENTIFIER,
        Date.now(),
        {
            holdLockMs: POC03_THROTTLE_CONCURRENCY_HOLD_MS,
            probeMode: true
        }
    );

    Logger.log(JSON.stringify({
        test: "Persistent throttle concurrency worker",
        status: result.status,
        allowed: result.allowed,
        failureCount: result.failureCount
    }));

    return result;
}


/**
 * Remove somente gatilhos cujos handlers são exclusivos desta sonda coordenada.
 * Não toca em gatilhos de outras funções/projetos.
 */
function poc03DeletePersistentThrottleCoordinatedTriggers_() {
    if (
        typeof ScriptApp !== "object"
        || ScriptApp === null
        || typeof ScriptApp.getProjectTriggers !== "function"
        || typeof ScriptApp.deleteTrigger !== "function"
    ) {
        return 0;
    }

    var removed = 0;
    var triggers = ScriptApp.getProjectTriggers();

    triggers.forEach(function (trigger) {
        try {
            if (
                POC03_THROTTLE_COORDINATED_WORKER_HANDLERS.indexOf(
                    trigger.getHandlerFunction()
                ) >= 0
            ) {
                ScriptApp.deleteTrigger(trigger);
                removed += 1;
            }
        } catch (error) {
            // A limpeza continua para os demais gatilhos da própria sonda.
        }
    });

    return removed;
}

/**
 * Limpa a sonda coordenada: remove apenas os gatilhos do handler exclusivo
 * e depois as propriedades sintéticas com o prefixo POC03_THROTTLE_TEST_.
 */
function poc03CleanupPersistentThrottleCoordinatedConcurrencyProbe() {
    var removedTriggers = poc03DeletePersistentThrottleCoordinatedTriggers_();
    var cleanup = poc03CleanupPersistentThrottleTestData();

    var summary = {
        test: "POC-03 coordinated concurrency probe cleanup",
        status: cleanup.status,
        removedCoordinatedTriggers: removedTriggers,
        removedPoc03Properties: cleanup.removedPoc03Properties,
        scope: "COORDINATED_HANDLER_AND_POC03_THROTTLE_TEST_PREFIX_ONLY"
    };

    Logger.log(JSON.stringify(summary));
    return summary;
}

/** Lê e valida os metadados da sonda coordenada. */
function poc03ReadCoordinatedThrottleMeta_(properties) {
    var raw = properties.getProperty(POC03_THROTTLE_COORD_META_KEY);

    if (typeof raw !== "string" || raw.length > 8192) {
        return null;
    }

    try {
        var meta = JSON.parse(raw);

        if (
            !meta
            || typeof meta !== "object"
            || meta.schemaVersion !== 1
            || typeof meta.runId !== "string"
            || !/^[0-9a-f]{32}$/.test(meta.runId)
            || meta.expectedWorkers !== POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS
            || !Array.isArray(meta.workerHandlers)
            || meta.workerHandlers.length !== POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS
            || !Array.isArray(meta.triggerIds)
            || meta.triggerIds.length !== POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS
        ) {
            return null;
        }

        for (var index = 0; index < POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS; index += 1) {
            if (
                meta.workerHandlers[index] !== POC03_THROTTLE_COORDINATED_WORKER_HANDLERS[index]
                || typeof meta.triggerIds[index] !== "string"
                || meta.triggerIds[index].length < 1
            ) {
                return null;
            }
        }

        if (Object.keys(meta.triggerIds.reduce(function (seen, id) {
            seen[id] = true;
            return seen;
        }, {})).length !== POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS) {
            return null;
        }

        return meta;
    } catch (error) {
        return null;
    }
}

/**
 * Calcula sobreposição real entre intervalos de execução.
 * A função é pura para permitir teste automatizado no harness Node/VM.
 */
function poc03AnalyzeThrottleConcurrencyIntervalsForPoc_(details) {
    var valid = (Array.isArray(details) ? details : []).filter(function (item) {
        return item
            && Number.isSafeInteger(item.invocationStartedAtMs)
            && Number.isSafeInteger(item.workerCompletedAtMs)
            && item.workerCompletedAtMs > item.invocationStartedAtMs;
    });

    var events = [];
    valid.forEach(function (item) {
        events.push({
            at: item.invocationStartedAtMs,
            delta: 1
        });
        events.push({
            at: item.workerCompletedAtMs,
            delta: -1
        });
    });

    events.sort(function (left, right) {
        if (left.at !== right.at) {
            return left.at - right.at;
        }

        // Em um mesmo milissegundo, término vem antes de início.
        return left.delta - right.delta;
    });

    var active = 0;
    var maxConcurrentWorkers = 0;

    events.forEach(function (event) {
        active += event.delta;
        if (active > maxConcurrentWorkers) {
            maxConcurrentWorkers = active;
        }
    });

    var pairwiseOverlapCount = 0;
    for (var i = 0; i < valid.length; i += 1) {
        for (var j = i + 1; j < valid.length; j += 1) {
            var overlaps = (
                valid[i].invocationStartedAtMs < valid[j].workerCompletedAtMs
                && valid[j].invocationStartedAtMs < valid[i].workerCompletedAtMs
            );

            if (overlaps) {
                pairwiseOverlapCount += 1;
            }
        }
    }

    var latestStart = null;
    var earliestEnd = null;

    if (valid.length > 0) {
        latestStart = Math.max.apply(
            null,
            valid.map(function (item) {
                return item.invocationStartedAtMs;
            })
        );
        earliestEnd = Math.min.apply(
            null,
            valid.map(function (item) {
                return item.workerCompletedAtMs;
            })
        );
    }

    return {
        validIntervals: valid.length,
        maxConcurrentWorkers: maxConcurrentWorkers,
        pairwiseOverlapCount: pairwiseOverlapCount,
        allWorkersOverlapAtOneInstant: valid.length === details.length
            && valid.length > 0
            && latestStart < earliestEnd,
        commonOverlapWindowMs: (
            valid.length > 0 && latestStart < earliestEnd
        ) ? earliestEnd - latestStart : 0
    };
}

/**
 * Cria dez gatilhos de execução única. Cada worker aguarda a chegada de todos
 * os dez antes de disputar o ScriptLock. O horário real dos gatilhos pode variar;
 * a barreira elimina a dependência de disparos no mesmo instante.
 */
function poc03LaunchPersistentThrottleCoordinatedConcurrencyProbe() {
    if (
        typeof ScriptApp !== "object"
        || ScriptApp === null
        || typeof ScriptApp.newTrigger !== "function"
        || typeof ScriptApp.getProjectTriggers !== "function"
    ) {
        throw new Error("SCRIPT_TRIGGER_SERVICE_UNAVAILABLE");
    }

    // Limpa apenas gatilhos do handler exclusivo e propriedades sintéticas antigas.
    poc03CleanupPersistentThrottleCoordinatedConcurrencyProbe();

    var currentTriggers = ScriptApp.getProjectTriggers();
    var maxTriggers = 20;

    if (
        currentTriggers.length
        + POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS
        > maxTriggers
    ) {
        throw new Error(
            "TRIGGER_QUOTA_CAPACITY_INSUFFICIENT: remova ou aguarde gatilhos deste projeto."
        );
    }

    var lockResult = poc03AcquireThrottleScriptLock_();

    if (!lockResult.ok) {
        throw new Error("Não foi possível obter lock para preparar a sonda coordenada.");
    }

    var lock = lockResult.lock;
    var createdTriggers = [];

    try {
        var properties = poc03GetThrottleTestProperties_();
        poc03GetOrCreateThrottleTestSecretLocked_(properties);

        var runId = Utilities.getUuid().replace(/-/g, "").toLowerCase();

        if (!/^[0-9a-f]{32}$/.test(runId)) {
            throw new Error("Identificador da sonda coordenada inválido.");
        }

        var meta = {
            schemaVersion: 1,
            runId: runId,
            ready: false,
            expectedWorkers: POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS,
            workerHandlers: POC03_THROTTLE_COORDINATED_WORKER_HANDLERS.slice(),
            triggerIds: [],
            createdAtMs: Date.now()
        };

        properties.setProperty(
            POC03_THROTTLE_COORD_META_KEY,
            JSON.stringify(meta)
        );
        properties.setProperty(POC03_THROTTLE_COORD_ARRIVAL_COUNT_KEY, "0");
        properties.setProperty(POC03_THROTTLE_PROBE_RUN_ID_KEY, runId);
        properties.setProperty(POC03_THROTTLE_PROBE_RESULTS_KEY, "[]");

        for (
            var index = 0;
            index < POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS;
            index += 1
        ) {
            var handlerName = POC03_THROTTLE_COORDINATED_WORKER_HANDLERS[index];
            var trigger = ScriptApp
                .newTrigger(handlerName)
                .timeBased()
                .after(POC03_THROTTLE_COORDINATED_TRIGGER_DELAY_MS)
                .create();

            var triggerId = String(trigger.getUniqueId());

            if (
                !triggerId
                || meta.triggerIds.indexOf(triggerId) >= 0
            ) {
                ScriptApp.deleteTrigger(trigger);
                throw new Error("COORDINATED_PROBE_TRIGGER_ID_INVALID_OR_DUPLICATE");
            }

            createdTriggers.push(trigger);
            meta.triggerIds.push(triggerId);
        }

        meta.ready = true;
        meta.armedAtMs = Date.now();

        properties.setProperty(
            POC03_THROTTLE_COORD_META_KEY,
            JSON.stringify(meta)
        );

        var summary = {
            test: "Persistent throttle coordinated concurrency probe",
            status: "READY",
            expectedWorkers: meta.expectedWorkers,
            createdTriggers: createdTriggers.length,
            triggerDelayMinimumMs: POC03_THROTTLE_COORDINATED_TRIGGER_DELAY_MS,
            metadataTimeoutMs: POC03_THROTTLE_COORDINATED_META_TIMEOUT_MS,
            barrierTimeoutMs: POC03_THROTTLE_COORDINATED_BARRIER_TIMEOUT_MS,
            artificialLockHoldMs: POC03_THROTTLE_COORDINATED_HOLD_MS,
            synchronization: "ALL_WORKERS_ARRIVAL_BARRIER",
            triggerSchedule: "ONE_SHOT_TIME_DRIVEN_MINIMUM_DELAY"
        };

        Logger.log(JSON.stringify(summary));
        return summary;
    } catch (error) {
        createdTriggers.forEach(function (trigger) {
            try {
                ScriptApp.deleteTrigger(trigger);
            } catch (deleteError) {
                // A limpeza das demais execuções continua.
            }
        });

        try {
            var failedProperties = poc03GetThrottleTestProperties_();
            failedProperties.getKeys().forEach(function (key) {
                if (key.indexOf(POC03_THROTTLE_TEST_PREFIX) === 0) {
                    failedProperties.deleteProperty(key);
                }
            });
        } catch (cleanupError) {
            // O erro original da preparação é preservado.
        }

        throw error;
    } finally {
        try {
            lock.releaseLock();
        } catch (error) {
            // No-op.
        }
    }
}

/**
 * Worker acionado por um gatilho de execução única.
 * Ele registra chegada, espera os dez workers na barreira e então disputa
 * o ScriptLock com espera artificial de 350 ms dentro da seção crítica.
 */
function poc03RunPersistentThrottleCoordinatedWorkerForIndex_(workerIndex, event) {
    var invocationStartedAtMs = Date.now();
    var workerHandler = Number.isInteger(workerIndex)
        && workerIndex >= 0
        && workerIndex < POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS
        ? POC03_THROTTLE_COORDINATED_WORKER_HANDLERS[workerIndex]
        : null;
    var eventTriggerUid = event && event.triggerUid !== undefined
        ? String(event.triggerUid)
        : null;
    var properties = null;
    var meta = null;
    var detail = null;
    var belongsToActiveRun = false;

    try {
        if (!workerHandler) {
            throw new Error("COORDINATED_PROBE_WORKER_INDEX_INVALID");
        }

        properties = poc03GetThrottleTestProperties_();

        var metadataDeadline = Date.now()
            + POC03_THROTTLE_COORDINATED_META_TIMEOUT_MS;

        while (Date.now() < metadataDeadline) {
            meta = poc03ReadCoordinatedThrottleMeta_(properties);

            if (meta && meta.ready === true) {
                break;
            }

            Utilities.sleep(100);
        }

        if (
            !meta
            || meta.ready !== true
            || meta.workerHandlers[workerIndex] !== workerHandler
        ) {
            throw new Error("COORDINATED_PROBE_METADATA_UNAVAILABLE");
        }

        if (
            !eventTriggerUid
            || meta.triggerIds[workerIndex] !== eventTriggerUid
        ) {
            detail = {
                status: "STALE_OR_UNMATCHED_TRIGGER",
                workerIndex: workerIndex,
                invocationStartedAtMs: invocationStartedAtMs,
                workerCompletedAtMs: Date.now(),
                runId: meta.runId
            };

            Logger.log(JSON.stringify({
                test: "Persistent throttle coordinated worker",
                workerIndex: workerIndex,
                status: detail.status
            }));

            return detail;
        }

        belongsToActiveRun = true;

        var arrivalLockResult = poc03AcquireThrottleScriptLock_();

        if (!arrivalLockResult.ok) {
            detail = {
                status: arrivalLockResult.reason,
                workerIndex: workerIndex,
                invocationStartedAtMs: invocationStartedAtMs,
                workerCompletedAtMs: Date.now(),
                runId: meta.runId
            };
            properties.setProperty(
                POC03_THROTTLE_COORD_DETAIL_PREFIX + workerIndex,
                JSON.stringify(detail)
            );
            return detail;
        }

        var arrivalLock = arrivalLockResult.lock;

        try {
            var currentMeta = poc03ReadCoordinatedThrottleMeta_(properties);

            if (!currentMeta || currentMeta.runId !== meta.runId) {
                throw new Error("COORDINATED_PROBE_RUN_MISMATCH");
            }

            var arrivalKey = POC03_THROTTLE_COORD_ARRIVAL_PREFIX + workerIndex;

            if (properties.getProperty(arrivalKey) !== null) {
                throw new Error("COORDINATED_PROBE_DUPLICATE_ARRIVAL");
            }

            properties.setProperty(arrivalKey, String(Date.now()));

            var arrivalCount = Number(
                properties.getProperty(POC03_THROTTLE_COORD_ARRIVAL_COUNT_KEY)
            );

            if (
                !Number.isInteger(arrivalCount)
                || arrivalCount < 0
                || arrivalCount >= POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS
            ) {
                throw new Error("COORDINATED_PROBE_ARRIVAL_COUNT_INVALID");
            }

            properties.setProperty(
                POC03_THROTTLE_COORD_ARRIVAL_COUNT_KEY,
                String(arrivalCount + 1)
            );
        } finally {
            try {
                arrivalLock.releaseLock();
            } catch (error) {
                // No-op.
            }
        }

        var barrierStartedAtMs = Date.now();
        var barrierDeadline = barrierStartedAtMs
            + POC03_THROTTLE_COORDINATED_BARRIER_TIMEOUT_MS;
        var arrivedCount = 0;

        while (Date.now() < barrierDeadline) {
            arrivedCount = Number(
                properties.getProperty(POC03_THROTTLE_COORD_ARRIVAL_COUNT_KEY)
            );

            if (
                Number.isInteger(arrivedCount)
                && arrivedCount === POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS
            ) {
                break;
            }

            Utilities.sleep(100);
        }

        if (arrivedCount !== POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS) {
            detail = {
                status: "BARRIER_TIMEOUT",
                workerIndex: workerIndex,
                invocationStartedAtMs: invocationStartedAtMs,
                barrierStartedAtMs: barrierStartedAtMs,
                workerCompletedAtMs: Date.now(),
                observedArrivals: arrivedCount,
                runId: meta.runId
            };

            properties.setProperty(
                POC03_THROTTLE_COORD_DETAIL_PREFIX + workerIndex,
                JSON.stringify(detail)
            );

            return detail;
        }

        var barrierPassedAtMs = Date.now();
        var workerCallStartedAtMs = Date.now();
        var timing = {};

        var result = poc03RegisterPersistentThrottleFailureForPoc_(
            POC03_THROTTLE_TEST_IDENTIFIER,
            workerCallStartedAtMs,
            {
                holdLockMs: POC03_THROTTLE_COORDINATED_HOLD_MS,
                timing: timing
            }
        );

        var workerCompletedAtMs = Date.now();

        detail = {
            runId: meta.runId,
            workerIndex: workerIndex,
            status: result.status,
            allowed: result.allowed,
            failureCount: result.failureCount,
            invocationStartedAtMs: invocationStartedAtMs,
            barrierStartedAtMs: barrierStartedAtMs,
            barrierPassedAtMs: barrierPassedAtMs,
            workerCallStartedAtMs: workerCallStartedAtMs,
            workerCompletedAtMs: workerCompletedAtMs,
            barrierWaitMs: barrierPassedAtMs - barrierStartedAtMs,
            lockRequestedAtMs: timing.lockRequestedAtMs || null,
            lockAcquiredAtMs: timing.lockAcquiredAtMs || null,
            lockReleasedAtMs: timing.lockReleasedAtMs || null,
            lockWaitMs: timing.lockWaitMs === undefined ? null : timing.lockWaitMs,
            lockHeldMs: timing.lockHeldMs === undefined ? null : timing.lockHeldMs
        };

        properties.setProperty(
            POC03_THROTTLE_COORD_DETAIL_PREFIX + workerIndex,
            JSON.stringify(detail)
        );

        Logger.log(JSON.stringify({
            test: "Persistent throttle coordinated worker",
            workerIndex: workerIndex,
            status: detail.status,
            lockWaitMs: detail.lockWaitMs,
            lockHeldMs: detail.lockHeldMs
        }));

        return detail;
    } catch (error) {
        detail = detail || {
            status: "WORKER_EXCEPTION",
            workerIndex: workerIndex,
            invocationStartedAtMs: invocationStartedAtMs,
            workerCompletedAtMs: Date.now(),
            runId: meta && meta.runId ? meta.runId : null,
            errorName: error && error.name ? String(error.name) : "Error"
        };

        if (
            belongsToActiveRun
            && properties
            && workerIndex >= 0
            && meta
            && meta.runId
        ) {
            try {
                properties.setProperty(
                    POC03_THROTTLE_COORD_DETAIL_PREFIX + workerIndex,
                    JSON.stringify(detail)
                );
            } catch (writeError) {
                // O resumo identificará o worker ausente.
            }
        }

        Logger.log(JSON.stringify({
            test: "Persistent throttle coordinated worker",
            workerIndex: workerIndex,
            status: detail.status
        }));

        return detail;
    } finally {
        if (workerHandler && eventTriggerUid) {
            poc03DeletePersistentThrottleCoordinatedTriggerByUid_(
                workerHandler,
                eventTriggerUid
            );
        }
    }
}

/** Remove apenas o gatilho exato que acionou este worker. */
function poc03DeletePersistentThrottleCoordinatedTriggerByUid_(
    handlerName,
    triggerUid
) {
    if (
        POC03_THROTTLE_COORDINATED_WORKER_HANDLERS.indexOf(handlerName) < 0
        || !triggerUid
        || typeof ScriptApp !== "object"
        || ScriptApp === null
        || typeof ScriptApp.getProjectTriggers !== "function"
        || typeof ScriptApp.deleteTrigger !== "function"
    ) {
        return false;
    }

    var triggers = ScriptApp.getProjectTriggers();

    for (var i = 0; i < triggers.length; i += 1) {
        try {
            if (
                triggers[i].getHandlerFunction() === handlerName
                && String(triggers[i].getUniqueId()) === String(triggerUid)
            ) {
                ScriptApp.deleteTrigger(triggers[i]);
                return true;
            }
        } catch (error) {
            // Segue para os demais gatilhos.
        }
    }

    return false;
}

// Cada gatilho tem um handler distinto para obter o índice do worker.
// O triggerUid do evento é convertido em string e comparado com o ID registrado
// ao criar o gatilho, impedindo que uma execução antiga entre em uma sonda nova.
function poc03RunPersistentThrottleCoordinatedWorker00_(event) {
    return poc03RunPersistentThrottleCoordinatedWorkerForIndex_(0, event);
}
function poc03RunPersistentThrottleCoordinatedWorker01_(event) {
    return poc03RunPersistentThrottleCoordinatedWorkerForIndex_(1, event);
}
function poc03RunPersistentThrottleCoordinatedWorker02_(event) {
    return poc03RunPersistentThrottleCoordinatedWorkerForIndex_(2, event);
}
function poc03RunPersistentThrottleCoordinatedWorker03_(event) {
    return poc03RunPersistentThrottleCoordinatedWorkerForIndex_(3, event);
}
function poc03RunPersistentThrottleCoordinatedWorker04_(event) {
    return poc03RunPersistentThrottleCoordinatedWorkerForIndex_(4, event);
}
function poc03RunPersistentThrottleCoordinatedWorker05_(event) {
    return poc03RunPersistentThrottleCoordinatedWorkerForIndex_(5, event);
}
function poc03RunPersistentThrottleCoordinatedWorker06_(event) {
    return poc03RunPersistentThrottleCoordinatedWorkerForIndex_(6, event);
}
function poc03RunPersistentThrottleCoordinatedWorker07_(event) {
    return poc03RunPersistentThrottleCoordinatedWorkerForIndex_(7, event);
}
function poc03RunPersistentThrottleCoordinatedWorker08_(event) {
    return poc03RunPersistentThrottleCoordinatedWorkerForIndex_(8, event);
}
function poc03RunPersistentThrottleCoordinatedWorker09_(event) {
    return poc03RunPersistentThrottleCoordinatedWorkerForIndex_(9, event);
}

/**
 * Resume a execução coordenada e só aprova concorrência se os intervalos
 * de execução realmente se sobrepuserem e houver espera mensurável pelo lock.
 */
function poc03RunPersistentThrottleCoordinatedConcurrencySummary() {
    var lockResult = poc03AcquireThrottleScriptLock_();

    if (!lockResult.ok) {
        throw new Error("Não foi possível obter lock para consultar a sonda coordenada.");
    }

    var lock = lockResult.lock;

    try {
        var properties = poc03GetThrottleTestProperties_();
        var meta = poc03ReadCoordinatedThrottleMeta_(properties);

        if (!meta || meta.ready !== true) {
            throw new Error("Sonda coordenada não foi inicializada.");
        }

        var details = [];

        for (
            var index = 0;
            index < POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS;
            index += 1
        ) {
            var rawDetail = properties.getProperty(
                POC03_THROTTLE_COORD_DETAIL_PREFIX + index
            );

            if (typeof rawDetail !== "string") {
                continue;
            }

            try {
                var detail = JSON.parse(rawDetail);

                if (
                    detail
                    && detail.runId === meta.runId
                    && detail.workerIndex === index
                ) {
                    details.push(detail);
                }
            } catch (error) {
                // Detalhe inválido é contado como worker ausente.
            }
        }

        var counted = details.filter(function (item) {
            return item.status === "COUNTED";
        }).length;
        var locked = details.filter(function (item) {
            return item.status === "LOCKED_AFTER_FAILURE";
        }).length;
        var blocked = details.filter(function (item) {
            return item.status === "BLOCKED";
        }).length;
        var lockUnavailable = details.filter(function (item) {
            return item.status === "LOCK_TIMEOUT"
                || item.status === "LOCK_UNAVAILABLE";
        }).length;
        var barrierTimeouts = details.filter(function (item) {
            return item.status === "BARRIER_TIMEOUT";
        }).length;
        var workerErrors = details.filter(function (item) {
            return item.status === "WORKER_EXCEPTION"
                || item.status === "PERSISTENCE_UNAVAILABLE"
                || item.status === "PERSISTED_STATE_CORRUPT";
        }).length;

        var waitSamples = details
            .filter(function (item) {
                return Number.isSafeInteger(item.lockWaitMs);
            })
            .map(function (item) {
                return item.lockWaitMs;
            })
            .sort(function (left, right) {
                return left - right;
            });

        var contendedWorkers = waitSamples.filter(function (value) {
            return value >= 25;
        }).length;
        var maxLockWaitMs = waitSamples.length > 0
            ? waitSamples[waitSamples.length - 1]
            : null;
        var concurrency = poc03AnalyzeThrottleConcurrencyIntervalsForPoc_(details);

        var stateKey = poc03GetThrottleTestStateKeyLocked_(
            properties,
            POC03_THROTTLE_TEST_IDENTIFIER
        );
        var stored = poc03ReadPersistentThrottleStateLocked_(
            properties,
            stateKey
        );

        var stateAvailable = stored.ok && stored.exists;

        var passed = stateAvailable
            && details.length === POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS
            && counted === 4
            && locked === 1
            && blocked === 5
            && lockUnavailable === 0
            && barrierTimeouts === 0
            && workerErrors === 0
            && concurrency.maxConcurrentWorkers > 1
            && concurrency.allWorkersOverlapAtOneInstant === true
            && contendedWorkers >= 2
            && stored.state.failureCount === POC03_LOGIN_FAILURE_LIMIT
            && stored.state.blockedUntilMs > Date.now();

        var summary = {
            test: "Persistent throttle — coordinated concurrent execution",
            status: passed ? "PASS" : "INCOMPLETE_OR_FAIL",
            expectedWorkers: POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS,
            observedWorkers: details.length,
            countedBeforeLimit: counted,
            lockedAtLimit: locked,
            rejectedWhileLocked: blocked,
            lockUnavailable: lockUnavailable,
            barrierTimeouts: barrierTimeouts,
            workerErrors: workerErrors,
            maxConcurrentWorkers: concurrency.maxConcurrentWorkers,
            pairwiseOverlapCount: concurrency.pairwiseOverlapCount,
            allWorkersOverlapAtOneInstant: concurrency.allWorkersOverlapAtOneInstant,
            commonOverlapWindowMs: concurrency.commonOverlapWindowMs,
            contendedWorkers: contendedWorkers,
            maxLockWaitMs: maxLockWaitMs,
            minLockWaitMs: waitSamples.length > 0 ? waitSamples[0] : null,
            finalFailureCount: stateAvailable ? stored.state.failureCount : null,
            finalStateBlocked: stateAvailable
                && stored.state.blockedUntilMs > Date.now(),
            synchronization: "SCRIPT_LOCK_WITH_ALL_WORKERS_BARRIER",
            persistence: "SCRIPT_PROPERTIES_TEST_ONLY",
            artificialLockHoldMs: POC03_THROTTLE_COORDINATED_HOLD_MS,
            metadataTimeoutMs: POC03_THROTTLE_COORDINATED_META_TIMEOUT_MS,
            barrierTimeoutMs: POC03_THROTTLE_COORDINATED_BARRIER_TIMEOUT_MS,
            intervalResolution: "DATE_NOW_MILLISECONDS",
            stateAvailable: stateAvailable
        };

        Logger.log(JSON.stringify(summary));
        return summary;
    } finally {
        try {
            lock.releaseLock();
        } catch (error) {
            // No-op.
        }
    }
}

/**
 * Lê os resultados consolidados das dez execuções independentes.
 * A aprovação exige 4 COUNTED, 1 LOCKED_AFTER_FAILURE e 5 BLOCKED.
 */
function poc03RunPersistentThrottleConcurrencySummary() {
    var lockResult = poc03AcquireThrottleScriptLock_();

    if (!lockResult.ok) {
        throw new Error("Não foi possível obter lock para consultar a sonda.");
    }

    var lock = lockResult.lock;

    try {
        var properties = poc03GetThrottleTestProperties_();
        var runId = properties.getProperty(POC03_THROTTLE_PROBE_RUN_ID_KEY);
        var rawResults = properties.getProperty(POC03_THROTTLE_PROBE_RESULTS_KEY);

        if (
            typeof runId !== "string"
            || !/^[0-9a-f]{32}$/.test(runId)
            || typeof rawResults !== "string"
        ) {
            throw new Error("Sonda de concorrência não foi inicializada.");
        }

        var results = JSON.parse(rawResults);

        if (!Array.isArray(results)) {
            throw new Error("Resultados da sonda estão corrompidos.");
        }

        var stateKey = poc03GetThrottleTestStateKeyLocked_(
            properties,
            POC03_THROTTLE_TEST_IDENTIFIER
        );
        var stored = poc03ReadPersistentThrottleStateLocked_(
            properties,
            stateKey
        );

        if (!stored.ok || !stored.exists) {
            throw new Error("Estado final persistido não está disponível.");
        }

        var counted = results.filter(function (item) {
            return item.status === "COUNTED";
        }).length;
        var locked = results.filter(function (item) {
            return item.status === "LOCKED_AFTER_FAILURE";
        }).length;
        var blocked = results.filter(function (item) {
            return item.status === "BLOCKED";
        }).length;
        var lockUnavailable = results.filter(function (item) {
            return item.status === "LOCK_TIMEOUT"
                || item.status === "LOCK_UNAVAILABLE";
        }).length;

        var passed = results.length === POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS
            && counted === 4
            && locked === 1
            && blocked === 5
            && lockUnavailable === 0
            && stored.state.failureCount === POC03_LOGIN_FAILURE_LIMIT
            && stored.state.blockedUntilMs > Date.now();

        var summary = {
            test: "Persistent throttle — independent execution contention",
            status: passed ? "PASS" : "INCOMPLETE_OR_FAIL",
            expectedWorkers: POC03_THROTTLE_CONCURRENCY_EXPECTED_WORKERS,
            observedWorkers: results.length,
            countedBeforeLimit: counted,
            lockedAtLimit: locked,
            rejectedWhileLocked: blocked,
            lockUnavailable: lockUnavailable,
            finalFailureCount: stored.state.failureCount,
            finalStateBlocked: stored.state.blockedUntilMs > Date.now(),
            synchronization: "SCRIPT_LOCK",
            persistence: "SCRIPT_PROPERTIES_TEST_ONLY",
            artificialLockHoldMs: POC03_THROTTLE_CONCURRENCY_HOLD_MS
        };

        Logger.log(JSON.stringify(summary));
        return summary;
    } finally {
        try {
            lock.releaseLock();
        } catch (error) {
            // No-op.
        }
    }
}
