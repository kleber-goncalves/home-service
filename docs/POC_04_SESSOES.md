# POC-04 — sessão com cookie via gateway

> **Status:** PLANEJAMENTO DOCUMENTADO — não iniciada. Este arquivo não implementa sessão, cookie ou rota autenticada.
> **Data:** 2026-11-14
> **Escopo:** prova isolada da emissão/transporte de cookie e do ciclo de vida de sessão entre navegador, Vercel Function e Google Apps Script.
> **Ambiente obrigatório:** Vercel Preview e projeto/recursos Apps Script isolados, usando somente tokens, contas e registros sintéticos. Não usar credenciais, contas ou dados pessoais reais.

## 1. Ponto de partida confirmado

- PR #10 (POC-01 — transporte React/Vercel Function/Apps Script) integrado à `dev`.
- PR #11 (POC-02 — HMAC-SHA-256 e proteção contra replay) integrado à `dev`. O gateway continua restrito à allowlist de ações sintéticas `poc.*`; a POC-02 autentica a comunicação entre servidores, não o usuário final.
- PR #12 (POC-03 — investigação de senhas) integrado à `dev` em 2026-11-14. PBKDF2 via `Utilities` foi reprovado; Argon2id é apenas candidato experimental; nenhum comparador foi aprovado.
- PR #13 (interface visual demonstrativa de acesso) integrado à `dev` em 2026-11-14. `src/pages/AuthDemoPage.jsx` não envia credenciais, não persiste valores e não cria sessão.
- Os workflows pós-merge de #12 e #13 (`Validate Home Service` e `AI Context — Synchronize`) concluíram SUCCESS.
- `main` permanece fora do escopo e não deve receber alterações sem autorização expressa.
- A planilha estrutural do produto existe, mas não é armazenamento operacional. Nenhuma conta, sessão ou credencial de negócio deve ser criada nela nesta POC.

## 2. Objetivo

Comprovar, sem implementar autenticação, que uma sessão opaca pode ser transportada pelo cookie do domínio da aplicação sem expor o token ao JavaScript do React, à URL ou aos logs, enquanto o Apps Script continua como autoridade para criação, validação, expiração e revogação da sessão.

A prova deve separar quatro responsabilidades:

1. **Navegador:** armazena e envia automaticamente o cookie; não lê o token `HttpOnly`.
2. **Vercel Function:** gateway server-side; lê o cookie recebido, aplica controles de origem, encaminha o token ao Apps Script por envelope HMAC e define/expira o cookie na resposta HTTP. Não decide se a sessão é válida.
3. **Apps Script:** autoridade da sessão; aceita somente chamadas assinadas, valida estado/expiração/revogação e mantém somente o hash do token no registro de sessão.
4. **Google Sheets temporário:** pode ser usado como armazenamento de prova, em ambiente isolado. A aba estrutural `SESSOES` e o arquivo estrutural do produto não devem ser usados sem autorização e procedimento de teste específicos.

## 3. Limites e invariantes de segurança

- **Não é login:** não implementar cadastro, senha, KDF, comparação de senha, confirmação de e-mail, recuperação ou autorização de papel.
- **Somente valores sintéticos:** usar IDs de teste, tokens aleatórios de teste e registros descartáveis. Não coletar senha real nem pedir ao usuário que informe uma.
- **Token opaco de alta entropia:** a POC deve definir e testar a fonte criptográfica. Uma possibilidade a avaliar é gerar 32 bytes aleatórios no runtime Node da Vercel (`node:crypto`), mas não assumir a decisão sem testar o runtime e documentar a fronteira. Não presumir que UUID comum seja, por si só, prova suficiente de CSPRNG.
- **Hash de token:** se o token tiver alta entropia e for realmente aleatório, um digest rápido (por exemplo SHA-256) para indexar/validar o token é tecnicamente diferente do armazenamento de senha. Guardar somente o hash no lado Apps Script/Sheets; nunca persistir o token em claro.
- **Emissão condicionada:** a Function só deve enviar `Set-Cookie` depois que o Apps Script confirmar a criação da sessão sintética. Não criar cookie local que o backend não reconheça.
- **Sem exposição:** token em claro não pode aparecer no corpo JSON para o navegador, estado React, local/session storage, query string, fragmento, mensagens de erro, logs, telemetria ou commits.
- **Autoridade única:** Vercel não decide expiração, papel, proprietário ou revogação. O Apps Script valida o hash e o estado da sessão em cada operação protegida.
- **Fail closed:** assinatura ausente/inválida, token inválido, sessão inexistente/revogada/expirada, origem não permitida, resposta upstream malformada ou timeout não podem liberar acesso.
- Não ampliar a allowlist atual do gateway para ações de negócio durante a fase de desenho. Qualquer nova ação `poc.session.*` exige protocolo e testes próprios, HMAC, proteção contra replay e limite de payload.

## 4. Modelo de cookie candidato — não aprovado antes dos testes

Avaliar cookie host-only com nome prefixado `__Host-`, por exemplo `__Host-conecta_session`, e atributos:

- `HttpOnly`: impede leitura direta por JavaScript.
- `Secure`: exige HTTPS.
- `Path=/` e sem atributo `Domain`: requisitos do prefixo `__Host-`; o cookie fica vinculado ao host da aplicação.
- `SameSite=Lax` como ponto inicial de avaliação, não como defesa CSRF única.
- `Max-Age`/`Expires`: alinhados ao timeout de inatividade. O limite absoluto de 8 horas deve ser imposto e verificado no backend, não apenas pelo navegador.

Os nomes e atributos definitivos dependem dos testes. Preview e produção possuem hosts diferentes; não tentar compartilhar cookie entre domínios. Validar o comportamento real em HTTPS no Preview Vercel.

## 5. Regras de ciclo de vida a provar

A modelagem aprovada prevê 30 minutos de inatividade e duração absoluta máxima de 8 horas. O Apps Script deve ser a fonte de verdade:

- criação: gerar token opaco, registrar hash, identificador sintético da conta, criação, última atividade, expiração absoluta, estado e metadados mínimos definidos pela modelagem;
- validação: localizar pelo hash do token, verificar conta/session state, revogação, inatividade e expiração absoluta;
- atividade: atualizar `ultima_atividade_em` apenas após operação válida; eventual renovação do cookie não pode ultrapassar a expiração absoluta;
- logout: revogar a sessão atual no Apps Script e expirar o cookie na resposta da Function;
- revogação em lote: provar a invalidação de outras sessões sintéticas da mesma conta quando aplicável;
- expiração: demonstrar falha após 30 minutos sem atividade e após 8 horas absolutas, sem depender somente do navegador;
- erros: mensagens genéricas e sem token/hash ou detalhes internos.

O comportamento quando o Apps Script não confirma a revogação deve ser explícito: não retornar sucesso de logout sem confirmação do backend. A limpeza do cookie no navegador não deve ser confundida com revogação efetiva no servidor.

## 6. CSRF, Origin e fronteira browser → gateway

SameSite é defesa em profundidade, não substitui validação no servidor. A POC deve testar:

- comparação exata do cabeçalho `Origin` com os hosts/origens permitidos para cada ambiente; não aceitar curingas amplos como todo `*.vercel.app`;
- rejeição de origens externas, ausentes ou inesperadas nos métodos que alteram estado, com política documentada para chamadas sem `Origin`;
- avaliação de `Sec-Fetch-Site` como sinal adicional, nunca como única autorização;
- métodos não seguros apenas para ações de leitura; operações que alteram estado não podem usar GET;
- `Content-Type` e formato de requisição estritos;
- decidir e testar se será necessário token CSRF separado (por exemplo, padrão synchronizer ou double-submit); esse token não é o token de sessão e não pode substituí-lo;
- cookie ausente, adulterado ou enviado de outra origem deve falhar fechado.

## 7. Sequência recomendada de execução

1. **Revisão de código e desenho:** ler `api/backend.js`, funções de assinatura HMAC, contratos de POC-01/02 e o esquema de `SESSOES` em `docs/MODELAGEM_DADOS.md`. Confirmar o runtime Node real da Vercel e como a Function lê cabeçalhos/cookies e emite múltiplos cabeçalhos `Set-Cookie`.
2. **Contrato de ações sintéticas:** desenhar ações mínimas, por exemplo `poc.session.issue`, `poc.session.validate`, `poc.session.revoke`, sem habilitá-las antes da revisão do envelope, HMAC, nonce/replay, autorização sintética, timeouts e allowlist.
3. **Prova de cookie:** verificar em Preview que o navegador recebe o cookie com todos os atributos, envia-o automaticamente a uma rota same-origin e que o JavaScript não consegue ler o valor.
4. **Encaminhamento servidor-servidor:** provar que a Function lê o cookie no servidor e transmite o token somente pelo envelope assinado ao Apps Script. Verificar que o corpo da resposta ao navegador não contém token.
5. **Autoridade e persistência:** usar somente projeto Apps Script/planilha temporários e dados sintéticos. Testar hash do token, validação, atualização de atividade, revogação e expiração. Nunca usar o arquivo estrutural do negócio como bancada.
6. **CSRF/Origin:** executar casos positivos e negativos em origens distintas e no Preview; provar que solicitações cross-site não alteram estado.
7. **Falhas e observabilidade:** timeout, 4xx/5xx, upstream inválido, HMAC inválido, replay, token adulterado, cookie ausente, serviço indisponível e falha de revogação. Logs devem usar IDs de correlação não secretos.
8. **Limpeza:** remover somente registros/recursos temporários registrados por esta POC e comprovar o escopo da limpeza.
9. **CI e revisão:** adicionar testes automatizados para parsing de cookie, flags, origem, ciclo de vida e falha fechada; executar lint/build/POC-01/02/03 existentes; publicar Preview, revisar e obter aprovação antes de merge.

## 7.1. Matriz mínima de cenários e resultado esperado

| Cenário | Resultado esperado |
|---|---|
| Emissão de sessão sintética confirmada pelo Apps Script | A Function responde com cookie, sem devolver o token no JSON. |
| Emissão não confirmada, timeout ou resposta inválida do Apps Script | Nenhum cookie de sessão é emitido; resposta falha fechada. |
| Cookie no host Preview correto | Navegador armazena cookie host-only com flags aprovadas; não é compartilhado com Production ou outro Preview. |
| Inspeção por JavaScript (`document.cookie`) | Cookie de sessão não aparece, por ser `HttpOnly`. |
| Requisição same-origin subsequente | Navegador envia o cookie automaticamente; React não lê nem copia o token. |
| Cookie ausente, alterado ou desconhecido | Apps Script recusa a sessão; nenhum recurso protegido é liberado. |
| Assinatura HMAC ausente/inválida ou nonce repetido | Apps Script recusa a chamada interna; não há fallback sem assinatura. |
| Origin de outro host ou domínio | Gateway recusa operação que altera estado; nenhuma mutação ocorre. |
| Origin ausente | Aplicação segue a política explícita documentada; não assumir autorização por ausência do cabeçalho. |
| Sessão revogada | Validação seguinte falha mesmo que o navegador ainda possua cookie. |
| Inatividade superior a 30 minutos | Backend recusa a sessão; o TTL do cookie não é a única fonte de verdade. |
| Idade absoluta superior a 8 horas | Backend recusa a sessão mesmo que o cookie tenha sido renovado durante atividade. |
| Logout com revogação confirmada | Sessão fica inválida no Apps Script e cookie é expirado na resposta HTTP. |
| Logout sem confirmação do Apps Script | Interface não anuncia revogação concluída; falha é registrada sem token. |
| Falha do serviço Sheets/Apps Script | Operação protegida falha fechada e não expõe informação interna. |
| Consulta a logs e artefatos | Não há token, hash de token, cookie, segredo HMAC ou credencial; somente IDs de correlação não secretos. |

## 8. Critérios mínimos de aceite

- Cookie recebido no host correto com `HttpOnly`, `Secure`, `SameSite`, `Path` e escopo host-only comprovados no navegador.
- Token não aparece em JavaScript, JSON, URL, storage do navegador, logs ou artefatos.
- A Function não emite cookie antes da confirmação do Apps Script.
- Apps Script é a autoridade da sessão e guarda somente o hash do token.
- Chamadas internas permanecem assinadas por HMAC e protegidas contra replay.
- Sessão inválida, adulterada, revogada, ociosa ou absolutamente expirada é sempre recusada.
- Logout só é reportado como concluído após confirmação da revogação pelo Apps Script; o cookie também é expirado.
- Testes de CSRF/Origin demonstram bloqueio de solicitações externas e comportamento explícito para Origin ausente.
- Nenhum recurso estrutural/de negócio é alterado; todos os dados de prova são sintéticos e a limpeza é comprovada.
- CI, Preview e revisão manual passam. PASS em teste automatizado não equivale a auditoria ou certificação de segurança.

## 9. Fora do escopo e bloqueios que permanecem

- Esta POC não resolve o NO-GO da POC-03C sobre comparação de senha. O XOR continua não aprovado e `server/password-hash-compare.js` continua helper isolado; não integrar nenhum dos dois ao login.
- Não ligar `AuthDemoPage.jsx` ao backend, não criar usuário real, não conectar a aba `USUARIOS`, não enviar e-mail e não ativar recuperação.
- Não alterar `main`, não implantar em Production e não ampliar o Web App Apps Script atualmente isolado.
- Não interpretar este plano como autorização para criar endpoints de negócio.

**Regra de interrupção:** se o protocolo exigir transferir ao browser o token, confiar em estado controlado apenas pela Vercel, enfraquecer HMAC/replay, usar comparação de senha não aprovada ou expor recursos do projeto real para facilitar os testes, interromper a POC e reabrir o desenho.

## 10. Instruções para o próximo chat

Antes de executar qualquer mudança:

1. Ler `docs/AI_CONTEXT.md` por inteiro.
2. Ler este documento e `docs/ARQUITETURA_APPS_SCRIPT.md`.
3. Ler `docs/POC_03_ARMAZENAMENTO_SENHAS.md` nas seções 8.19 e 8.20 para respeitar NO-GO e resultados finais.
4. Confirmar o HEAD atual de `dev`, estado de `main`, PRs abertos, CI e deploys atuais; não confiar somente em SHAs salvos neste texto.
5. Inspecionar os arquivos reais e confirmar se a allowlist de `api/backend.js` ainda aceita somente ações `poc.*`.
6. Apresentar o desenho técnico da POC-04 antes de alterar código. Trabalhar em branch própria (sugestão: `feat/poc-04-session-cookie`) e usar exclusivamente valores sintéticos.
7. Não fazer merge nem publicar em Production sem autorização explícita do responsável.

