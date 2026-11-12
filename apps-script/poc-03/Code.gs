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

