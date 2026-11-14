# POC-04 — sessão sintética com cookie via gateway

> **Status nesta branch:** IMPLEMENTAÇÃO AUTOMATIZÁVEL INICIADA — não implantada e ainda sem validação manual em Preview ou no Apps Script real.
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

**Estado:** candidato em código; precisa ser comprovado em navegador real. A escolha Strict deverá ser comparada com o comportamento de navegação esperado. Não afirmar proteção contra XSS: HttpOnly impede leitura pelo JavaScript, mas não impede que um script injetado execute ações same-origin.

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

## 9. Procedimento manual obrigatório

Executar somente depois de revisar e aprovar o diff desta branch:

1. Criar um projeto Google Apps Script independente. Não vincular à planilha estrutural ou a outro projeto Apps Script.
2. Copiar `apps-script/poc-04/Code.gs` para o projeto isolado.
3. Gerar um segredo novo de 32 bytes fora do repositório (por exemplo, `openssl rand -hex 32`). Configurar o mesmo valor em Script Properties (`POC04_HMAC_SECRET`) e na Vercel Preview (`POC04_APPS_SCRIPT_HMAC_SECRET`). Não enviar valores em chat, commit, documentação ou logs.
4. Executar manualmente `poc04InitializeTemporaryStore()`. Confirmar que cria arquivo novo com exatamente três abas e uma conta sintética. Guardar a URL do arquivo para inspeção e limpeza.
5. Criar implantação de Web App isolada, executar como implantador e permitir acesso anônimo somente para esta prova, se a política da conta permitir. A implantação deve conter exclusivamente a allowlist POC-04 e exigir HMAC.
6. Configurar `POC04_APPS_SCRIPT_WEB_APP_URL`, `POC04_ENABLED=true`, `POC04_ALLOWED_ORIGIN` igual à origem exata do Preview e `POC04_APPS_SCRIPT_HMAC_SECRET` apenas no ambiente Preview da Vercel.
7. Publicar a branch como Vercel Preview. Não criar Production deployment manual e não associar variáveis POC04 ao ambiente Production.
8. Validar emissão do cookie, atributos, `document.cookie`, recuperação CSRF, validação, atividade, logout, revogação, replay, Origin ausente/externa, sessão ociosa, expiração absoluta e falhas upstream.
9. Consultar somente metadados sanitizados no log; nunca copiar token, hash, cookie ou segredo.
10. Após guardar evidências e confirmar que os testes terminaram, executar `poc04CleanupTemporaryStore()` no Apps Script. Conferir que moveu somente o arquivo registrado para a lixeira e removeu somente o prefixo `POC04_GATEWAY_NONCE_V1_`. A limpeza não remove o segredo HMAC; removê-lo manualmente depois, se o projeto for descartado.

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
- [x] Testes automatizados adicionados à suíte e ao workflow.
- [ ] Executar `npm run test:poc04` no GitHub Actions.
- [ ] Executar lint, build e regressões POC-01/02/03.
- [ ] Revisar Vercel Preview da rota aninhada.
- [ ] Criar projeto Apps Script isolado e planilha temporária.
- [ ] Validar cookie/CSRF/Origin no navegador real.
- [ ] Validar expiração ociosa e absoluta, logout e revogação no Apps Script real.
- [ ] Limpar o arquivo temporário e segredos do projeto de teste.
- [ ] Revisão de segurança e PR para `dev`; não fazer merge sem aprovação.

A POC-04 ainda é um protótipo isolado, não uma autenticação de usuário.
