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
    var expected = "4ddcd8f60b98be21830cee5ef22701f9"\
        + "641a4418d04c0414aeff08876b34ab56"\
        + "a1d425a1225833549adb841b51c9b317"\
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
