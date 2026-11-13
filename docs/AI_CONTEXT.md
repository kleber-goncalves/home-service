# Conecta Local — Contexto técnico para IAs

> Documento de continuidade do projeto. Leia antes de sugerir ou realizar alterações. Reúne propósito, decisões, arquitetura planejada, estado implementado, regras de manutenção e limitações. A seção de snapshot ao final é atualizada pelo GitHub Actions.

## 1. Instruções para a IA que assumir o projeto

1. Leia este documento por inteiro antes de propor mudanças, especialmente em uma conversa nova.
2. Confirme a branch, o commit e o estado atual do repositório. O snapshot registra a revisão usada na última sincronização; commits posteriores podem existir.
3. Trate o código da branch em análise como fonte de verdade para o comportamento implementado. A documentação fornece contexto, mas pode ficar desatualizada.
4. Diferencie explicitamente **implementado**, **decisão funcional aprovada**, **validação técnica pendente** e **planejado**. Não apresente ideias futuras como funcionalidades prontas.
5. O projeto utiliza JavaScript e JSX. Não introduza TypeScript sem solicitação explícita.
6. Faça mudanças pequenas, coesas e proporcionais ao problema. Evite dependências, abstrações, serviços ou infraestrutura sem necessidade demonstrável.
7. Respeite o prazo e a finalidade acadêmica. Priorize um MVP funcional; não replique a complexidade de marketplaces comerciais grandes.
8. Preserve responsividade, HTML semântico, acessibilidade, navegação por teclado, contraste e preferência por movimento reduzido.
9. Antes de alterar uma área, leia os arquivos relacionados e verifique impactos em navegação, dados, segurança, desempenho e publicação.
10. Não declare lint, testes, build, Actions ou deploy aprovados sem executar os comandos ou consultar os resultados correspondentes. Diferencie validação automatizada de inspeção manual.
11. Quando uma mudança alterar comportamento, arquitetura, regras do produto, segurança ou publicação, atualize a seção narrativa pertinente deste arquivo no mesmo trabalho.
12. Não edite manualmente o conteúdo entre os marcadores de snapshot automatizado. Ele é gerado por `scripts/update-ai-context.mjs`.
13. Nunca inclua chaves, tokens, senhas, cookies, credenciais, valores de arquivos `.env`, dados pessoais ou informações privadas neste documento.
14. Não assuma que a arquitetura planejada já está integrada. Confirme a existência dos arquivos, planilhas, scripts, serviços e variáveis no código antes de descrevê-los como ativos.
15. Consulte também `README.md`, `docs/REGISTRO_DE_OCORRENCIAS.md` e `docs/ESPECIFICACAO_MVP.md`. A especificação consolidou decisões funcionais, mas ainda contém bloqueios de validação técnica; nenhum desses documentos substitui a descrição do estado atual.
16. Não faça testes de segurança intrusivos em sistemas, contas, planilhas ou arquivos reais sem autorização explícita. Prefira desenvolvimento local, Preview autorizado e dados sintéticos.

## 2. Identidade e propósito

- **Nome do produto:** Conecta Local.
- **Nome do repositório:** `home-service`.
- **Repositório:** https://github.com/kleber-goncalves/home-service
- **Deploy informado:** https://home-service-blush.vercel.app/
- **Tipo:** plataforma web regional de divulgação e descoberta de serviços.
- **Finalidade:** projeto acadêmico integrador, com possibilidade de evolução após a entrega.
- **Públicos:** pessoas que procuram serviços locais; profissionais autônomos e pequenos empreendedores; administradores da plataforma.
- **Objetivo:** facilitar a divulgação de serviços por profissionais e permitir que moradores encontrem opções na própria região.
- **Jornada pública pretendida:** **PESQUISAR → DESCOBRIR → CONHECER → ENTRAR EM CONTATO**.

A plataforma será uma vitrine regional organizada, não um sistema de pagamentos ou contratação complexa. O contato será direto com o profissional, principalmente pelo WhatsApp público informado.

## 3. Problema e escopo do produto

### 3.1. Problema a investigar

Hipótese inicial: profissionais autônomos e pequenos empreendedores podem ter dificuldade para divulgar seus serviços e alcançar novos clientes; moradores podem ter dificuldade para localizar profissionais e conhecer os serviços disponíveis na região.

Essa hipótese ainda deve ser validada com pesquisa de campo, se possível. Não apresentar os requisitos como necessidades locais comprovadas sem evidências.

### 3.2. Áreas previstas

Estas áreas são decisões de produto, não funcionalidades implementadas.

**Área pública**
- Busca textual por nome do serviço, nome público do profissional e descrição.
- Filtros por categoria, cidade e bairro/região.
- Ordenação por relevância e data de publicação mais recente.
- Listagem, detalhes do serviço e perfil público.
- Contato direto pelo WhatsApp informado.
- Sem login para pesquisar e visualizar serviços.

**Painel do profissional**
- Cadastro com e-mail e senha próprios, confirmação demonstrativa e login.
- Manutenção do perfil.
- Cadastro, edição, pausa, reativação e remoção dos próprios serviços.
- Gestão de imagens e consulta do estado de publicação.
- Recuperação e alteração de senha; alteração de e-mail com confirmação.

**Painel administrativo**
- Gestão de profissionais, serviços, categorias e cidades.
- Análise de denúncias.
- Suspensão/reativação de profissionais e serviços.
- Consulta de auditoria.

### 3.3. Escopo e finalidade da demonstração

O projeto será uma **demonstração acadêmica com dados fictícios**, simulando fluxos coerentes com um sistema real. Não deve receber credenciais ou dados pessoais reais e não está aprovado para operação pública de produção.

O backend planejado continua sendo Google Apps Script, com Google Sheets para dados e Drive para imagens. A decisão funcional é não usar Firebase ou outro provedor de autenticação nesta demonstração; cadastro e login próprios deverão ser avaliados em prova de conceito no Apps Script.

A confirmação de e-mail e a recuperação de senha serão simuladas na interface, com códigos demonstrativos e sem envio real nesta etapa. O projeto poderá ativar envio real futuramente, após revisar as permissões e quotas do Apps Script/MailApp.

Não incluir pagamentos, contratação, contratos, agendamento, chat interno, avaliações, favoritos, geolocalização em tempo real ou aplicativo nativo no MVP.

O levantamento funcional está consolidado em `docs/ESPECIFICACAO_MVP.md` v0.2. A Fase 3 deverá modelar dados e relacionamentos a partir desses requisitos. A autenticação não está liberada para implementação até a prova de conceito técnica descrita na especificação.

## 4. Estado atual do repositório

**Estado atualizado em 2026-11-12 após integração da POC-02 em `dev` e execução manual de Argon2id na POC-03:**

- A branch `dev` contém a homepage pública demonstrativa do Conecta Local, integrada por Pull Request.
- `src/pages/HomePage.jsx` coordena a composição das seções e o estado local da busca e dos filtros.
- `src/components/home/` contém cabeçalho, hero/busca e seções públicas reutilizáveis.
- `src/components/ui/` contém primitivas locais editáveis (Button, Input, Card e Badge) no padrão visual shadcn/ui.
- `components.json` e `jsconfig.json` preparam a estrutura para componentes JavaScript (`tsx: false`) e aliases `@/`; `vite.config.js` resolve o alias no Vite.
- `src/index.css` concentra tokens visuais, estilos globais, responsividade, foco visível e preferência por movimento reduzido.
- A busca e a seleção de categorias filtram somente registros demonstrativos em `src/data/homepage.js`. O campo de cidade é ilustrativo e não executa busca geográfica.
- Os perfis e as fotografias não representam profissionais cadastrados. A natureza demonstrativa é indicada na interface.
- As fotografias são carregadas de URLs externas do Pexels; a disponibilidade visual depende da conexão com esse serviço. Os créditos estão no README.
- A validação de Pull Requests destinados a `dev` foi habilitada no workflow de CI pela correção integrada no PR #3.
- O workflow de sincronização automática do AI Context e o workflow de validação foram executados com sucesso após a integração da homepage, conforme os registros consultados em 2026-11-09.
- `main` permanece fora do escopo desta etapa; `dev` é a linha de integração do trabalho em andamento.
- O arquivo Google Sheets estrutural foi criado pelo responsável pelo projeto com as 12 abas e os 102 cabeçalhos aprovados. A exportação XLSX foi inspecionada e a conferência manual de proteções e compartilhamento restrito foi confirmada pelo responsável.
- A planilha permanece uma estrutura inicial vazia, ainda sem uso como armazenamento operacional integrado.
- A POC-01 de comunicação React → Vercel Function → Apps Script foi integrada à branch `dev` pelo PR #10 em 2026-11-11 e validada manualmente em Preview: HTTP 200 (eco), 422 (erro lógico Apps Script), 502 (resposta upstream inválida), 400 (JSON inválido no navegador) e 405 (método não permitido). O merge commit foi `837f7c6172764ee27ac835c81e1224640d78478d`; o registro está em `docs/POC_01_COMUNICACAO.md`.
- A POC-02 de assinatura HMAC-SHA-256 e proteção contra replay foi integrada à `dev` pelo PR #11 em 2026-11-11 (merge commit `aa1a98c130369892e6727dda90e97ca4c0f7d2a6`). Os cinco cenários de Preview, cinco testes diretos contra o Apps Script isolado e o teste concorrente com duas chamadas idênticas passaram; somente uma chamada concorrente foi aceita e a outra recebeu `REPLAY_DETECTED`. O workflow pós-merge #93 passou. O Preview mais recente de `dev` foi redeployado após ajustar as variáveis para Preview; a confirmação manual final do Echo nesse deployment permanece pendente. Consulte `docs/POC_02_ASSINATURA_GATEWAY.md`.
- Não há backend de negócio operacional integrado ao frontend, cadastro, autenticação, sessão, busca remota, envio de e-mail, upload no Drive ou painel administrativo.
- A homepage não processa pagamentos, agendamentos ou contratação.

A especificação v0.4 e `docs/MODELAGEM_DADOS.md` consolidam requisitos e modelagem lógica/física aprovados. `docs/ARQUITETURA_APPS_SCRIPT.md` registra a arquitetura e seus limites. POC-01 e POC-02 estão integradas à `dev`; a POC-02 continua restrita a ações sintéticas. A POC-03 está em branch isolada e investiga a viabilidade de KDF no runtime Apps Script, sem login, endpoint ou armazenamento de usuários. Isso não significa que operações de negócio, autenticação de usuários, sessões, Sheets ou Drive estejam integrados.

## 5. Arquitetura e decisões tecnológicas

### 5.1. Frontend

- **React + JavaScript/JSX:** interface e componentes.
- **Vite 8:** servidor de desenvolvimento e build.
- **Node.js 24:** ambiente recomendado para ferramentas de desenvolvimento, scripts e build.
- **Tailwind CSS 4:** utilitários e integração com Vite; estilos específicos da homepage ficam em `src/index.css`.
- **shadcn/ui:** configuração em `components.json` no modo JavaScript (`tsx: false`), com aliases `@/`. As primitivas locais usadas nesta homepage são componentes editáveis no padrão visual shadcn; o CLI não é dependência de runtime.
- **Lucide React:** biblioteca de ícones da interface.

Não foi escolhida uma aplicação Next.js. Não adicionar Express por padrão: para manter o projeto simples, o Google Apps Script é a opção inicial de backend. Reavaliar somente se surgir requisito concreto que justifique uma API Node.js hospedada separadamente.

### 5.2. Backend e dados planejados

- **Google Apps Script:** backend de negócio planejado para autenticação, autorização, regras, integridade e acesso a Sheets/Drive. O Web App isolado da POC-02 executa somente ações sintéticas `poc.*`; operações de negócio e acesso a dados ainda não estão integrados.
- **Vercel Functions:** o gateway HTTP server-side da POC-01 e a assinatura HMAC-SHA-256 com proteção contra replay da POC-02 estão integrados à branch `dev`. A chamada Echo do Preview de `dev` redeployado ainda aguarda confirmação manual final.
- **Google Sheets:** arquivo estrutural já criado pelo responsável, com 12 abas e 102 cabeçalhos aprovados; ainda não está integrado como armazenamento operacional.
- **Google Drive:** armazenamento futuro das imagens enviadas pelos profissionais; fluxo de upload e permissões ainda não implementado.

Fluxo aprovado para orientar a POC: React/Vite → rota same-origin da Vercel Function → Web App Apps Script → Google Sheets/Drive. A Function será somente gateway técnico: valida formato, tamanho, método, timeout, assinatura servidor-servidor e normalização de resposta. Não será dona das regras de negócio, dados, autenticação final ou autorização. O Apps Script continua sendo a autoridade de domínio e precisa recusar chamadas diretas sem uma assinatura válida do gateway. Não usar CORS do navegador para falar diretamente com Apps Script.

A estratégia de assinatura gateway→Apps Script e o possível cookie HttpOnly emitido pela Vercel continuam sujeitos a provas de conceito. A Function poderá emitir o cookie no domínio da aplicação; o Apps Script continuará validando o token e a sessão. A proposta completa, incluindo riscos, critérios de aceite e limites de TextOutput, está em [docs/ARQUITETURA_APPS_SCRIPT.md](./ARQUITETURA_APPS_SCRIPT.md). Google Sheets é uma solução de armazenamento simplificada para o escopo acadêmico; não é um banco relacional. Considerar concorrência, cotas, limites de execução, latência e integridade. Não prometer capacidade de produção em grande escala.

### POC-01 — transporte real integrado e validado

A POC-01 foi integrada à branch `dev` pelo PR #10 em 2026-11-11. O merge commit foi `837f7c6172764ee27ac835c81e1224640d78478d`. A validação manual em Preview confirmou: eco HTTP 200, erro lógico do Apps Script HTTP 422, resposta upstream inválida HTTP 502, JSON inválido HTTP 400 e método GET HTTP 405. O registro está em `docs/POC_01_COMUNICACAO.md`.

A implementação usa React → POST same-origin `/api/backend` → Vercel Function → Apps Script via form-urlencoded → redirecionamento para `script.googleusercontent.com`. O frontend não chama Apps Script diretamente. A POC-01, isoladamente, não autenticava a Function perante o Apps Script e não está aprovada para produção. Uma implantação antiga sem assinatura deve ser atualizada para o código protegido ou desativada.

### POC-02 — assinatura HMAC e proteção contra replay integradas à dev

O PR #11 foi integrado em 2026-11-11 e o workflow pós-merge #93 passou. A POC permanece restrita a chamadas sintéticas `poc.*`, sem login, sessão ou acesso a dados de negócio. Os testes manuais da branch e o teste concorrente com duas chamadas idênticas passaram. A execução Echo no último Preview de `dev`, redeployado após a configuração de variáveis exclusivas de Preview, ainda precisa de confirmação manual final.

### POC-03 — Argon2id executado no Apps Script; autenticação ainda bloqueada

A branch de trabalho é `feat/poc-03-password-kdf`. O harness `apps-script/poc-03/Code.gs` permanece isolado; nenhum endpoint, cadastro, login, sessão ou armazenamento de credenciais foi criado.

**PBKDF2-HMAC-SHA-256 sobre `Utilities.computeHmacSha256Signature`: reprovado para implementação no Apps Script.** Os três vetores rápidos passaram; o vetor RFC de 80.000 iterações/64 bytes passou em 84.443 ms. O benchmark de 600.000 iterações/32 bytes foi interrompido preventivamente após 149.247 iterações em 180.229 ms. Extrapolações lineares diferentes variaram de 5,28 a 12,08 minutos, diante do limite documentado de seis minutos por execução. Não reduzir o work factor arbitrariamente nem usar SHA-256/HMAC simples como substituto. Detalhes em `docs/POC_03_ARMAZENAMENTO_SENHAS.md`.

**Argon2id via WebAssembly — execução manual real concluída em 2026-11-12.** A sonda WebAssembly básica passou (módulo retornou 42; memória independente de 19 MiB criada). O bundle original `hash-wasm@4.13.0`, com WASM incorporado, foi fixado em `devDependencies` e verificado por SHA-256; o código de produto não importa essa dependência. A função `poc03RunArgon2idTests` passou no Apps Script real em dois vetores independentes:
- KAT pequeno `m=32 KiB,t=3,p=4`: PASS em 10 ms.
- Perfil de referência `m=19456 KiB,t=2,p=1`, saída de 32 bytes: PASS em 142 ms.
- Bateria completa: PASS 2/2, `totalElapsedMs=161`.

O resultado demonstra compatibilidade funcional repetida e desempenho pontual promissor para Argon2id no Apps Script. O responsável executou cinco baterias manuais independentes; o perfil `m=19456 KiB,t=2,p=1` passou em todas, com tempos de 142, 130, 86, 280 e 61 ms (média 139,8 ms; mediana 130 ms; intervalo 61–280 ms). **Não aprova autenticação ou produção.** Cinco amostras não constituem teste de carga, SLA ou garantia de latência. Não comprovam concorrência, pico de memória, CSPRNG para salts, comparação segura, armazenamento, rate limit ou resistência a abuso. A função `argon2Verify` da biblioteca usa comparação simples de strings e não será adotada automaticamente. O wrapper fornece `Uint8Array` para evitar dependência de `TextEncoder`. Os vetores cruzados independentes e as limitações estão documentados em `docs/POC_03_ARMAZENAMENTO_SENHAS.md`.

**Fonte candidata de salt — execução manual concluída:** o Google documenta `Utilities.getUuid()` como equivalente a `java.util.UUID.randomUUID()`, caracterizado pela especificação Java como gerador pseudoaleatório criptograficamente forte. A função `poc03RunSaltGenerationTests` passou no Apps Script real: 256 UUIDs v4 válidos, 16 bytes cada, 256 distintos, zero colisões observadas e nenhum valor registrado em log. UUIDv4 tem 122 bits aleatórios, conforme RFC 9562. O teste amostral não prova CSPRNG nem unicidade global; a base é documental. Formato candidato, ainda não aprovado: `senha_algoritmo=argon2id$v=19$m=19456,t=2,p=1`, `senha_salt` com 16 bytes/32 hex e `senha_hash` com 32 bytes/64 hex.

**Prova manual de criação/verificação concluída:** `poc03RunPasswordRecordVerificationTests` passou 8/8 casos no Apps Script real em 1.031 ms. Criou um registro sintético somente em memória; aceitou a senha correta e rejeitou senha incorreta, salt/hash adulterados, algoritmo/parâmetros não permitidos e campos malformados. Não escreveu Sheets/Drive/Properties nem imprimiu credenciais. A comparação usa acumulador XOR de tamanho fixo, mas JavaScript/V8 não garante tempo constante; não está aprovada para autenticação. Os tempos individuais não constituem teste de side-channel.

**Próxima revisão preparada na POC-03:** política de entrada candidata (15–128 code points Unicode, NFC, máximo 512 bytes UTF-8, preserva espaços/case, rejeita controles e UTF-16 malformado); `poc03RunPasswordInputPolicyTests` passou 14/14 manualmente no Apps Script real, incluindo equivalência de derivação após NFC com o mesmo salt. O NIST exige mínimo de 15 para fator único, permite pelo menos 64, recomenda NFC e proíbe truncamento; blocklist de senhas comuns/comprometidas permanece pendente. `poc03RunLoginThrottlePolicyTests` passou 6/6 manualmente no Apps Script real; confirmou a regra 5 falhas/15 min → bloqueio 15 min, expiração e reset. O resultado identifica explicitamente `MEMORY_ONLY_NOT_PERSISTED` e `NOT_TESTED`: não é rate limiter persistente, não testa concorrência e não protege endpoint.

**Comparação:** acumulador XOR em JS não tem garantia formal de tempo constante; Apps Script V8 não oferece `crypto`/`SubtleCrypto`. Node/Vercel fornece `crypto.timingSafeEqual`, mas mover a comparação ampliaria o papel da Function; comparador WASM revisado é alternativa. Nenhuma opção foi aprovada. Login continua bloqueado.

**Throttling persistente — validação manual concluída em 2026-11-13:** `poc03RunPersistentThrottlePolicyTests` passou **6/6** no Apps Script real, usando Script Properties e ScriptLock reais; a limpeza automática removeu duas propriedades de teste. A sonda foi inicializada como `READY` e dez workers em execuções independentes foram registrados. `poc03RunPersistentThrottleConcurrencySummary` retornou **PASS**: 10 observados, 4 `COUNTED`, 1 `LOCKED_AFTER_FAILURE`, 5 `BLOCKED`, zero falhas de lock, contador final 5 e bloqueio ativo. A limpeza da sonda passou e removeu quatro propriedades do prefixo exclusivo `POC03_THROTTLE_TEST_`. A execução automatizada #231 continua sendo validação do harness Node/VM, não substitui a evidência manual no Google.

**Ressalva histórica da primeira sonda:** o histórico inicial, baseado em dez execuções disparadas manualmente, só apresentava inícios com precisão de segundos e não comprovava sobreposição. Essa limitação foi superada pela sonda coordenada descrita a seguir; não usar a primeira sonda como evidência de contenção simultânea. `PropertiesService` continua sendo apenas o armazenamento da prova, e `getScriptLock` é global por projeto, podendo criar gargalo.

**Nova sonda coordenada — execução manual concluída no Apps Script real em 2026-11-13: PASS.** Dez gatilhos independentes com handlers dedicados validaram o triggerUid, registraram chegada e aguardaram uma barreira comum antes de disputar ScriptLock. Cada seção crítica manteve o lock por 350 ms artificiais. O resumo real registrou 10 workers, máximo 10 simultâneos, 45 pares sobrepostos, todos os dez intervalos com uma janela comum de 1.308 ms e contenção nos 10 workers; espera do lock de 88 a 5.599 ms. Distribuição persistida: 4 COUNTED, 1 LOCKED_AFTER_FAILURE, 5 BLOCKED; zero falhas de lock, timeout de barreira ou erros; contador final 5 e bloqueio ativo. **Concorrência real e consistência de estado foram validadas em Script Properties + ScriptLock.** A limpeza final foi executada às 15:18:47 e retornou PASS: 26 propriedades removidas somente sob `POC03_THROTTLE_TEST_`; 0 gatilhos remanescentes, pois os workers já haviam removido os seus ao terminar. Nenhuma planilha de negócio foi usada. Esta prova não valida escrita concorrente na aba Sheets CONTROLE_AUTENTICACAO.



**Próximas validações:** executar e confirmar poc03CleanupSheetsPersistentThrottleProbe() na POC-03B, preservando o JSON do resumo. Após a limpeza, resolver comparador seguro, blocklist, mitigação de lockout DoS, formato/versionamento do hash e revisão da dependência. Nenhuma credencial real deve ser usada. Cadastro, login e sessões continuam bloqueados até concluir essas verificações e a POC-04.

**POC-03B — persistência concorrente em Sheets (execução manual PASS; limpeza pendente):** poc03RunSheetsThrottleRecordMappingTests passou 8/8 no Apps Script real. poc03LaunchSheetsPersistentThrottleConcurrencyProbe criou a planilha temporária independente POC-03 TEMPORARIA - CONTROLE_AUTENTICACAO - 7f23c5998ac943fb95c0b67243529be8, com aba CONTROLE_AUTENTICACAO_POC, seis colunas e um registro sintético. Os dez handlers de relógio terminaram; poc03RunSheetsPersistentThrottleConcurrencySummary retornou PASS: 10/10 workers, máximo simultâneo 10, 45 pares sobrepostos, janela comum 1.760 ms, contenção 10/10, espera pelo lock 57–17.155 ms, cinco gravações no Sheets, 4 COUNTED, 1 LOCKED_AFTER_FAILURE, 5 BLOCKED, contador final 5/bloqueado; zero falhas de lock, timeout de barreira ou erro. persistence=GOOGLE_SHEETS_TEMP_SPREADSHEET; businessSpreadsheetUsed=false. A evidência comprova read-modify-write concorrente funcional somente nesta planilha temporária sob ScriptLock; não demonstra SLA/escala ou produção. **Falta executar poc03CleanupSheetsPersistentThrottleProbe() após guardar o resumo.** A função move somente o arquivo exato para a lixeira e apaga apenas o prefixo e gatilhos desta POC.


### 5.3. Modelagem lógica e física de dados aprovada

A modelagem lógica e o esquema físico estão consolidados em [`docs/MODELAGEM_DADOS.md`](./MODELAGEM_DADOS.md): 12 entidades e 102 campos lógicos, com 12 abas e 102 colunas físicas. O documento define UUIDs, PKs/FKs lógicas, cardinalidades, ordem de abas e colunas, tipos de célula, campos opcionais, valores controlados, unicidade, integridade, estados, visibilidade, privacidade e persistência no Sheets/Drive.

Entidades/abas: `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CONTROLE_AUTENTICACAO`, `SERVICOS`, `CATEGORIAS`, `CIDADES`, `SERVICO_CIDADES`, `IMAGENS`, `DENUNCIAS` e `AUDITORIA`. A estrutura prevê um único arquivo Google Sheets; linha 1 para cabeçalhos e linha 2 em diante para registros; UUIDs/textos como texto; datas como ISO 8601 UTC; números em células numéricas; células vazias para opcionais; validações do Sheets apenas auxiliares, com Apps Script como autoridade.

Google Sheets não impõe automaticamente FKs, unicidade composta ou integridade relacional; esses controles pertencem ao Apps Script e exigem testes de concorrência. **A planilha estrutural foi criada e conferida; não há registros de negócio nem integração operacional.** A inserção futura deverá usar exclusivamente dados sintéticos e ocorrer após a validação dos fluxos de backend.

### 5.4. Autenticação, e-mail e imagens — decisões e bloqueios

A proposta de arquitetura do backend e o plano das provas de conceito estão em [docs/ARQUITETURA_APPS_SCRIPT.md](./ARQUITETURA_APPS_SCRIPT.md). Esse documento não autoriza a implementação: transporte, KDF de senha e sessão permanecem bloqueados até serem testados e aprovados.

**Decisão funcional para a demonstração**
- Cadastro e login próprios por e-mail e senha, com lógica no Apps Script; não adicionar Firebase ou provedor externo sem reabrir a decisão.
- A demonstração utilizará dados fictícios e não deverá receber senhas ou dados reais.
- Conta nasce em `pending_activation`; confirmação de e-mail simulada por código de 6 dígitos, validade de 10 minutos, máximo 5 tentativas e intervalo de 60 segundos para novo código.
- Recuperação de senha usa as mesmas regras de código; novo código invalida o anterior; uso único.
- O código é exibido somente na demonstração. Envio real por e-mail é uma etapa futura e deverá respeitar quotas e falhas do MailApp.
- Senha: mínimo 15 caracteres, suporte a pelo menos 64, sem exigência de classes de caracteres, rejeição de senhas comuns e sem troca periódica obrigatória.
- Login: 5 falhas dentro de uma janela de contabilização de 15 minutos geram bloqueio de 15 minutos; controle no backend por HMAC do e-mail normalizado; mensagens genéricas; testar abuso de bloqueio contra contas.
- Sessões: 30 minutos de inatividade, máximo 8 horas; logout, alteração/recuperação de senha, suspensão e encerramento revogam sessões.
- Alteração de e-mail só efetiva após confirmação do novo endereço; endereço anterior continua válido até então.
- Primeiro administrador criado manualmente por procedimento controlado; papel administrativo nunca é definido por valor livre do frontend.
- Toda conta `professional` precisa possuir exatamente um perfil válido em `PROFISSIONAIS` antes de ser ativada; conta `admin` não exige perfil. Mudança de papel que gere vínculos inconsistentes fica bloqueada até procedimento seguro e auditado.

**Bloqueios técnicos antes de implementar**
- Não armazenar senhas em texto puro e não usar SHA/digest rápido isolado como armazenamento de senha.
- A referência oficial de Apps Script Utilities documenta operações de digest e HMAC; não presumir que exista um KDF de senha pronto. Avaliar implementação adequada e revisada (por exemplo, PBKDF2-HMAC-SHA-256, se viável), parâmetros, salt individual, comparação e desempenho. Não inventar criptografia caseira.
- Provar como uma sessão será transportada, persistida, expirada e revogada entre React, Vercel Function e Apps Script. A Vercel Function poderá emitir um cookie HttpOnly no domínio da aplicação, mas a estratégia, atributos e controles CSRF ainda exigem POC. O Apps Script permanece a autoridade que valida a sessão; não escolher armazenamento de token no navegador sem evidência.
- Testar concorrência e o risco de um atacante bloquear uma conta provocando tentativas incorretas.
- A prova de conceito deverá usar dados sintéticos e não será considerada pronta para produção.

**Imagens no Drive**
- Decisão funcional: imagens de serviços publicados e contas ativas poderão ser visualizadas por link; serviços pausados, suspensos ou removidos e contas suspensas/encerradas terão acesso restringido.
- O fluxo pretendido usa permissões equivalentes a `ANYONE_WITH_LINK` para visualização e `PRIVATE` para restringir, quando permitido pela conta. Pasta raiz privada; compartilhamento individual por arquivo; limite exato de 5.000.000 bytes; no máximo 1 imagem ativa por perfil e 5 por serviço, com posições exclusivas de 1 a 5. Testar em arquivos individuais e tratar falhas parciais.
- Links públicos podem ser copiados e imagens podem ser baixadas; revogar a permissão não apaga cópias já obtidas. Não tratar esconder a URL na interface como controle de acesso.

### 5.5. Limites da plataforma

Consultar cotas oficiais vigentes do Apps Script antes e durante a implementação. Quotas, limites de execução, envio de e-mails e serviços associados podem mudar e dependem do tipo de conta. A demonstração não deve ser apresentada como solução pronta para escala.

## 6. Regras de negócio e segurança

1. Visitantes podem pesquisar e visualizar serviços públicos sem criar conta.
2. Cada profissional pode possuir vários serviços; não há limite numérico fixo decidido para o MVP.
3. Profissionais só podem consultar/alterar seus próprios registros privados; a identidade e a propriedade são verificadas no Apps Script em toda operação.
4. Papel administrativo não pode ser escolhido pelo usuário; a criação inicial é manual e concessões posteriores exigem administrador autorizado.
5. Um serviço pode permanecer como `draft` incompleto, privado e sem cidade; a publicação automática exige campos válidos, conta ativa, perfil válido, categoria ativa, preço coerente e ao menos uma cidade ativa associada.
6. Conta suspensa ou encerrada não pode autenticar; suas sessões são invalidadas e seus serviços deixam de ser públicos.
7. Suspensão/fechamento da conta oculta serviços e imagens sem sobrescrever `SERVICOS.status`; na reativação, somente serviços cujo estado individual continue `published` são elegíveis.
8. Serviço pausado deixa de aparecer publicamente, mas pode ser reativado pelo proprietário se não estiver bloqueado por ação administrativa.
9. Serviço suspenso administrativamente exige justificativa; somente administrador pode reativar ou remover.
10. Serviço removido pelo proprietário ou administrador deixa de ser público, mas permanece no histórico da demonstração.
11. Categoria inativa não pode ser usada em novos serviços/publicações; serviços existentes nela continuam públicos, conforme decisão aprovada. Cidade inativa não recebe novas associações; vínculos existentes são preservados. O encerramento de denúncia (`valid`, `invalid` ou `closed`) preenche `analisado_em` no backend.
12. Denúncia não remove automaticamente conteúdo; a moderação é uma ação administrativa registrada.
13. Exibir nome público, apresentação, foto opcional, cidades/regiões e WhatsApp. Nome completo, e-mail e telefone alternativo ficam privados por padrão.
14. Não solicitar nem expor endereço residencial completo.
15. Não apresentar identidade, qualificação, reputação ou avaliação como verificada sem processo real.
16. Validar novamente no Apps Script; validação no React não é fronteira de segurança.
17. Não confiar em papel, ID de proprietário, preço, estado ou permissões enviados pelo navegador sem validação no backend.
18. Não expor chaves, senhas, tokens, códigos de verificação ou credenciais no bundle Vite, repositório, planilha pública ou logs.
19. Registrar auditoria sem segredos ou dados pessoais desnecessários.
20. Considerar finalidade, minimização, transparência e retenção de dados. A demonstração usa dados fictícios.

## 7. Categorias, localidades e dados de demonstração

Categorias iniciais: Construção e reformas; Elétrica; Hidráulica; Limpeza; Beleza e estética; Tecnologia; Aulas e educação; Transporte; Outros.

Cidades/estados serão selecionados de uma lista administrável; bairros e regiões serão texto livre. O profissional poderá atender várias cidades. Não haverá GPS nem endereço residencial.

Base demonstrativa inicial sugerida e aprovada: 8 profissionais fictícios, 16–24 serviços, todas as categorias iniciais, 3–5 cidades, alguns exemplos de denúncias e decisões e um administrador criado manualmente. Identificar todos os registros como fictícios.

## 8. Painel administrativo, auditoria e operação

O painel deverá permitir consulta/gestão de profissionais, serviços, denúncias, categorias e cidades, além de consulta da auditoria. Suspensões e remoções exigem justificativa quando definidas; ações sensíveis devem pedir confirmação.

`AUDITORIA` possui nove campos e funciona como append-only pela aplicação: backend escreve, administradores consultam e a interface não edita eventos. Isso não torna a planilha inviolável contra quem tem acesso privilegiado direto ao arquivo/projeto. Registrar identificador, ator, tipo do ator, ação controlada, entidade/registro afetado, resultado, detalhes sanitizados e data/hora. Nunca registrar credenciais, hashes/salts de senha, códigos, tokens ou segredos.

Para alterações auditadas, atualização de negócio e inclusão do evento deverão integrar o mesmo `spreadsheets.batchUpdate` do único arquivo Sheets. A API aplica o lote de forma atômica; se uma solicitação for inválida, nenhuma alteração daquele lote é aplicada. `LockService` protege trechos críticos de leitura–validação–gravação, mas não substitui a atomicidade do lote nem uma transação com outros serviços.

Permissões do Drive são operações separadas: confirmar permissão efetiva, registrar falhas e reconciliar divergências. Não declarar uma operação integralmente concluída antes das etapas obrigatórias. Sheets e Drive não formam uma transação distribuída.

Em falhas: informar estado de carregamento/sucesso/erro; não declarar sucesso antes da confirmação do backend; manter formulário em falha de rede; prevenir duplo envio; solicitar confirmação antes de ação destrutiva; pedir novo login quando a sessão expirar. Mensagens ao usuário são genéricas e não revelam detalhes internos. Não haverá offline para login, cadastro ou administração.

## 9. Regras de desenvolvimento e manutenção

- Preserve JavaScript/JSX e a estrutura simples do Vite.
- Prefira componentes pequenos e reutilizáveis, sem fragmentar funções triviais.
- Separe interface, acesso a dados, validação e regras de negócio.
- Centralize chamadas ao Apps Script em uma camada de serviços.
- Não duplicar regras de validação entre telas; valide também no backend.
- Use estados claros para carregamento, sucesso, vazio e erro.
- Trate falhas de rede e respostas inválidas sem expor detalhes internos.
- Não adicionar dependências sem necessidade.
- Não criar dados falsos como se fossem profissionais reais. Identifique os dados de demonstração.
- Mantenha o README, este contexto e o registro de ocorrências coerentes com o código.
- Não implementar autenticação sem concluir as provas de conceito da seção 5.4 e documentar seus resultados.

## 10. Git, branches e commits

- Não presumir que a branch de produção deve receber mudanças diretamente.
- Antes de editar, confirmar branch, estado e commit atual.
- Preferir branches de trabalho com nomes claros, por exemplo `feat/nome-da-funcionalidade`, `fix/nome-do-problema` e `docs/nome-da-documentacao`.
- Usar mensagens de commit descritivas e consistentes, preferencialmente Conventional Commits.
- Pull Requests devem explicar objetivo, mudanças, validações executadas e limitações.
- Não declarar um Preview Vercel como produção nem confundir status de deploy com aprovação funcional.

## 11. Documentação e registro de problemas

- Este `AI_CONTEXT.md` descreve o estado atual e as regras de continuidade.
- `ESPECIFICACAO_MVP.md` v0.4 consolida requisitos funcionais e as Fases 3 e 4; `MODELAGEM_DADOS.md` contém a modelagem lógica e o esquema físico aprovado conceitualmente (12 entidades/102 campos e 12 abas/102 colunas). Validações técnicas e implementação continuam pendentes.
- `REGISTRO_DE_OCORRENCIAS.md` preserva o histórico de bugs, erros, vulnerabilidades e incidentes. Não criar ocorrência apenas por haver pendência de projeto ou risco conhecido ainda não observado como falha.
- Atualize o contexto narrativo no mesmo trabalho quando decisões ou comportamentos relevantes mudarem.
- O snapshot delimitado por marcadores é automatizado; não editar manualmente.
- Não apagar ocorrências resolvidas. Corrigir informações de maneira rastreável.
- O registro é público: incluir apenas resumos sanitizados e aprovados para divulgação.

## 12. Validação e publicação

Os comandos de validação são mantidos em `package.json`. O workflow de qualidade deve executar:

1. Instalação reproduzível com `npm ci`.
2. Auditoria de dependências com `npm audit --audit-level=high` (vulnerabilidades high/critical fazem a etapa falhar; avisos inferiores ainda podem existir).
3. Validação estrutural do registro de ocorrências.
4. ESLint.
5. Build de produção do Vite.

Os testes das POCs devem permanecer nos scripts npm e no workflow: `npm run test:poc01` e `npm run test:poc02`. Não criar etapas E2E ou Lighthouse só para imitar outro projeto; introduzi-las quando houver fluxos reais que justifiquem esses testes.

A Vercel hospeda o frontend. O workflow de CI valida o código, mas não substitui a conferência do deployment, do SHA publicado e testes manuais de navegação/responsividade. Não afirmar que o Google Apps Script, Sheets ou Drive estão funcionando antes de validar sua integração real.

## 13. Snapshot automatizado do repositório

<!-- BEGIN AUTO-GENERATED SECTION -->

## Snapshot automatizado do repositório

> Gerado por scripts/update-ai-context.mjs. Não edite manualmente o conteúdo entre os marcadores.

- **Commit de referência:** d1a7ffdc4ff31b1ebe73bfd9e4061ea857e704bc
- **Data do commit:** 2026-11-13T16:08:18-03:00
- **Mensagem do commit:** docs(architecture): refletir validacao real de sheets
- **Branch desta execução:** feat/poc-03-password-kdf
- **Projeto declarado:** home-service@0.0.0
- **Scripts npm:** 9
- **Dependências de runtime:** 5
- **Dependências de desenvolvimento:** 10
- **Workflows:** 2
- **Scripts de automação:** 3

### Scripts npm

| Comando | Definição |
|---|---|
| npm run dev | vite |
| npm run build | vite build |
| npm run lint | eslint . |
| npm run preview | vite preview |
| npm run check:occurrences | node scripts/validate-occurrence-register.mjs |
| npm run update:ai-context | node scripts/update-ai-context.mjs |
| npm run test:poc01 | node --test tests/poc01/backend.test.js |
| npm run test:poc02 | node --test tests/poc02/backend.test.js tests/poc02/apps-script.test.js |
| npm run test:poc03 | node --test tests/poc03/apps-script.test.js |

### Variáveis declaradas no .env.example

> Somente os nomes são listados; valores nunca são lidos nem publicados.

- APPS_SCRIPT_HMAC_SECRET
- APPS_SCRIPT_WEB_APP_URL

### Dependências de runtime

| Pacote | Versão declarada |
|---|---|
| @tailwindcss/vite | ^4.3.5 |
| lucide-react | ^1.61.0 |
| react | ^19.3.1 |
| react-dom | ^19.3.1 |
| tailwindcss | ^4.3.5 |

### Dependências de desenvolvimento

| Pacote | Versão declarada |
|---|---|
| @eslint/js | ^10.0.1 |
| @types/react | ^19.3.0 |
| @types/react-dom | ^19.3.0 |
| @vitejs/plugin-react | ^6.1.2 |
| eslint | ^10.14.0 |
| eslint-plugin-react-hooks | ^7.1.1 |
| eslint-plugin-react-refresh | ^0.5.7 |
| globals | ^17.13.0 |
| hash-wasm | 4.13.0 |
| vite | ^8.3.6 |

### Workflows do GitHub Actions

- .github/workflows/ai-context.yml — AI Context — Synchronize
- .github/workflows/validate.yml — Validate Home Service

### Scripts de automação

- scripts/poc02-replay-check.mjs
- scripts/update-ai-context.mjs
- scripts/validate-occurrence-register.mjs

### Arquivos JavaScript/JSX em src/

- src/App.jsx
- src/components/home/hero-search.jsx
- src/components/home/home-sections.jsx
- src/components/home/site-header.jsx
- src/components/ui/badge.jsx
- src/components/ui/button.jsx
- src/components/ui/card.jsx
- src/components/ui/input.jsx
- src/data/homepage.js
- src/lib/utils.js
- src/main.jsx
- src/pages/HomePage.jsx
- src/pages/Poc01Page.jsx
- src/services/poc-01-api.js

### Diretórios principais de src/

- src/components/
- src/data/
- src/lib/
- src/pages/
- src/services/

### Oito commits recentes até o commit de referência

| Commit | Data | Mensagem |
|---|---|---|
| d1a7ffd | 2026-11-13 | docs(architecture): refletir validacao real de sheets |
| 9c89726 | 2026-11-13 | docs(ai-context): registrar POC-03B sheets real PASS |
| 404227c | 2026-11-13 | docs(ai-context): atualizar snapshot automaticamente |
| 8722469 | 2026-11-13 | docs(architecture): registrar prova real de sheets PASS |
| 90e4aaa | 2026-11-13 | docs(ai-context): atualizar snapshot automaticamente |
| 9165e4e | 2026-11-13 | docs(poc-03): registrar execucao real de concorrencia em sheets |
| bc1145c | 2026-11-13 | docs(ai-context): registrar CI e status manual de sheets |
| cbe4c17 | 2026-11-13 | docs(ai-context): atualizar snapshot automaticamente |

<!-- END AUTO-GENERATED SECTION -->
