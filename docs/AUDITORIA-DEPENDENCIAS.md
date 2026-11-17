# Auditoria e classificação das dependências

**Data de referência:** 17 de novembro de 2026  
**Escopo:** protótipo Conecta Local — branch de correção do PR #17.

## Decisão aplicada

As dependências `@tailwindcss/vite` e `tailwindcss` foram movidas de `dependencies` para `devDependencies`. Elas são utilizadas no processo de compilação (configuração do Vite e processamento do CSS), não pelo código executado no navegador depois do build.

O `package-lock.json` foi atualizado para refletir essa classificação. O CI agora executa duas verificações:

1. **Auditoria de produção bloqueante:** `npm audit --omit=dev --audit-level=high`. Uma vulnerabilidade alta ou crítica em dependência de produção reprova a validação.
2. **Auditoria completa informativa:** `npm audit --audit-level=high`, com `continue-on-error`. O relatório continua visível no log, mas vulnerabilidades pendentes exclusivamente na cadeia de ferramentas de desenvolvimento não impedem o restante dos testes e do build.

Essa separação não declara as vulnerabilidades de desenvolvimento corrigidas. Ela evita tratar ferramentas de build/lint como código distribuído em produção, mantendo os alertas visíveis.

## Alertas identificados na árvore completa

### picomatch 4.0.7 — CVE-2026-112366 / GHSA-fc5q-39xc-vjpf

- **Severidade reportada:** alta.
- **Origem na árvore:** dependência transitiva de ferramentas de build (Vite / Tailwind).
- **Condição descrita no advisory:** padrões glob (*glob patterns*) controlados por um atacante podem provocar backtracking excessivo em expressões regulares.
- **Estado em 17/11/2026:** a versão publicada consultada era 4.0.7 e ainda aparecia como afetada. Existem propostas de correção upstream, incluindo [PR #237](https://github.com/micromatch/picomatch/pull/237) e [PR #238](https://github.com/micromatch/picomatch/pull/238), mas não havia uma versão oficial corrigida publicada no npm confirmada nesta análise.
- **Tratamento:** não foi feito downgrade forçado do Vite, nem aplicado um override não oficial. O pacote permanece no toolchain de desenvolvimento; o protótipo não expõe uma entrada para o visitante enviar padrões glob ao Vite/picomatch. Isso reduz a exposição no runtime, mas não equivale a corrigir o código vulnerável da dependência.

Referências: [GitHub Advisory GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), [CVE-2026-112366 no NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-112366).

### minimatch 10.2.6 — GHSA-g3hv-75wg-m249

- **Severidade reportada:** moderada.
- **Origem na árvore:** cadeia de desenvolvimento do ESLint / `@eslint/config-array`.
- **Versão corrigida indicada pelo advisory:** 11.0.1.
- **Compatibilidade:** as versões presentes de ESLint e `@eslint/config-array` declaram intervalos `^10.x` para minimatch. Forçar a versão 11 ultrapassaria o intervalo declarado pelos consumidores.
- **Tratamento:** nenhuma substituição major forçada foi aplicada. O alerta permanece informado na auditoria completa e restrito à árvore de desenvolvimento.

Referência: [GitHub Advisory GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Critérios para encerrar os alertas

- Atualizar Vite/Tailwind quando a cadeia publicada utilizar uma versão oficial de picomatch fora do intervalo afetado ou quando o advisory for formalmente corrigido/revogado.
- Atualizar ESLint e sua cadeia quando houver versões compatíveis com minimatch 11.0.1 ou superior.
- Reexecutar `npm audit`, os testes automatizados, ESLint e o build.
- Remover o tratamento informativo e tornar a auditoria completa bloqueante novamente quando os alertas de desenvolvimento estiverem resolvidos.

**Nota:** auditoria de dependências não é certificação de segurança. A decisão acima classifica o risco por ambiente de execução e mantém explícitos os alertas ainda não resolvidos.
