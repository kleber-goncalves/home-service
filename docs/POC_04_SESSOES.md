# POC-04 — sessão sintética com cookie via gateway

> **Status nesta branch (atualizado em 2026-11-20):** os ensaios sintéticos de cookie, CSRF/Origin, expiração controlada, replay, concorrência e logout foram concluídos. O armazenamento temporário, nonces, segredo Apps Script e variáveis Vercel exclusivas da branch foram limpos; o Preview está READY, mas a rota permanece desabilitada. O responsável apresentou uma versão atualizada do `Code.gs` do editor Apps Script sem as cinco funções auxiliares de ensaio; as rotinas permanentes foram preservadas. A revisão estática final identificou dois requisitos de hardening antes de qualquer reativação: limites de corpo/resposta aplicados após leitura integral e ausência de rate limiting/limite de emissão. Falhas reais de infraestrutura e testes de carga não foram executados. A PR #14 está pronta para revisão, aberta e não mesclada.
> **Branch:** `feat/poc-04-session-cookie`
> **Base inicial:** HEAD de `dev` em 2026-11-14; a branch foi reconciliada com `dev` pelo merge commit `51bf7d4b2d832ffa4927d0a8937bb303f476b89d` em 20/11/2026.
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

A validação seguinte, após a atualização dos documentos (`Validate Home Service` #43644117451), também concluiu SUCCESS: instalação/auditoria, POC-01/02/03/04, registro de ocorrências, ESLint e build passaram.

### Pendências registradas na revisão inicial (14/11/2026)

> **Histórico:** esta lista reflete o estado antes dos ensaios adicionais realizados em 20/11/2026. Os resultados e o estado atual estão consolidados na seção 12.

- Inspeção do cookie, testes negativos de Origin/Fetch Metadata, expiração ociosa/absoluta e ensaio operacional de replay/concorrência foram realizados posteriormente e estão descritos na seção 12.
- A limpeza do arquivo temporário, dos nonces e da propriedade de segredo do Apps Script foi concluída e registrada na seção 12.
- A remoção das funções auxiliares temporárias do editor do projeto Apps Script continua sem confirmação. Essas funções não aparecem no arquivo versionado `apps-script/poc-04/Code.gs`; não confundir isso com uma remoção confirmada no projeto remoto.
- Falhas reais de armazenamento, timeout e upstream não foram provocadas no serviço implantado; há cobertura simulada para parte dos caminhos na CI. Não foram executados testes de carga.

Nunca inserir variáveis POC-04 em Production. O estado do Preview após a retirada das variáveis está descrito na seção 12.

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
- O ensaio operacional no Apps Script implantado observou uma criação aceita e uma rejeição duplicada (`successfulCreates=1`, `duplicateRejections=1`), sob o lock do projeto. Isso comprova apenas o cenário sintético executado; não demonstra capacidade sob carga ou concorrência em escala.
- O token não é protegido contra XSS que execute código same-origin. A POC mede HttpOnly e CSRF, não certifica política CSP ou ausência de XSS.
- A consulta de Origin não autentica clientes HTTP fora do modelo de navegador.
- Nenhuma evidência aprova uso em Production ou escala comercial.

**Regra de interrupção:** se o token precisar sair para React, se o cookie for emitido antes da confirmação do Apps Script, se a assinatura/replay puder ser contornada ou se a planilha de negócio for necessária para facilitar os testes, interromper e reabrir o desenho.

## 12. Consolidação dos ensaios, limpeza e estado atual — 2026-11-20

### 12.1. Cookie, Origin e Fetch Metadata

- [x] Cookie de sessão observado com nome `__Host-conecta_poc04_session` e atributos `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`; sem atributo `Domain`. `document.cookie` não expôs o cookie.
- [x] Origin ausente no Preview: HTTP 403, `ORIGIN_REJECTED`.
- [x] Origin externa (`https://example.com`) com contexto cross-site: HTTP 403, `ORIGIN_REJECTED`.
- [x] Origin configurada corretamente com `Sec-Fetch-Site: cross-site`: HTTP 403, `ORIGIN_REJECTED`.
- [x] Origin configurada corretamente com `Sec-Fetch-Site: same-origin` atravessou o filtro de origem e chegou à validação da ação, que respondeu HTTP 400, `ACTION_NOT_ALLOWED`. Esse caso foi usado para distinguir o bloqueio de origem do bloqueio posterior da allowlist.

### 12.2. Expiração, replay e concorrência no Apps Script implantado

Os ensaios usaram exclusivamente registros e tokens sintéticos. Os horários dos registros foram preparados para representar sessões expiradas; não foi necessário aguardar 30 minutos ou 8 horas reais.

- [x] **Inatividade:** após preparar um registro sintético com atividade anterior ao limite, a validação retornou HTTP 401, `SESSION_EXPIRED`.
- [x] **Validade absoluta:** o registro foi preparado com criação 8h01min anterior e atividade 1 minuto anterior; a validação retornou HTTP 401, `SESSION_EXPIRED`. Isso confirmou que atividade recente não supera o limite absoluto.
- [x] **Replay:** a primeira chamada assinada com sessão sintética inexistente retornou envelope lógico de sessão inválida (`POC04_SESSION_INVALID`); a repetição idêntica foi recusada com `POC04_REPLAY_DETECTED`. O ensaio passou.
- [x] **Concorrência:** duas tentativas concorrentes de criação da mesma sessão sintética resultaram em `successfulCreates=1` e `duplicateRejections=1`. O ensaio passou com o lock do Apps Script.
- [x] A sessão temporária criada pelo ensaio operacional foi removida (`TEST_SESSION_REMOVED`).

Esses resultados demonstram os cenários preparados, não teste de carga, garantia de escala ou auditoria independente.

### 12.3. Limpeza do armazenamento e segredo

- [x] `poc04CleanupTemporaryStore()` executada sem erro; moveu para a lixeira somente a planilha registrada pela propriedade específica da POC-04 e removeu propriedades de nonce com o prefixo exclusivo da POC-04.
- [x] Verificação pós-limpeza: `spreadsheetRegistrationPresent=false`, `remainingNonceProperties=0` e, naquele momento, `secretPropertyPresent=true`.
- [x] `poc04RetireTemporarySecret()` executada posteriormente; log confirmou `status=PASS` e `secretPropertyRemoved=true`.
- [x] As quatro variáveis exclusivas da POC-04 foram removidas da Vercel no escopo da branch `feat/poc-04-session-cookie`: `POC04_ENABLED`, `POC04_ALLOWED_ORIGIN`, `POC04_APPS_SCRIPT_WEB_APP_URL` e `POC04_APPS_SCRIPT_HMAC_SECRET`. A consulta filtrada da branch retornou lista vazia.
- [x] Nenhuma variável Production foi removida ou criada nesta limpeza; as variáveis Preview compartilhadas com `dev` foram preservadas.

### 12.4. Deployment após desativação

Em 20/11/2026 foi criado um novo deployment Preview a partir do commit `1f8c97f08c1c296b72a34873eda91977dad93bb9` da branch `feat/poc-04-session-cookie`. O build terminou em **READY**:

- Deployment: `dpl_FMfuic8v7cQU3EavtMDmEyon8zCv`.
- URL: https://home-service-2mhluk5j4-kleber-goncalves-s-projects.vercel.app
- Branch alias: https://home-service-git-feat-poc-04-303944-kleber-goncalves-s-projects.vercel.app

Após as atualizações documentais, a branch recebeu outro deployment Preview no commit `6c9821a7cf00255e69562c3685eaef39f0d33119`, também concluído como **READY**:

- Deployment: `dpl_3qB79vEVjT9qzhT3BprxvriQeHhx`.
- URL: https://home-service-qg2tfilj7-kleber-goncalves-s-projects.vercel.app

O primeiro novo Preview foi criado a partir do commit Git da POC-04, sem reutilizar o snapshot de variáveis de um deployment antigo. O segundo Preview inclui somente as atualizações documentais. Como as quatro variáveis da POC-04 estão ausentes, a funcionalidade permanece desabilitada em ambos. O estado READY comprova o build/deployment, não uma nova validação funcional após a desativação. `dev`, `main` e Production não foram alteradas.

#### Reconciliação da branch com `dev` — 20/11/2026

A branch `feat/poc-04-session-cookie` recebeu a branch `dev` por um merge commit, preservando ambas as linhas de histórico e sem force push:

- Merge commit: `51bf7d4b2d832ffa4927d0a8937bb303f476b89d`.
- Primeiro pai: head anterior da POC-04 (`88d1853bb3f33b07120e4a894b306ffb4ee0a345`).
- Segundo pai: head de `dev` incorporado (`0af5a2e250c3adf444c6478e5becad3948451da0`).
- Comparação atual com `dev`: zero commits atrás; PR #14 reconhecida como `mergeable=true`. A PR continua em Draft e **não foi mesclada em `dev`**.
- O workflow `Validate Home Service` #44784729150 concluiu SUCCESS no commit de merge. POC-01/02/03/04, LOO, auditoria de dependências, registro de ocorrências, ESLint e build passaram.
- Os commits posteriores `d5a7217` e `0ecb4e4` atualizaram somente `docs/AI_CONTEXT.md`; não alteraram código, testes ou dependências.

O Preview do commit final documental `0ecb4e404261c3703a11156b355fb1722e6e9d2f` também concluiu **READY**:

- Deployment: `dpl_GemyvjMvtFRAWD4ohVXzTGyzY9Pm`.
- URL do deployment: https://home-service-4hkhyeu1z-kleber-goncalves-s-projects.vercel.app
- Alias da branch: https://home-service-git-feat-poc-04-303944-kleber-goncalves-s-projects.vercel.app

A consulta das variáveis Vercel escopadas à branch continuou retornando lista vazia. A rota permanece desabilitada. `dev`, `main` e Production não foram alteradas pela reconciliação.

### 12.5. Código versionado versus funções auxiliares do editor

O arquivo versionado `apps-script/poc-04/Code.gs` não contém as cinco funções temporárias de preparação/verificação usadas durante os ensaios. Em 20/11/2026, o responsável apresentou uma cópia atualizada do `Code.gs` proveniente do editor Apps Script, na qual as cinco definições abaixo já não aparecem:

- `poc04PrepareIdleExpirationTest()`
- `poc04PrepareAbsoluteExpirationTest()`
- `poc04RunMinimalOperationalChecks()`
- `poc04VerifyCleanupState()`
- `poc04RetireTemporarySecret()`

A conferência dessa cópia também preservou as rotinas permanentes `poc04InitializeTemporaryStore()` e `poc04CleanupTemporaryStore()`. Portanto, a remoção está confirmada no arquivo atualizado apresentado para revisão. O estado efetivamente salvo no editor remoto não pode ser consultado independentemente por esta integração; o responsável deve manter a versão apresentada salva no Apps Script antes de descartar o projeto de teste.

### 12.6. Revisão estática final e limites operacionais

A revisão estática do gateway, da Function e do Apps Script versionado foi realizada em 20/11/2026. Não foi identificado, no fluxo revisado, um bypass direto dos controles principais de origem, allowlist, HMAC, nonce, cookie, CSRF, expiração ou revogação. Isso não equivale a auditoria independente, certificação ou garantia de ausência de vulnerabilidades.

Foram registrados dois pontos de hardening que devem ser resolvidos antes de reativar a POC ou reutilizar o desenho fora do ambiente sintético:

1. **Limites após leitura integral:** o gateway verifica o limite de 8 KB da requisição depois de `request.text()`; o `Content-Length` é apenas uma checagem antecipada e pode estar ausente. De forma semelhante, a resposta upstream é integralmente lida com `upstream.text()` antes da verificação do limite de 8 KB. Os limites atuais não impedem que um corpo/resposta maior seja integralmente armazenado em memória antes da rejeição. A leitura deve aplicar o limite durante o consumo do stream.
2. **Ausência de rate limiting/limite de emissão:** a ação de emissão não possui limitação operacional por origem, janela ou capacidade máxima do armazenamento. Requisições repetidas poderiam aumentar registros sintéticos e consumir cotas do Google Sheets/Apps Script. Definir controles de abuso, capacidade e limpeza antes de reativar.

No estado atual, a rota segue desabilitada: as quatro variáveis exclusivas da POC-04 foram removidas do escopo da branch e o segredo correspondente foi retirado do Apps Script. Os pontos acima não foram corrigidos nesta atualização documental e **bloqueiam qualquer reativação**; não se deve adicionar novamente as variáveis para testar a rota sem tratar esses itens.

**Decisão do responsável — 20/11/2026:** não implementar esses dois itens de hardening neste ciclo. Eles permanecem registrados como limitações conhecidas e aceitas para o escopo acadêmico desta POC desativada. A decisão **não impede integrar o código à branch `dev`**, desde que a rota continue desativada e sem variáveis/segredos `POC04_*`. Os dois itens continuam impedindo qualquer reativação da POC, uso com credenciais reais ou promoção para Production.

Também permanecem não executados:

- Falhas reais de armazenamento/Sheets, timeout do upstream e indisponibilidade real do Apps Script. A CI simula parte desses caminhos, o que não equivale a uma falha real no serviço.
- Testes de carga, benchmark de throughput ou ensaios com usuários reais.
- Auditoria de segurança independente, análise formal de ameaças ou certificação.

A POC não implementa cadastro, login de usuários, recuperação de senha, papéis ou autorização real; não deve ser conectada a `AuthDemoPage.jsx`, à planilha estrutural ou à Production.

### 12.7. Estado para continuidade

- [x] Branch dedicada e rota independente.
- [x] Testes automatizados POC-04 na CI (33/33 na execução registrada); validação completa recente do código e do relatório documentado em #44785115959.
- [x] Ciclo sintético no navegador: emissão, cookie HttpOnly, validação, rotação CSRF, rejeição de CSRF incorreto, logout e revogação.
- [x] Origin/Fetch Metadata negativos no Preview real.
- [x] Expiração ociosa e absoluta com timestamps sintéticos controlados.
- [x] Replay e concorrência operacional com tokens e registros sintéticos.
- [x] Limpeza do armazenamento temporário, nonces e segredo do Apps Script.
- [x] Retirada das variáveis Vercel exclusivas da branch e Preview READY com a POC desabilitada.
- [x] Remoção das cinco funções auxiliares na cópia atualizada do `Code.gs` apresentada pelo responsável; rotinas permanentes preservadas.
- [x] Revisão estática final concluída e dois pontos de hardening registrados como bloqueios para reativação.
- [x] Falhas reais de infraestrutura e testes de carga registrados explicitamente como não executados.
- [ ] Corrigir leitura limitada por stream e implementar controles proporcionais de rate limiting/capacidade antes de qualquer reativação.
- [ ] Merge da PR #14 em `dev`, pendente de decisão explícita do responsável e dos checks aplicáveis.

A POC-04 concluiu os ensaios sintéticos previstos para cookie, Origin/CSRF, expiração, replay, concorrência e logout. O ambiente temporário foi limpo e a rota está desabilitada no Preview. A PR #14 está aberta e pronta para revisão, mas ainda não foi mesclada. Os itens de hardening acima impedem a reativação da rota; nada nesta POC representa autenticação real ou aprovação para Production.
