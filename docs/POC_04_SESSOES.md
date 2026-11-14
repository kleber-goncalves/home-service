# POC-04 — sessão sintética com cookie via gateway

> **Status nesta branch:** IMPLEMENTAÇÃO IMPLANTADA EM PREVIEW — ciclo básico de sessão sintética validado manualmente em navegador e Apps Script em 2026-11-14. Permanecem pendentes testes de expiração, cenários de borda em ambiente real, concorrência/replay operacional e limpeza dos recursos temporários.
> **Branch:** `feat/poc-04-session-cookie`
> **Base:** HEAD de `dev` em 2026-11-14.
> **Escopo:** provar emissão/recepção de cookie, encaminhamento server-side, autoridade Apps Script, expiração, CSRF/Origin e logout/revogação, exclusivamente com dados sintéticos.
> **Fora do escopo:** cadastro, senha, login de usuários, recuperação, autorização de papéis, integração com `AuthDemoPage.jsx`, planilha estrutural e Production.

## 1. Segurança de escopo e ponto de partida

POC-01 (#10), POC-02 (#11), POC-03 (#12) e interface demonstrativa (#13) estão integradas à `dev`. A POC-03 não aprovou comparador de senha; o estado NO-GO da seção 8.19 permanece inalterado. A POC-04 não usa senha, KDF ou hash de senha.

A branch da POC-04 foi criada a partir do HEAD de `dev`. A rota nova é `/api/poc04/session`, separada de `/api/backend`; as três ações `poc.*` da POC-01/02 permanecem inalteradas.

A implementação usa exclusivamente a conta fixa `poc04-user-synthetic-001`, criada pela própria função de inicialização do Apps Script. Não recebe identificador de conta do navegador. O armazenamento é um arquivo Google Sheets temporário criado por `poc04InitializeTemporaryStore()`; a rotina de limpeza move para a lixeira somente o ID registrado pela POC-04 e remove somente o prefixo próprio de nonce.

## 2. Responsabilidades e fluxo

1. O navegador chama somente `POST /api/poc04/session` na mesma origem.
2. A Vercel valida método, JSON, tamanho, Origin HTTPS exata, `Sec-Fetch-Site` quando presente, ambiente Preview e flag explícita de habilitação.
3. Na emissão, a Vercel gera 32 bytes de token de sessão e 32 bytes de token CSRF com `node:crypto.randomBytes`.
4. A Function assina um envelope versionado com HMAC-SHA-256, timestamp, nonce aleatório de 256 bits, ação, requestId e SHA-256 do payload.
5. O Apps Script valida assinatura, relógio, allowlist e nonce de uso único; depois calcula os hashes e armazena os registros sintéticos.
6. Somente após confirmação de criação, a Vercel devolve `Set-Cookie`. O JSON de resposta contém o token CSRF, mas nunca o token de sessão.
7. O navegador envia o cookie automaticamente; a aplicação não precisa ler nem copiar o token de sessão.
8. O Apps Script valida a sessão, conta sintética, CSRF, estado, inatividade e validade absoluta; atualiza atividade somente numa validação autenticada válida.
9. Logout é confirmado somente após o Apps Script registrar `revogada_em`; só então a Vercel expira o cookie.

O token de sessão é encaminhado em claro somente no canal server-to-server protegido por TLS e HMAC. O Apps Script persiste somente SHA-256(token). O token CSRF também é mantido somente como hash no Apps Script; seu valor em claro é devolvido à aplicação para memória volátil e enviado no cabeçalho `X-CSRF-Token`.

## 3. Ações sintéticas e contrato público

Rota: `POST /api/poc04/session`  
Content-Type: `application/json`  
Campos públicos: `action`, `requestId`, `payload`. O payload público deve ser objeto vazio; tokens e dados de conta não podem ser enviados pelo navegador.

Ações permitidas:

| Ação | Requisito | Efeito |
|---|---|---|
| `poc.session.issue` | Sem cookie prévio | Gera sessão sintética e retorna cookie + CSRF |
| `poc.session.csrf` | Cookie válido | Rotaciona CSRF, sem atualizar atividade |
| `poc.session.validate` | Cookie + `X-CSRF-Token` | Valida e atualiza atividade |
| `poc.session.revoke` | Cookie + `X-CSRF-Token` | Revoga sessão atual e expira cookie após confirmação |

A ação `csrf` permite que uma página recarregada recupere um token CSRF em memória sem ler o cookie HttpOnly. Ela exige Origin exata, cookie válido, sessão não expirada e conta sintética ativa. A renovação não conta como atividade de sessão.

## 4. Cookie candidato

Nome: `__Host-conecta_poc04_session`

Atributos emitidos nesta implementação:

- `HttpOnly`
- `Secure`
- `Path=/`
- sem `Domain`
- `SameSite=Strict`
- `Max-Age` de no máximo 1.800 segundos, limitado ao tempo absoluto restante.

A implementação depende dos requisitos de prefixo `__Host-`: HTTPS, Path=/ e ausência de Domain. O cookie é host-only por implantação; Preview e Production não compartilham cookies.

**Evidência em Preview (2026-11-14):** a emissão real respondeu HTTP 200 e `document.cookie` não expôs o cookie de sessão. O logout confirmado foi seguido pela ausência do cookie no armazenamento do navegador. A suíte automatizada verifica `HttpOnly`, `Secure`, `Path=/`, `SameSite=Strict`, `Max-Age` e ausência de `Domain`; recomenda-se registrar uma inspeção visual dos atributos enquanto a sessão estiver ativa antes de encerrar o ambiente. A escolha Strict ainda deverá ser comparada com o fluxo de navegação esperado. Não afirmar proteção contra XSS: HttpOnly impede leitura pelo JavaScript, mas não impede que um script injetado execute ações same-origin.

## 5. Origin, Fetch Metadata e CSRF

A Function exige:

- `Origin` presente e igual, byte a byte, a `POC04_ALLOWED_ORIGIN` configurada;
- origem HTTPS, sem wildcard, caminho, query ou fragmento;
- se `Sec-Fetch-Site` estiver presente, deve ser `same-origin`;
- POST e JSON estrito;
- sem cabeçalhos CORS permissivos.

Origin ausente é rejeitado. `Sec-Fetch-Site` é defesa adicional, não autorização. Clientes HTTP arbitrários podem falsificar Origin; o limite é controle contra CSRF em navegadores, não autenticação do cliente.

O token CSRF é independente do cookie, gerado por CSPRNG, retornado no JSON e mantido em memória pela aplicação de teste. Validação e logout exigem `X-CSRF-Token`; o Apps Script compara o hash armazenado para a sessão. O token não é colocado em URL, localStorage, sessionStorage ou logs.

## 6. Ciclo de vida e armazenamento temporário

O Apps Script é a autoridade. Regras:

- token de sessão de 32 bytes aleatórios (256 bits), codificado Base64URL;
- persistência exclusiva de SHA-256(token) em `SESSOES.token_hash`;
- 30 minutos de inatividade;
- 8 horas absolutas desde `criado_em`;
- validade da conta sintética é verificada nas operações de sessão;
- atualização de `ultima_atividade_em` apenas após validação e CSRF corretos;
- revogação preenchendo `revogada_em`;
- uso de `LockService.getScriptLock()` nas operações de nonce e ciclo de vida;
- falha de lock, configuração, armazenamento, assinatura, replay ou resposta upstream: fail closed.

A planilha temporária contém:
- `POC04_CONTAS`: uma única conta de demonstração fixa e estado active;
- `SESSOES`: os sete campos da modelagem aprovada, sem coluna adicional;
- `POC04_CSRF`: `id_sessao` e `csrf_hash`, separado para preservar o esquema de sete campos de SESSOES.

A criação grava CSRF e sessão sob lock. Se uma etapa falhar, o registro de CSRF é removido quando possível; sessão sem registro CSRF não valida. Sheets não fornece transação distribuída para estas duas abas; validar falhas parciais e documentar resíduos sintéticos antes de limpeza.

## 7. Variáveis e isolamento de ambiente

Variáveis server-side exclusivas:

| Variável | Finalidade |
|---|---|
| `POC04_ENABLED` | Deve ser exatamente `true` para habilitar |
| `POC04_ALLOWED_ORIGIN` | Origem HTTPS exata do Preview |
| `POC04_APPS_SCRIPT_WEB_APP_URL` | URL do Web App isolado da POC-04 |
| `POC04_APPS_SCRIPT_HMAC_SECRET` | Segredo distinto da POC-02, 32 bytes em 64 hex |

A Function exige também `VERCEL_ENV=preview`. Em qualquer outro ambiente responde 404 mesmo se `POC04_ENABLED=true`. Não adicionar essas variáveis em Production. O segredo correspondente no Apps Script fica em Script Properties como `POC04_HMAC_SECRET`; nunca registrar ou documentar seu valor.

## 8. Arquivos nesta branch

- `api/poc04/session.js` — entrypoint da Vercel Function.
- `server/poc04-session-gateway.js` — validação, HMAC, cookie, Origin, CSRF e transporte.
- `apps-script/poc-04/Code.gs` — endpoint isolado, armazenamento sintético, sessão, CSRF, expiração, logout e limpeza.
- `tests/poc04/gateway.test.js` — contrato HTTP, cookie, Origin, assinatura, falhas fechadas e ausência de token no JSON.
- `tests/poc04/apps-script.test.js` — harness Node/VM para assinatura, persistência simulada, CSRF, expiração e revogação.
- `package.json` / `validate.yml` — comando `npm run test:poc04` incluído na CI.
- `.env.example` — nomes de variáveis sem valores.

Os testes Node/VM não substituem chamadas reais ao Apps Script nem validação de cookies em navegador.

## 9. Validação manual no Preview e evidências

A implantação isolada e o ciclo básico foram executados em 2026-11-14 com dados exclusivamente sintéticos:

1. [x] Projeto Apps Script independente criado; `apps-script/poc-04/Code.gs` foi publicado nesse projeto, separado da planilha estrutural.
2. [x] Segredo POC-04 próprio configurado em Script Properties (`POC04_HMAC_SECRET`) e na Vercel Preview (`POC04_APPS_SCRIPT_HMAC_SECRET`). Os valores não foram incluídos no repositório ou na documentação.
3. [x] `poc04InitializeTemporaryStore()` executada; o responsável confirmou a criação das três abas `POC04_CONTAS`, `SESSOES` e `POC04_CSRF`.
4. [x] Web App implantado como implantador, com acesso anônimo somente para esta prova. A abertura de `/exec` por GET retornou `POC04_METHOD_NOT_ALLOWED`, conforme esperado.
5. [x] Quatro variáveis POC-04 configuradas somente no ambiente Preview e escopadas à branch `feat/poc-04-session-cookie`; redeploy concluído como READY.
6. [x] Emissão real no Preview: HTTP 200, `success=true`, `created=true`, token CSRF recebido e token de sessão não disponibilizado ao JavaScript.
7. [x] Validação real da sessão com o cookie automático do navegador: HTTP 200 e `valid=true`.
8. [x] Recuperação/rotação CSRF: HTTP 200 e `csrfReady=true`; a validação subsequente com o novo CSRF retornou HTTP 200 e `valid=true`.
9. [x] CSRF falso, no formato esperado: HTTP 403 e `CSRF_REJECTED`.
10. [x] Logout: HTTP 200 e `revoked=true`; uma validação subsequente retornou HTTP 401 e `SESSION_INVALID`.
11. [x] Inspeção posterior pelo responsável: `SESSOES.revogada_em` preenchido e cookie `__Host-conecta_poc04_session` ausente do armazenamento do navegador.
12. [x] `document.cookie` não revelou o cookie de sessão enquanto a sessão estava ativa.

### Validação automatizada

A execução GitHub Actions `Validate Home Service` #43631016460, associada ao commit `a1087821331aa23bef81735156c7a245079e458a`, concluiu SUCCESS:

- POC-01: 12/12.
- POC-02: 20/20.
- POC-03: 26/26.
- POC-04: 33/33.
- Registro de ocorrências, ESLint e build: SUCCESS.
- Auditoria de dependências: passou no limite configurado `--audit-level=high`; três alertas moderados transitivos relacionados a `minimatch` permanecem conhecidos e não foram resolvidos por esta POC.

### Pendências antes de encerrar a prova e decidir o merge

- [ ] Inspecionar visualmente, com sessão ativa, os atributos efetivos do cookie no DevTools (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` e ausência de `Domain`).
- [ ] Validar no Preview real Origin ausente/externa e `Sec-Fetch-Site` cross-site; a rejeição equivalente possui cobertura automatizada, mas não foi repetida manualmente no navegador.
- [ ] Validar expiração real por inatividade (30 minutos) e absoluta (8 horas).
- [ ] Executar ensaio operacional de replay e concorrência/LockService no Apps Script implantado.
- [ ] Exercitar falha real de armazenamento, timeout e falha upstream; a CI contém testes simulados para parte desses caminhos.
- [ ] Depois de guardar evidências, executar `poc04CleanupTemporaryStore()`, confirmar que somente o arquivo temporário registrado foi enviado à lixeira e remover manualmente a propriedade `POC04_HMAC_SECRET` se o projeto for descartado.
- [ ] Atualizar a documentação com o resultado da limpeza, realizar revisão de segurança e decidir se a PR #14 pode sair de Draft. Não fazer merge antes dessas pendências e da revisão.

O deployment e a planilha temporária devem permanecer isolados e ser usados somente para concluir os testes listados. Nunca inserir variáveis POC-04 em Production.

## 10. Matriz de cenários e critérios de aceite

| Cenário | Resultado esperado |
|---|---|
| Emissão confirmada pelo Apps Script | Cookie definido; JSON contém CSRF, nunca token de sessão |
| Emissão recusada/timeout/upstream inválido | Nenhum cookie de sessão |
| Ambiente não Preview ou flag false | HTTP 404, sem chamada upstream |
| Origin ausente/diferente | HTTP 403, sem chamada upstream |
| Sec-Fetch-Site cross-site/site | HTTP 403 |
| Cookie HttpOnly | Ausente de document.cookie |
| Cookie de outro host | Não enviado pelo navegador ao host atual |
| Cookie duplicado, ausente ou malformado | Falha fechada |
| HMAC ausente/inválido ou nonce repetido | Apps Script recusa |
| CSRF ausente/incorreto | HTTP 403 e nenhuma atualização de atividade |
| Sessão revogada/desconhecida | HTTP 401 |
| Inatividade de 30 minutos | Backend recusa e gateway expira cookie |
| Idade absoluta superior a 8 horas | Backend recusa mesmo após atividade recente |
| Logout confirmado | Apps Script revoga; gateway expira cookie |
| Falha ao revogar | Gateway não confirma logout nem limpa cookie |
| Falha de Sheets/lock | Fail closed |
| Inspeção de JSON, URL, storage e logs | Nenhum token de sessão ou hash persistido é exposto |

## 11. Limites e bloqueios que permanecem

- Esta POC não resolve o NO-GO da POC-03C. Não integrar KDF, comparador XOR ou helper Node de comparação de senha.
- Não conectar a tela `AuthDemoPage.jsx`, não aceitar e-mails ou senhas e não usar contas de negócio.
- Não usar a planilha estrutural do produto.
- Não implementar operação administrativa, perfil, catálogo ou autorização real.
- O teste automatizado não demonstra contenção real do ScriptLock; executar teste manual concorrente separado antes de alegar concorrência comprovada.
- O token não é protegido contra XSS que execute código same-origin. A POC mede HttpOnly e CSRF, não certifica política CSP ou ausência de XSS.
- A consulta de Origin não autentica clientes HTTP fora do modelo de navegador.
- Nenhuma evidência aprova uso em Production ou escala comercial.

**Regra de interrupção:** se o token precisar sair para React, se o cookie for emitido antes da confirmação do Apps Script, se a assinatura/replay puder ser contornada ou se a planilha de negócio for necessária para facilitar os testes, interromper e reabrir o desenho.

## 12. Estado de validação nesta revisão

- [x] Branch dedicada criada a partir da `dev`.
- [x] Rota independente, com allowlist POC-04 própria.
- [x] Conta e armazenamento exclusivamente sintéticos no código.
- [x] Testes automatizados adicionados à suíte e ao workflow; CI atual concluída com sucesso (POC-04 33/33).
- [x] Projeto Apps Script independente, Web App e armazenamento temporário implantados.
- [x] Variáveis configuradas exclusivamente no Preview da branch dedicada e redeploy READY.
- [x] Emissão, validação e renovação CSRF testadas no navegador real.
- [x] Rejeição de CSRF incorreto testada no navegador real.
- [x] Logout, revogação no Apps Script e rejeição posterior da sessão testados no navegador real.
- [x] `SESSOES.revogada_em` e remoção do cookie após logout conferidos pelo responsável.
- [ ] Inspeção visual de todos os atributos do cookie enquanto ativo.
- [ ] Origin e Fetch Metadata negativos no Preview real.
- [ ] Expiração ociosa e absoluta no Apps Script implantado.
- [ ] Replay e concorrência operacional no Apps Script implantado.
- [ ] Falhas reais de armazenamento, timeout e upstream.
- [ ] Executar e comprovar `poc04CleanupTemporaryStore()` e remover a propriedade do segredo quando o projeto for descartado.
- [ ] Revisão de segurança e decisão sobre retirar a PR #14 de Draft; não fazer merge enquanto houver pendências relevantes.

A POC-04 comprovou o ciclo básico de sessão sintética no ambiente Preview, mas continua isolada e não constitui autenticação de usuários.
