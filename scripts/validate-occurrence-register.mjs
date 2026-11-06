import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REGISTER_PATH = path.join(ROOT, "docs", "REGISTRO_DE_OCORRENCIAS.md");

const VALID_STATUSES = new Set([
    "ABERTO",
    "EM INVESTIGAÇÃO",
    "EM CORREÇÃO",
    "MITIGADO",
    "RESOLVIDO",
    "ACEITO (RISCO)",
    "NÃO REPRODUZIDO",
    "DUPLICADO",
]);

const VALID_PRIORITIES = new Set(["Crítica", "Alta", "Média", "Baixa"]);
const VALID_SEVERITIES = new Set([
    "Crítica",
    "Alta",
    "Média",
    "Baixa",
    "Informativa",
    "Não se aplica",
]);

const REQUIRED_SECTIONS = [
    "Resumo",
    "Impacto",
    "Investigação e causa raiz",
    "Correção ou mitigação",
    "Validação",
    "Prevenção",
    "Referências",
];

function reportError(message) {
    console.error("[occurrence-register] " + message);
}

function escapeRegex(value) {
    return value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

function getField(block, label) {
    const pattern = new RegExp(
        "^- \\*\\*" + escapeRegex(label) + ":\\*\\*\\s*(.+)$",
        "mi",
    );

    return block.match(pattern)?.[1]?.trim() ?? null;
}

function isRealDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function getSectionContent(block, sectionName) {
    const header = new RegExp("^#### " + escapeRegex(sectionName) + "\\s*$", "m");
    const match = header.exec(block);

    if (!match) {
        return null;
    }

    const remainder = block.slice(match.index + match[0].length);
    const nextHeading = remainder.search(/^#{2,4} /m);

    return (nextHeading === -1 ? remainder : remainder.slice(0, nextHeading)).trim();
}

async function main() {
    let document;

    try {
        document = await readFile(REGISTER_PATH, "utf8");
    } catch (error) {
        reportError("Não foi possível ler docs/REGISTRO_DE_OCORRENCIAS.md.");
        throw error;
    }

    const headingPattern = /^### (BUG|ERR|VULN|INC)-(\d{4}) — (.+)$/gm;
    const entries = [...document.matchAll(headingPattern)];
    const errors = [];
    const seenIds = new Set();
    const sequences = new Map();

    // Um registro vazio é válido: o projeto pode ainda não ter ocorrências documentadas.
    for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index];
        const [, prefix, number, title] = entry;
        const id = prefix + "-" + number;
        const start = entry.index + entry[0].length;
        const end = entries[index + 1]?.index ?? document.length;
        const block = document.slice(start, end);

        if (seenIds.has(id)) {
            errors.push(id + ": identificador duplicado.");
        }

        seenIds.add(id);

        const categorySequences = sequences.get(prefix) ?? [];
        categorySequences.push(Number(number));
        sequences.set(prefix, categorySequences);

        if (!title.trim()) {
            errors.push(id + ": título vazio.");
        }

        const requiredFields = [
            "Status",
            "Data de registro",
            "Data de descoberta",
            "Data de resolução",
            "Componente",
            "Prioridade",
            "Severidade",
            "Divulgação",
        ];

        for (const field of requiredFields) {
            if (!getField(block, field)) {
                errors.push(id + ": campo obrigatório ausente: " + field + ".");
            }
        }

        const status = getField(block, "Status");
        if (status && !VALID_STATUSES.has(status)) {
            errors.push(id + ": status inválido: " + status + ".");
        }

        const registrationDate = getField(block, "Data de registro");
        if (registrationDate && !isRealDate(registrationDate)) {
            errors.push(id + ": Data de registro deve ser uma data válida no formato YYYY-MM-DD.");
        }

        const discoveryDate = getField(block, "Data de descoberta");
        if (
            discoveryDate &&
            discoveryDate !== "Não determinada" &&
            !isRealDate(discoveryDate)
        ) {
            errors.push(id + ": Data de descoberta deve usar YYYY-MM-DD ou Não determinada.");
        }

        const resolutionDate = getField(block, "Data de resolução");
        if (status === "RESOLVIDO" && (!resolutionDate || !isRealDate(resolutionDate))) {
            errors.push(id + ": ocorrência resolvida precisa de Data de resolução válida.");
        }

        if (
            status !== "RESOLVIDO" &&
            resolutionDate &&
            resolutionDate !== "—" &&
            !isRealDate(resolutionDate)
        ) {
            errors.push(id + ": Data de resolução deve usar YYYY-MM-DD ou —.");
        }

        const priority = getField(block, "Prioridade");
        if (priority && !VALID_PRIORITIES.has(priority)) {
            errors.push(id + ": Prioridade inválida.");
        }

        const severity = getField(block, "Severidade");
        if (severity && !VALID_SEVERITIES.has(severity)) {
            errors.push(id + ": Severidade inválida.");
        }

        const disclosure = getField(block, "Divulgação")?.toUpperCase() ?? "";
        if (!disclosure.startsWith("PÚBLICA")) {
            errors.push(id + ": o registro público deve conter somente resumo com Divulgação: PÚBLICA.");
        }

        if (prefix === "VULN" && severity === "Não se aplica") {
            errors.push(id + ": vulnerabilidade precisa de severidade de segurança.");
        }

        for (const section of REQUIRED_SECTIONS) {
            const content = getSectionContent(block, section);
            if (!content) {
                errors.push(id + ": seção obrigatória ausente ou vazia: " + section + ".");
            }
        }
    }

    for (const [prefix, values] of sequences) {
        values.sort((a, b) => a - b);

        values.forEach((value, index) => {
            if (value !== index + 1) {
                errors.push(
                    prefix +
                        ": sequência esperada " +
                        String(index + 1).padStart(4, "0") +
                        ", encontrado " +
                        String(value).padStart(4, "0") +
                        ". Não reutilize nem pule IDs públicos.",
                );
            }
        });
    }

    if (errors.length > 0) {
        reportError(errors.length + " problema(s) encontrado(s):");
        errors.forEach((error) => reportError("- " + error));
        process.exitCode = 1;
        return;
    }

    if (entries.length === 0) {
        console.log("[occurrence-register] Nenhuma ocorrência registrada; estrutura do documento válida.");
        return;
    }

    const summary = [...sequences.entries()]
        .map(([prefix, values]) => prefix + ": " + values.length)
        .join("; ");

    console.log(
        "[occurrence-register] " + entries.length + " ocorrência(s) válida(s). " + summary,
    );
    console.log(
        "[occurrence-register] Validação estrutural concluída; a revisão de segurança continua humana.",
    );
}

main().catch((error) => {
    reportError(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
