# Conecta Local — Contexto técnico para IAs

> Documento de continuidade do projeto. Leia antes de sugerir ou realizar alterações. Reúne propósito, decisões, arquitetura planejada, estado implementado, regras de manutenção e limitações. A seção de snapshot ao final é atualizada pelo GitHub Actions.

## Atualização vigente — 2026-11-20

> Esta seção registra o estado mais recente conhecido. Consulte os SHAs e os arquivos do branch efetivamente em análise antes de realizar mudanças.

- O PR #15 (`feat/prototipo-demo-profissional` → `dev`) foi integrado em 16/11/2026. O protótipo funcional com cadastro, confirmação demonstrativa, login, sessão, perfil, criação/pausa/publicação de serviços e persistência no Google Sheets está na branch `dev`.
- Em 20/11/2026, após as integrações das PRs #16, #17 e #14, o responsável confirmou ter repetido os testes do fluxo principal no Preview atualizado de `dev` e informou que a demonstração está funcionando. O histórico anterior de validação do PR #15 permanece registrado em 16/11; a confirmação mais recente é a referência funcional para a continuidade.
- O PR #16 integrou as classes `Usuario`, `Profissional` e `Servico` em `server/domain-entities.js`, com testes em `tests/loo/domain-entities.test.js` (`npm run test:loo`). O PR #17 corrigiu a composição da vitrine para manter os serviços de exemplo junto aos serviços cadastrados.
- O PR #18 adicionou `docs/PROJETO_INTEGRADOR_CONECTA_LOCAL.md`. O PR #19 integrou `dev` em `main`.
- O PR #19 sincronizou o núcleo do protótipo de `dev` com `main` por fast-forward, sem force push. Depois, o PR #20 atualizou quatro documentos em `dev`; em 20/11, a PR #14 adicionou à `dev` a POC-04 independente e desabilitada. `main` permanece em `49354a46863d5a5eb36ce32e450b975d4087fe3b`; portanto, o núcleo funcional da demonstração permanece alinhado, enquanto os arquivos exclusivos da POC-04 e as atualizações documentais estão somente em `dev`.
- A PR #23 concluiu o ciclo de vida dos serviços em `dev` (edição e remoção lógica). Em 20/11/2026, após a sincronização do Apps Script e a publicação da implantação Web App existente, o responsável confirmou que os testes manuais passaram no Preview fixo da branch `dev`; o deployment `dpl_FT5dFsPzB6B1phwGywur4ewjRkZS` está `READY` no commit `e6d231c`. `main` permanece inalterada.
- O ambiente Preview de `dev` contém variáveis `CONECTA_LOCAL_*` com escopo Preview; os valores são secretos e não devem ser lidos, copiados para documentação ou compartilhados. A Production permanece sem variáveis de backend.
- O gateway em `api/app.js` → `server/app-gateway.js` bloqueia as operações de negócio fora de Vercel Preview. Production permanece como vitrine pública, conforme decisão do responsável pelo projeto.
- O Apps Script de negócio está em `apps-script/conecta-local/Code.gs`. O fluxo atual utiliza oito abas operacionais do Sheets: `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS` e `AUDITORIA`. A modelagem aprovada contempla 12 abas; as quatro restantes ainda não têm fluxo operacional implementado.
- Argon2id (`hash-wasm@4.13.0`) e comparação de hash por `timingSafeEqual` estão integrados no gateway do protótipo. Isso atende à demonstração acadêmica, não constitui auditoria independente ou aprovação para produção.
- A POC-04 foi integrada à branch `dev` pela PR #14 em 20/11/2026 (merge commit `adb51e2f1de8b9d47fb59205938b3e33e21739a1`), mas continua independente do login principal e desabilitada. Os ensaios sintéticos foram concluídos; os recursos temporários, nonces, segredo Apps Script e variáveis Vercel exclusivas foram limpos. A revisão estática identificou dois bloqueios para qualquer reativação: leitura de corpos/respostas limitada somente após leitura integral e ausência de rate limiting/limite de emissão. O responsável aceitou manter esses pontos como limitações documentadas deste ciclo; não reativar nem conectar a POC ao login principal. Falhas reais de infraestrutura e testes de carga não foram executados. Consultar `docs/POC_04_SESSOES.md`.
- Usar somente dados fictícios. Não configurar backend em Production nesta etapa.

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

O levantamento funcional está consolidado em `docs/ESPECIFICACAO_MVP.md` v0.4, e a modelagem lógica/física está em `docs/MODELAGEM_DADOS.md`. O protótipo de autenticação e gestão de serviços foi implementado e validado no Preview com dados fictícios; isso não equivale a liberação para produção. Requisitos adicionais ainda não implementados permanecem no backlog.

## 4. Estado atual do repositório

**Estado atualizado em 20/11/2026 — a branch `dev` contém a implementação principal, a POC-04 independente/desabilitada e as atualizações documentais; `main` permanece no release público `49354a46863d5a5eb36ce32e450b975d4087fe3b`. O snapshot automatizado ao final deste arquivo registra o head corrente.**

### Implementado e integrado

- Homepage pública demonstrativa em `src/pages/HomePage.jsx`, organizada com componentes reutilizáveis em `src/components/home/` e primitivas locais em `src/components/ui/`.
- A homepage combina serviços reais da demonstração retornados por `public.services` com serviços/profissionais ilustrativos. Busca, categoria e cidade filtram os itens disponíveis no frontend; não há pesquisa geográfica externa ou geolocalização.
- Cadastro, confirmação de código demonstrativo, login, sessão, atualização do perfil, criação, edição, pausa/publicação e remoção lógica de serviços, além da consulta pública, implementados em `src/pages/AuthDemoPage.jsx`, `src/services/app-api.js`, `api/app.js` e `server/app-gateway.js`.
- Em 20/11/2026, o responsável informou que repetiu os testes do fluxo funcional no Preview atualizado de `dev`, após as integrações das PRs #16 e #17, e confirmou o funcionamento correto. O fluxo inclui catálogo, cadastro/ativação demonstrativa, persistência em Sheets, login/restauração de sessão, criação, pausa/publicação, vitrine e logout, com dados fictícios.
- O Apps Script de negócio está em `apps-script/conecta-local/Code.gs`; utiliza operacionalmente as abas `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS` e `AUDITORIA`.
- O gateway aplica Argon2id (`hash-wasm@4.13.0`), comparação resistente a diferenças de tempo, cookie `HttpOnly; Secure; SameSite=Strict`, CSRF, HMAC servidor-servidor, validação de Origin e bloqueio fora de Preview.
- POC-01 (#10), POC-02 (#11) e POC-03 (#12) estão integradas a `dev`; documentação específica em `docs/POC_01_COMUNICACAO.md`, `docs/POC_02_ASSINATURA_GATEWAY.md` e `docs/POC_03_ARMAZENAMENTO_SENHAS.md`.
- PR #16 integrou LOO em JavaScript no gateway: `Usuario`, `Profissional` e `Servico`, com testes `npm run test:loo` e documentação em `docs/LOO_ORIENTACAO_OBJETOS.md`.
- PR #17 manteve os serviços de exemplo na homepage quando existem serviços persistidos.
- PR #18 adicionou o relatório integrador em `docs/PROJETO_INTEGRADOR_CONECTA_LOCAL.md`.
- PR #19 integrou `dev` em `main`. A sincronização posterior de `dev` para o SHA de `main` foi fast-forward, sem force push.

### Ambientes e limites

- **Preview de `dev`:** ambiente da demonstração funcional; as variáveis `CONECTA_LOCAL_*` estão escopadas para Preview. Não registrar seus valores.
- **Production (`main`):** vitrine pública. O gateway retorna `APP_DEMO_DISABLED` fora de `preview`; não há variáveis Production do backend e não se deve habilitá-lo nesta etapa.
- O projeto é acadêmico e utiliza somente dados fictícios. Não inserir credenciais ou dados pessoais reais.
- A modelagem prevê 12 abas/entidades; somente as oito listadas acima são atualmente utilizadas pelo backend de negócio. `CONTROLE_AUTENTICACAO`, `SERVICO_CIDADES`, `IMAGENS` e `DENUNCIAS` ainda não têm fluxos operacionais.
- Ainda não implementados: recuperação/alteração de senha ou e-mail, upload de imagens no Drive, painel administrativo, denúncias/moderação e gestão administrativa de categorias/cidades.
- A POC-04 está integrada à `dev` pela PR #14, mas sua rota independente permanece desabilitada. Os ensaios sintéticos foram concluídos e os recursos/segredos exclusivos foram limpos. Dois itens de hardening ainda impedem qualquer reativação: limite de leitura aplicado durante consumo de stream e rate limiting/limite de emissão. Não conectar a POC ao fluxo principal. Falhas reais de infraestrutura e testes de carga não foram executados. Ver `docs/POC_04_SESSOES.md`.

### Etapa 1 — Autorização e integridade (validação técnica concluída em 20/11/2026)

- A PR #22 (`feat/authorization-integrity`) foi integrada exclusivamente em `dev` em 20/11/2026 pelo merge commit `1bf55488539c5e4874573f77737827c1089504cc`. `main` e Production não foram alteradas.
- O gateway reduz o payload de `profile.update` aos campos editáveis permitidos e deriva o token de sessão do cookie; `service.listMine` encaminha somente o token derivado.
- O Apps Script usa `appRequireProfessionalSession_` para exigir o papel confiável `professional` nas operações de atualização de perfil, listagem, criação e alteração de estado de serviços. Papel diferente recebe `ROLE_FORBIDDEN` (HTTP 403); o papel enviado pelo navegador é ignorado.
- A identidade é derivada da sessão validada, o perfil é resolvido pelo usuário confiável e a propriedade do serviço é verificada no backend.
- `tests/authorization/apps-script.test.js` executa o `apps-script/conecta-local/Code.gs` real em Node/VM com duas contas, perfis, sessões e serviços sintéticos, usando mocks de Sheets, Properties e LockService.
- `tests/authorization/gateway.test.js` verifica sanitização dos payloads e bloqueio de `session.create` na allowlist pública do navegador.
- O workflow `Validate Home Service` inclui `npm run test:authorization`. A execução final #44797635404 concluiu **SUCCESS** no head exato da PR `54142fca94b71e72b19cee7dbaae2d6467db4dd0`; a suíte de autorização teve **17 PASS e 0 FAIL** (12 Apps Script e 5 gateway), e todas as etapas do job passaram.
- **Validação manual de propriedade — PASS:** A tentou alterar o serviço fictício de B no Preview de `dev`. A API retornou HTTP 404/`SERVICE_NOT_FOUND`; o serviço de B permaneceu `published` em `SERVICOS` e não houve evento de sucesso indevido em `AUDITORIA`.
- **Validação manual do papel — PASS:** depois de sincronizar e publicar uma nova versão do Apps Script real, A teve seu papel fictício alterado temporariamente para `admin` e tentou pausar um serviço próprio. A API retornou HTTP 403/`ROLE_FORBIDDEN`; `ultima_atividade_em` não mudou, o serviço permaneceu `published` e a auditoria permaneceu intacta, sem sucesso indevido.
- A tentativa anterior à sincronização do Apps Script havia retornado HTTP 200, evidenciando que o Web App publicado estava atrás do código versionado em GitHub. Após sincronizar `apps-script/conecta-local/Code.gs` e atualizar a implantação Web App existente, o mesmo cenário retornou o bloqueio esperado.
- **Limite:** o harness automatizado simula Sheets, Properties e LockService; não demonstra quotas, indisponibilidades ou falhas reais desses serviços. A atualização do registro de negócio e a escrita de auditoria continuam separadas; não declarar atomicidade. Considerar essa investigação na POC-05 somente se for proporcional ao objetivo acadêmico.
- **Limpeza da conta de teste:** o responsável confirmou que o papel da conta fictícia A foi restaurado para `professional` após o teste temporário com `admin`.


### Etapa 2 — Ciclo de vida dos serviços (concluída em 20/11/2026)

- A PR #23 (`feat/service-lifecycle`) foi integrada exclusivamente em `dev` em 20/11/2026 pelo merge commit `0f9e887347444deb1307e65d127d969e595c81ed`. `main` e Production não foram alteradas.
- As ações protegidas `service.update` e `service.remove` estão integradas no gateway e em `apps-script/conecta-local/Code.gs`; ambas exigem sessão, CSRF e papel confiável `professional`.
- `service.update` permite editar nome, categoria e descrição; o backend deriva o proprietário da sessão e rejeita mass assignment de proprietário, papel, status, preço e timestamps.
- `service.remove` realiza remoção lógica: define `SERVICOS.status = removed`, preserva a linha e registra a ação em `AUDITORIA`.
- Serviços `suspended` e `removed` não podem ser editados/removidos pelo profissional nem reativados por `service.setStatus`. A edição preserva status, proprietário, preço, `criado_em` e `publicado_em`; categoria inativa já associada pode ser mantida, mas não selecionada para nova associação.
- A interface em `src/pages/AuthDemoPage.jsx` reutiliza o formulário para criação/edição, apresenta os estados do serviço e solicita confirmação antes da remoção.
- **CI — PASS:** a execução do workflow no merge commit `0f9e887347444deb1307e65d127d969e595c81ed`, run [#44812170065](https://github.com/kleber-goncalves/home-service/actions/runs/44812170065), concluiu com sucesso. Foram aprovados POC-01 (12/12), POC-02 (20/20), POC-03 (26/26), POC-04 (33/33), autorização/ownership (22/22), LOO (7/7), auditoria de dependências de produção, registro de ocorrências, ESLint e build.
- **Apps Script real:** após o merge, o responsável confirmou que sincronizou `apps-script/conecta-local/Code.gs` e publicou uma nova versão na implantação Web App existente, preservando a implantação e suas configurações.
- **Preview e validação manual — PASS em 20/11/2026:** o deployment `dpl_FT5dFsPzB6B1phwGywur4ewjRkZS` ficou `READY` no commit `e6d231ce5cc978338bce23010d2003c7f551fd7c`. O alias fixo de `dev` (`https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app/`) foi conferido e aponta para esse deployment. O responsável confirmou que executou os testes manuais da etapa nesse ambiente e que todos passaram.
- **Limites:** o harness automatizado usa mocks para Sheets/Properties/LockService; a confirmação manual é específica aos cenários executados pelo responsável. A gravação do registro de serviço e a escrita de auditoria continuam separadas; não declarar atomicidade. Manter dados fictícios e backend restrito ao Preview.

## 5. Arquitetura e decisões tecnológicas

### 5.1. Frontend

- **React + JavaScript/JSX:** interface e componentes.
- **Vite 8:** servidor de desenvolvimento e build.
- **Node.js 24:** ambiente recomendado para ferramentas de desenvolvimento, scripts e build.
- **Tailwind CSS 4:** utilitários e integração com Vite; estilos específicos da homepage ficam em `src/index.css`.
- **shadcn/ui:** configuração em `components.json` no modo JavaScript (`tsx: false`), com aliases `@/`. As primitivas locais usadas nesta homepage são componentes editáveis no padrão visual shadcn; o CLI não é dependência de runtime.
- **Lucide React:** biblioteca de ícones da interface.

Não foi escolhida uma aplicação Next.js. Não adicionar Express por padrão: para manter o projeto simples, o Google Apps Script é a opção inicial de backend. Reavaliar somente se surgir requisito concreto que justifique uma API Node.js hospedada separadamente.

### 5.2. Backend e dados implementados e planejados

- **Google Apps Script:** backend de negócio implementado em `apps-script/conecta-local/Code.gs`, responsável por validar assinatura, sessão, conta, propriedade do serviço e operações permitidas.
- **Vercel Functions:** gateway em `api/app.js` e `server/app-gateway.js`; o frontend chama somente a rota same-origin `POST /api/app`. O gateway executa Argon2id, gerencia o cookie HttpOnly/CSRF e assina as chamadas ao Apps Script.
- **Google Sheets:** armazenamento operacional da demonstração nas abas `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS` e `AUDITORIA`. A modelagem aprovada possui 12 abas; as quatro não listadas ainda não têm operações de negócio implementadas.
- **Google Drive:** upload, armazenamento e gerenciamento de permissões de imagens ainda não implementados.
- **POC-02:** permanece uma prova isolada para ações sintéticas `poc.*`; não confundir seu Apps Script de teste com o Apps Script funcional em `apps-script/conecta-local/Code.gs`.

Fluxo de negócio implementado: React/Vite → `POST /api/app` → Vercel Function → Apps Script → Google Sheets. O Apps Script é a autoridade para validação de sessão, identidade, propriedade, transições e persistência. O navegador não chama Apps Script diretamente.

A assinatura HMAC e o controle de replay foram provados na POC-02 e incorporados ao gateway de negócio. O cookie HttpOnly/Secure/SameSite, o CSRF e a validação de Origin fazem parte da autenticação do protótipo principal. A POC-04 foi integrada à `dev` pela PR #14, mas continua independente e desabilitada; não integra a autenticação principal. Seus dois itens de hardening permanecem como bloqueios de qualquer reativação. Google Sheets é uma solução simplificada para a demonstração acadêmica, não um banco relacional ou promessa de escala. Considerar cotas, concorrência, latência, integridade e recuperação de falhas.

### POC-01 — transporte real integrado e validado

A POC-01 foi integrada à branch `dev` pelo PR #10 em 2026-11-11. O merge commit foi `837f7c6172764ee27ac835c81e1224640d78478d`. A validação manual em Preview confirmou: eco HTTP 200, erro lógico do Apps Script HTTP 422, resposta upstream inválida HTTP 502, JSON inválido HTTP 400 e método GET HTTP 405. O registro está em `docs/POC_01_COMUNICACAO.md`.

A implementação usa React → POST same-origin `/api/backend` → Vercel Function → Apps Script via form-urlencoded → redirecionamento para `script.googleusercontent.com`. O frontend não chama Apps Script diretamente. A POC-01, isoladamente, não autenticava a Function perante o Apps Script e não está aprovada para produção. Uma implantação antiga sem assinatura deve ser atualizada para o código protegido ou desativada.

### POC-02 — assinatura HMAC e proteção contra replay integradas à dev

O PR #11 foi integrado em 2026-11-11. HMAC-SHA-256, canonicalização versionada, nonce, timestamp e proteção contra replay foram validados em testes de Preview, chamadas diretas ao Apps Script isolado e concorrência básica. A POC permanece restrita a ações sintéticas `poc.*`; não implementa autenticação, sessão ou acesso a dados de negócio. O registro está em `docs/POC_02_ASSINATURA_GATEWAY.md`.

Decisões implementadas:
- HMAC-SHA-256 com mensagem canônica versionada `v1`, domínio `CONECTA_LOCAL_GATEWAY`, método lógico, timestamp, nonce, ação, requestId e SHA-256 do payload UTF-8.
- Timestamp Unix em milissegundos com tolerância máxima de 5 minutos.
- Nonce de 32 bytes aleatórios (64 caracteres hexadecimais), gerado na Vercel Function com `node:crypto`.
- Registro de nonces no Apps Script com Script Properties e Script Lock, retenção de 10 minutos e 30 segundos, capacidade limitada a 2.500 nonces ativos e comportamento fail closed.
- Segredo de 32 bytes gerado fora do repositório: `APPS_SCRIPT_HMAC_SECRET` somente no ambiente Preview da Vercel e `POC02_HMAC_SECRET` em Script Properties do Apps Script. Os valores devem ser idênticos e não podem aparecer no React, Git, documentação, logs ou chat.
- `apps-script/poc-02/Code.gs` contém a versão protegida implantada no Web App Apps Script isolado usado nos testes.
- `tests/poc02/` contém os testes automatizados do gateway e um harness local que simula as APIs do Apps Script. `scripts/poc02-replay-check.mjs` executa testes reais diretos de chamada sem assinatura, timestamp expirado, assinatura válida, repetição de nonce e payload adulterado.

**Validação manual em 2026-11-11, executada pelo responsável do projeto:**
- Preview: eco HTTP 200; erro lógico HTTP 422; resposta upstream inválida HTTP 502; JSON inválido HTTP 400; GET HTTP 405.
- Apps Script direto: chamada sem assinatura `AUTHENTICATION_FAILED`; timestamp expirado `REQUEST_EXPIRED`; chamada assinada aceita; repetição `REPLAY_DETECTED`; payload adulterado `AUTHENTICATION_FAILED`.
- Concorrência: duas chamadas idênticas enviadas em paralelo; uma aceita e outra recusada com `REPLAY_DETECTED`.
- GitHub Actions: a validação automatizada da POC-02 passou antes da integração; os workflows pós-merge dos PRs #10 e #11 também foram concluídos com sucesso.

A validação concorrente realizada com duas chamadas comprova o comportamento básico de uso único, não capacidade de carga ou concorrência em escala. A POC continua restrita a dados sintéticos e ações `poc.*`; não habilita login, sessão, Sheets, Drive ou operações de negócio. Não é solução aprovada para produção.

### 5.3. Modelagem lógica e física de dados aprovada

A modelagem lógica e o esquema físico estão consolidados em [`docs/MODELAGEM_DADOS.md`](./MODELAGEM_DADOS.md): 12 entidades e 102 campos lógicos, com 12 abas e 102 colunas físicas. O documento define UUIDs, PKs/FKs lógicas, cardinalidades, ordem de abas e colunas, tipos de célula, campos opcionais, valores controlados, unicidade, integridade, estados, visibilidade, privacidade e persistência no Sheets/Drive.

Entidades/abas: `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CONTROLE_AUTENTICACAO`, `SERVICOS`, `CATEGORIAS`, `CIDADES`, `SERVICO_CIDADES`, `IMAGENS`, `DENUNCIAS` e `AUDITORIA`. A estrutura prevê um único arquivo Google Sheets; linha 1 para cabeçalhos e linha 2 em diante para registros; UUIDs/textos como texto; datas como ISO 8601 UTC; números em células numéricas; células vazias para opcionais; validações do Sheets apenas auxiliares, com Apps Script como autoridade.

Google Sheets não impõe automaticamente FKs, unicidade composta ou integridade relacional; esses controles pertencem ao Apps Script e exigem validação de concorrência. A planilha estrutural possui 12 abas modeladas; o backend da demonstração utiliza operacionalmente oito: `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS` e `AUDITORIA`. As quatro restantes ainda não têm fluxo operacional. A persistência do fluxo principal já foi exercitada no Preview com dados fictícios.

### 5.4. Autenticação, e-mail e imagens — estado atual

O fluxo principal está implementado em `src/pages/AuthDemoPage.jsx`, `src/services/app-api.js`, `server/app-gateway.js` e `apps-script/conecta-local/Code.gs`. Em 20/11/2026, o responsável confirmou que repetiu os testes do fluxo principal no Preview atualizado de `dev`, após as integrações recentes, e que a demonstração está funcionando. O cenário usa dados fictícios; a validação adversarial de autorização entre profissionais permanece como atividade técnica distinta.

**Controles integrados ao protótipo**
- Argon2id via `hash-wasm@4.13.0`, perfil usado no protótipo `m=19456 KiB,t=2,p=1`; a POC-03 registrou mediana de aproximadamente 130 ms nas medições realizadas. O algoritmo e a comparação foram integrados ao gateway, com `timingSafeEqual` para comparar hashes.
- Política de senha de 15 a 128 caracteres, normalização NFC e rejeição de entradas inválidas/controles; a demonstração usa somente credenciais fictícias.
- Cookie `__Host-conecta_local_session` com `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/` e sem `Domain`; o token original não é enviado ao React e o Apps Script armazena o hash da sessão.
- CSRF por cabeçalho, validação de Origin HTTPS exata, HMAC servidor-servidor e proteção contra replay.
- O Apps Script controla criação, consulta, expiração e revogação de sessões e registra eventos principais na aba `AUDITORIA`.

**Limitações funcionais ainda abertas**
- A confirmação de cadastro é demonstrativa: o código é exibido na interface, sem envio real de e-mail.
- Recuperação de senha, alteração de senha, alteração de e-mail com confirmação e envio real de e-mail não estão implementados.
- Edição/remoção de serviços, imagens no Drive e painel administrativo/moderação não estão implementados.
- Não há auditoria independente, certificação, teste de carga ou autorização para uso em produção.

**POC-04 — sessão sintética independente**
- A implementação isolada está em `server/poc04-session-gateway.js`, `api/poc04/session.js` e `apps-script/poc-04/Code.gs`, com testes em `tests/poc04/` e CI via `npm run test:poc04`.
- A PR #14 foi mesclada em `dev` em 20/11/2026; a rota `/api/poc04/session` continua independente do fluxo principal e desabilitada.
- Os ensaios sintéticos de 14 e 20/11/2026 confirmaram cookie, CSRF, Origin/Fetch Metadata, expiração controlada, replay, concorrência, logout e revogação. A planilha temporária, nonces, segredo `POC04_HMAC_SECRET` e quatro variáveis Vercel exclusivas foram limpos; as cinco funções auxiliares de ensaio não aparecem na cópia atualizada de `Code.gs` apresentada pelo responsável.
- A revisão estática registrou dois bloqueios para qualquer reativação: leitura de corpo/resposta limitada após consumo integral e ausência de rate limiting/limite de emissão. Falhas reais de armazenamento/upstream e testes de carga não foram executados.
- Falhas reais de armazenamento/timeout/upstream, testes de carga e auditoria de segurança independente não foram executados. A revisão estática foi concluída, mas não é auditoria/certificação. Não reativar a POC-04 nem conectá-la ao `AuthDemoPage.jsx` antes de corrigir os dois itens de hardening.

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

- Este `AI_CONTEXT.md` descreve o estado atual e as regras de continuidade. Em uma conversa nova, leia-o por inteiro antes de qualquer alteração.
- `POC_04_SESSOES.md` registra a implementação, os ensaios, a revisão estática e o merge da PR #14 em `dev`. A sessão sintética continua separada e desabilitada; os dois pontos de hardening bloqueiam sua reativação. A POC não implementa autenticação de usuários nem se conecta ao fluxo principal.
- `ROADMAP_ESTUDOS.md` organiza a evolução por valor didático e relevância para a demonstração, sem ampliar o escopo para uma operação comercial.
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

Os testes das POCs devem permanecer nos scripts npm e no workflow: `npm run test:poc01`, `npm run test:poc02`, `npm run test:poc03`, `npm run test:poc04` e `npm run test:loo`. Não criar etapas E2E ou Lighthouse só para imitar outro projeto; introduzi-las quando houver fluxos reais que justifiquem esses testes.

A Vercel hospeda o frontend. O workflow de CI valida o código, mas não substitui a conferência do deployment, do SHA publicado e testes manuais de navegação/responsividade. Não afirmar que o Google Apps Script, Sheets ou Drive estão funcionando antes de validar sua integração real.

## 13. Snapshot automatizado do repositório

<!-- BEGIN AUTO-GENERATED SECTION -->

## Snapshot automatizado do repositório

> Gerado por scripts/update-ai-context.mjs. Não edite manualmente o conteúdo entre os marcadores.

- **Commit de referência:** 59906838f69cb0c5a20a0dd2f5b7b7e73f17b1f2
- **Data do commit:** 2026-11-20T17:48:06-03:00
- **Mensagem do commit:** docs(roadmap): ajustar ordem das proximas etapas
- **Branch desta execução:** docs/record-service-lifecycle-validation
- **Projeto declarado:** home-service@0.0.0
- **Scripts npm:** 12
- **Dependências de runtime:** 4
- **Dependências de desenvolvimento:** 11
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
| npm run test:loo | node --test tests/loo/domain-entities.test.js |
| npm run test:poc04 | node --test tests/poc04/gateway.test.js tests/poc04/apps-script.test.js |
| npm run test:authorization | node --test tests/authorization/apps-script.test.js tests/authorization/gateway.test.js |

### Variáveis declaradas no .env.example

> Somente os nomes são listados; valores nunca são lidos nem publicados.

- APPS_SCRIPT_HMAC_SECRET
- APPS_SCRIPT_WEB_APP_URL
- POC04_ALLOWED_ORIGIN
- POC04_APPS_SCRIPT_HMAC_SECRET
- POC04_APPS_SCRIPT_WEB_APP_URL
- POC04_ENABLED

### Dependências de runtime

| Pacote | Versão declarada |
|---|---|
| hash-wasm | 4.13.0 |
| lucide-react | ^1.61.0 |
| react | ^19.3.1 |
| react-dom | ^19.3.1 |

### Dependências de desenvolvimento

| Pacote | Versão declarada |
|---|---|
| @eslint/js | ^10.0.1 |
| @tailwindcss/vite | ^4.3.5 |
| @types/react | ^19.3.0 |
| @types/react-dom | ^19.3.0 |
| @vitejs/plugin-react | ^6.1.2 |
| eslint | ^10.14.0 |
| eslint-plugin-react-hooks | ^7.1.1 |
| eslint-plugin-react-refresh | ^0.5.7 |
| globals | ^17.13.0 |
| tailwindcss | ^4.3.5 |
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
- src/pages/AuthDemoPage.jsx
- src/pages/HomePage.jsx
- src/pages/Poc01Page.jsx
- src/services/app-api.js
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
| 5990683 | 2026-11-20 | docs(roadmap): ajustar ordem das proximas etapas |
| 5574c3b | 2026-11-20 | docs(ai-context): atualizar snapshot automaticamente |
| f25c94c | 2026-11-20 | docs(ai-context): atualizar snapshot automaticamente |
| f109ed6 | 2026-11-20 | docs(prototipo): atualizar estado do ciclo de vida |
| ae38c65 | 2026-11-20 | docs(spec): atualizar validacao de servicos |
| 96469b4 | 2026-11-20 | docs(roadmap): concluir etapa de ciclo de vida |
| 069773a | 2026-11-20 | docs(ai-context): registrar ciclo de vida validado |
| e6d231c | 2026-11-20 | docs(ai-context): atualizar snapshot automaticamente |

<!-- END AUTO-GENERATED SECTION -->
