import { useState } from "react";
import { ArrowLeft, CheckCircle2, CircleAlert, LoaderCircle, Network, Server, XCircle } from "lucide-react";
import { executePocScenario } from "@/services/poc-01-api";

const scenarios = [
    {
        id: "echo",
        title: "Comunicação completa",
        description: "Envia uma mensagem pelo React, passa pela Function e recebe o eco do Apps Script.",
        expected: "HTTP 200 e redirecionamento confirmado",
    },
    {
        id: "simulatedError",
        title: "Erro lógico do Apps Script",
        description: "O Apps Script devolve um envelope de falha controlada.",
        expected: "HTTP 422",
    },
    {
        id: "invalidResponse",
        title: "Resposta inválida do Apps Script",
        description: "O Apps Script devolve texto que não é JSON.",
        expected: "HTTP 502",
    },
    {
        id: "invalidBrowserJson",
        title: "JSON inválido no navegador",
        description: "Envia um corpo malformado para validar a entrada da Function.",
        expected: "HTTP 400",
    },
    {
        id: "methodNotAllowed",
        title: "Método HTTP não permitido",
        description: "Tenta acessar o endpoint com GET.",
        expected: "HTTP 405",
    },
];

function statusTone(result) {
    if (!result) return "text-slate-500";
    return result.httpOk ? "text-emerald-700" : "text-rose-700";
}

export default function Poc01Page() {
    const [activeScenario, setActiveScenario] = useState("");
    const [lastResult, setLastResult] = useState(null);
    const [executionError, setExecutionError] = useState("");

    async function runScenario(scenario) {
        setActiveScenario(scenario);
        setExecutionError("");

        try {
            const result = await executePocScenario(scenario);
            setLastResult({ scenario, ...result });
        } catch (error) {
            setLastResult(null);
            setExecutionError(error instanceof Error ? error.message : "Não foi possível executar o teste.");
        } finally {
            setActiveScenario("");
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:py-12">
            <div className="mx-auto w-full max-w-5xl space-y-8">
                <header className="space-y-5">
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
                    >
                        <ArrowLeft size={16} aria-hidden="true" />
                        Voltar ao Conecta Local
                    </a>

                    <div className="space-y-3">
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
                            Prova de conceito 01
                        </span>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Comunicação React → Vercel → Apps Script
                        </h1>
                        <p className="max-w-3xl text-base leading-7 text-slate-600">
                            Teste isolado de envio, recebimento, redirecionamento do Content Service e tratamento de falhas.
                            Nenhuma conta, sessão, planilha ou arquivo do Drive é utilizado.
                        </p>
                    </div>
                </header>

                <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3 sm:p-6" aria-label="Etapas da comunicação">
                    <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Network size={22} aria-hidden="true" /></span>
                        <div><strong className="block text-sm">1. React + Vite</strong><span className="text-xs text-slate-500">Envia JSON same-origin</span></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-violet-50 p-3 text-violet-700"><Server size={22} aria-hidden="true" /></span>
                        <div><strong className="block text-sm">2. Vercel Function</strong><span className="text-xs text-slate-500">Valida e encaminha POST</span></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><CheckCircle2 size={22} aria-hidden="true" /></span>
                        <div><strong className="block text-sm">3. Apps Script</strong><span className="text-xs text-slate-500">Responde via Content Service</span></div>
                    </div>
                </section>

                <section className="space-y-4" aria-labelledby="scenarios-title">
                    <div>
                        <h2 id="scenarios-title" className="text-xl font-semibold">Cenários de teste</h2>
                        <p className="mt-1 text-sm text-slate-600">Execute um cenário por vez e confira o status HTTP e o corpo recebido.</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        {scenarios.map((scenario) => (
                            <article key={scenario.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="space-y-2">
                                    <h3 className="font-semibold">{scenario.title}</h3>
                                    <p className="text-sm leading-6 text-slate-600">{scenario.description}</p>
                                    <p className="text-xs font-medium text-slate-500">Resultado esperado: {scenario.expected}</p>
                                </div>
                                <button
                                    type="button"
                                    disabled={Boolean(activeScenario)}
                                    onClick={() => runScenario(scenario.id)}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {activeScenario === scenario.id
                                        ? <><LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> Executando...</>
                                        : "Executar teste"}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="space-y-3" aria-labelledby="result-title">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 id="result-title" className="text-xl font-semibold">Último resultado</h2>
                        {lastResult && (
                            <span className={`inline-flex items-center gap-2 text-sm font-semibold ${statusTone(lastResult)}`}>
                                {lastResult.httpOk
                                    ? <CheckCircle2 size={17} aria-hidden="true" />
                                    : <XCircle size={17} aria-hidden="true" />}
                                HTTP {lastResult.httpStatus}
                            </span>
                        )}
                    </div>

                    {executionError && (
                        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                            <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                            {executionError}
                        </div>
                    )}

                    {lastResult ? (
                        <pre className="max-h-[28rem] overflow-auto rounded-2xl bg-slate-950 p-5 text-xs leading-6 text-slate-100 sm:text-sm">
                            {JSON.stringify(lastResult, null, 2)}
                        </pre>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                            Nenhum teste executado nesta sessão.
                        </div>
                    )}
                </section>

                <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
                    <strong className="block">Limite de segurança desta POC</strong>
                    O Web App de teste é acessível anonimamente e ainda não valida HMAC. O script aceita somente mensagens sintéticas,
                    não acessa Sheets nem Drive e não implementa autenticação. Não utilize este endpoint em produção.
                </aside>
            </div>
        </main>
    );
}
