import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DOC_PATH = path.join(ROOT, "docs", "AI_CONTEXT.md");
const START_MARKER = "<!-- BEGIN AUTO-GENERATED SECTION -->";
const END_MARKER = "<!-- END AUTO-GENERATED SECTION -->";

function git(args) {
    return execFileSync("git", args, {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    }).trimEnd();
}

function markdownCell(value) {
    return String(value ?? "")
        .replaceAll("|", "\\|")
        .replace(/[\r\n]+/g, " ")
        .trim();
}

function parseCommitLine(line) {
    const [sha = "", date = "", ...subject] = line.split("\t");
    return { sha, date, subject: subject.join("\t") };
}

async function listFiles(relativeDirectory, predicate = () => true) {
    const absoluteDirectory = path.join(ROOT, relativeDirectory);
    const found = [];

    async function walk(currentAbsolute, currentRelative) {
        let entries;

        try {
            entries = await readdir(currentAbsolute, { withFileTypes: true });
        } catch {
            return;
        }

        entries.sort((a, b) => a.name.localeCompare(b.name, "en"));

        for (const entry of entries) {
            const absolute = path.join(currentAbsolute, entry.name);
            const relative = path.posix.join(currentRelative, entry.name);

            if (entry.isDirectory()) {
                await walk(absolute, relative);
            } else if (entry.isFile() && predicate(relative)) {
                found.push(relative);
            }
        }
    }

    await walk(absoluteDirectory, relativeDirectory);
    return found;
}

async function listTopLevelDirectories(relativeDirectory) {
    const absoluteDirectory = path.join(ROOT, relativeDirectory);

    try {
        const entries = await readdir(absoluteDirectory, { withFileTypes: true });

        return entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => path.posix.join(relativeDirectory, entry.name) + "/")
            .sort((a, b) => a.localeCompare(b, "en"));
    } catch {
        return [];
    }
}

async function readEnvironmentNames() {
    try {
        const source = await readFile(path.join(ROOT, ".env.example"), "utf8");

        return [...new Set(
            source
                .split(/\r?\n/)
                .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1])
                .filter(Boolean),
        )].sort((a, b) => a.localeCompare(b, "en"));
    } catch {
        return [];
    }
}

async function buildGeneratedSection() {
    const packageJson = JSON.parse(
        await readFile(path.join(ROOT, "package.json"), "utf8"),
    );

    const targetSha = process.env.AI_CONTEXT_COMMIT_SHA || git(["rev-parse", "HEAD"]);
    const commitMeta = parseCommitLine(
        git(["show", "-s", "--format=%H%x09%ad%x09%s", "--date=iso-strict", targetSha]),
    );
    const history = git([
        "log",
        "-8",
        "--date=short",
        "--format=%h%x09%ad%x09%s",
        targetSha,
    ])
        .split("\n")
        .filter(Boolean)
        .map(parseCommitLine);

    const workflowFiles = await listFiles(
        ".github/workflows",
        (file) => /\.ya?ml$/i.test(file),
    );
    const scriptFiles = await listFiles(
        "scripts",
        (file) => /\.(?:mjs|cjs|js)$/i.test(file),
    );
    const sourceFiles = await listFiles(
        "src",
        (file) => /\.(?:js|jsx)$/i.test(file),
    );
    const sourceDirectories = await listTopLevelDirectories("src");
    const environmentNames = await readEnvironmentNames();

    const workflowRows = [];
    for (const file of workflowFiles) {
        let title = file;
        try {
            const source = await readFile(path.join(ROOT, file), "utf8");
            title = source.match(/^name:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") || file;
        } catch {
            // Mantém o caminho como título se não for possível ler o arquivo.
        }
        workflowRows.push("- " + markdownCell(file) + " — " + markdownCell(title));
    }

    const dependencyRows = Object.entries(packageJson.dependencies || {})
        .sort(([a], [b]) => a.localeCompare(b, "en"));
    const devDependencyRows = Object.entries(packageJson.devDependencies || {})
        .sort(([a], [b]) => a.localeCompare(b, "en"));
    const npmScripts = Object.entries(packageJson.scripts || {});
    const branchName =
        process.env.GITHUB_REF_NAME ||
        process.env.GITHUB_HEAD_REF ||
        git(["branch", "--show-current"]) ||
        "não informada";

    const lines = [
        "## Snapshot automatizado do repositório",
        "",
        "> Gerado por scripts/update-ai-context.mjs. Não edite manualmente o conteúdo entre os marcadores.",
        "",
        "- **Commit de referência:** " + markdownCell(commitMeta.sha),
        "- **Data do commit:** " + markdownCell(commitMeta.date),
        "- **Mensagem do commit:** " + markdownCell(commitMeta.subject),
        "- **Branch desta execução:** " + markdownCell(branchName),
        "- **Projeto declarado:** " + markdownCell(packageJson.name) + "@" + markdownCell(packageJson.version),
        "- **Scripts npm:** " + npmScripts.length,
        "- **Dependências de runtime:** " + dependencyRows.length,
        "- **Dependências de desenvolvimento:** " + devDependencyRows.length,
        "- **Workflows:** " + workflowFiles.length,
        "- **Scripts de automação:** " + scriptFiles.length,
        "",
        "### Scripts npm",
        "",
        "| Comando | Definição |",
        "|---|---|",
        ...npmScripts.map(([name, command]) =>
            "| npm run " + markdownCell(name) + " | " + markdownCell(command) + " |",
        ),
        "",
        "### Variáveis declaradas no .env.example",
        "",
        "> Somente os nomes são listados; valores nunca são lidos nem publicados.",
        "",
        ...(environmentNames.length
            ? environmentNames.map((name) => "- " + markdownCell(name))
            : ["- Nenhuma variável declarada."]),
        "",
        "### Dependências de runtime",
        "",
        "| Pacote | Versão declarada |",
        "|---|---|",
        ...dependencyRows.map(([name, version]) =>
            "| " + markdownCell(name) + " | " + markdownCell(version) + " |",
        ),
        "",
        "### Dependências de desenvolvimento",
        "",
        "| Pacote | Versão declarada |",
        "|---|---|",
        ...devDependencyRows.map(([name, version]) =>
            "| " + markdownCell(name) + " | " + markdownCell(version) + " |",
        ),
        "",
        "### Workflows do GitHub Actions",
        "",
        ...(workflowRows.length ? workflowRows : ["- Nenhum workflow encontrado."]),
        "",
        "### Scripts de automação",
        "",
        ...(scriptFiles.length
            ? scriptFiles.map((file) => "- " + markdownCell(file))
            : ["- Nenhum script encontrado."]),
        "",
        "### Arquivos JavaScript/JSX em src/",
        "",
        ...(sourceFiles.length
            ? sourceFiles.map((file) => "- " + markdownCell(file))
            : ["- Nenhum arquivo JavaScript/JSX encontrado."]),
        "",
        "### Diretórios principais de src/",
        "",
        ...(sourceDirectories.length
            ? sourceDirectories.map((directory) => "- " + markdownCell(directory))
            : ["- Nenhum diretório encontrado."]),
        "",
        "### Oito commits recentes até o commit de referência",
        "",
        "| Commit | Data | Mensagem |",
        "|---|---|---|",
        ...history.map((item) =>
            "| " + markdownCell(item.sha) + " | " +
            markdownCell(item.date) + " | " +
            markdownCell(item.subject) + " |",
        ),
    ];

    return lines.join("\n");
}

async function main() {
    const original = await readFile(DOC_PATH, "utf8");
    const startCount = original.split(START_MARKER).length - 1;
    const endCount = original.split(END_MARKER).length - 1;

    if (startCount !== 1 || endCount !== 1) {
        throw new Error("AI_CONTEXT.md precisa conter exatamente um marcador de início e um de fim.");
    }

    const start = original.indexOf(START_MARKER) + START_MARKER.length;
    const end = original.indexOf(END_MARKER);

    if (end < start) {
        throw new Error("Os marcadores da seção automatizada estão fora de ordem.");
    }

    const generated = await buildGeneratedSection();
    const expected =
        original.slice(0, start) +
        "\n\n" +
        generated +
        "\n\n" +
        original.slice(end);

    if (expected === original) {
        console.log("AI_CONTEXT.md já está sincronizado com o snapshot do repositório.");
        return;
    }

    await writeFile(DOC_PATH, expected, "utf8");
    console.log("Snapshot automatizado atualizado em docs/AI_CONTEXT.md.");
}

main().catch((error) => {
    console.error("Falha ao atualizar o contexto para IAs:", error);
    process.exitCode = 1;
});
