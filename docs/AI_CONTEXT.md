# Conecta Local — Contexto técnico para IAs

> Documento de continuidade do projeto. Leia antes de sugerir ou realizar alterações. Reúne propósito, decisões, arquitetura planejada, estado implementado, regras de manutenção e limitações. A seção de snapshot ao final é atualizada pelo GitHub Actions.


## Atualização — gráficos animados na área profissional (27/11/2026)

- A branch feat/professional-dashboard-motion-charts adiciona GSAP 3.15.1 e Recharts 3.11.2 como dependências de runtime.
- src/components/ui/chart.jsx implementa DonutChart e HorizontalBarChart com Recharts, tooltips customizados, responsividade, destaque interativo da legenda e estados vazios.
- GSAP é usado somente para a entrada do cabeçalho, indicadores, cartões analíticos e painéis das seções; gsap.context é revertido ao navegar ou desmontar.
- Recharts cuida das animações de segmentos e barras. As animações de ambas as bibliotecas são desativadas para prefers-reduced-motion.
- Os gráficos continuam consumindo apenas dados reais da lista de serviços da conta: status, categoria, cidade e imagens ativas. Nenhuma métrica de audiência foi simulada ou criada.
- A coleta de visualizações do perfil/serviço e cliques de contato segue como etapa backend separada; não misturar métricas de engajamento com os atuais indicadores de gestão.
- A integração permanece em branch de feature → PR para dev. Autenticação e validação integrada devem ocorrer somente no deployment fixo de dev. main não deve ser alterada sem autorização explícita.

## Atualização vigente — 2026-11-24

### Situação atual e próxima frente — verificada em 24/11/2026

- A branch `dev` está no commit `d16278c5b6df6df370645b18a05dfb5ea0effe08`. O Preview Vercel associado é `dpl_AfNaMm1WqRFJa3jhhwXhfkgwPUTv`, estado `READY`, URL https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app.
- A Production (`main`) permanece no commit `49354a46863d5a5eb36ce32e450b975d4087fe3b`. Não promover mudanças nem habilitar backend em Production sem decisão explícita.
- As PRs #28 e #29 integraram o catálogo público e a correção da entrega de imagens em `dev`. A integração real de imagens foi validada no Preview em 21/11/2026 com cinco imagens do Drive: HTTP 200 quando elegíveis, HTTP 404 durante pausa e após remoção, e recuperação após republicação. A validação registrada cobre esse fluxo; não equivale a homologação visual completa de todas as páginas.
- Em 24/11/2026, o responsável classificou o design atual como genérico e definiu o redesign visual/UX como próxima frente do projeto. A funcionalidade existente deve ser preservada; a prioridade é criar identidade visual própria, melhor hierarquia e consistência entre homepage, catálogo, categorias, detalhes e área do profissional.
- O plano de trabalho é `docs/PLANO_REDESIGN_INTERFACE.md`; o roadmap foi reorganizado para posicionar o redesign antes da pesquisa com a comunidade. A direção visual ainda não foi escolhida. Não antecipar cores, fontes, referências, estilo ou implementação antes da etapa de diagnóstico e aprovação da direção visual.
- A pesquisa comunitária continua preparada, mas não aplicada. A coleta permanece condicionada à orientação do professor/orientador e será retomada depois do redesign.


- Em 20/11/2026, o responsável esclareceu o contexto acadêmico: o Conecta Local está sendo desenvolvido em um curso Técnico em Informática, e não como Projeto Integrador do curso de ADS da Uniube. Não associar o projeto à Uniube.

> Esta seção registra o estado mais recente conhecido. Consulte os SHAs e os arquivos do branch efetivamente em análise antes de realizar mudanças.

- Em 21/11/2026, a PR #30 integrou em `dev` a sessão compartilhada pelo `AuthProvider`, o estado global de autenticação e o menu da conta com `Minha conta` e `Sair` (merge commit `4696a5039243c7baf300e835973417af6003723c`). Em 23/11/2026, a PR #31 separou os acessos de visitante em `Entrar` e `Criar conta`, com destinos diretos para login/cadastro no desktop e menu móvel (merge commit `3a99eb1650d118ce8ccb20fc3de7b179125e86b7`). O responsável confirmou a validação visual desses dois acessos no Preview de `dev`.
- A Etapa 2 — edição dos dados do perfil — foi integrada em `dev` pela PR #32, merge commit `db31cee401cb47369811a9ca2326a2268e27e51a`. Permite editar nome completo, nome público, WhatsApp, apresentação e cidade principal, com allowlist no gateway, validação/autorização no Apps Script, atualização do AuthProvider e auditoria. Em 23/11/2026, o responsável confirmou que testou e que a edição funcionou no Preview após sincronizar/publicar o Apps Script.
- A Etapa 3 — foto de perfil — foi integrada exclusivamente em `dev` pela PR #33, merge commit `782d8ede22ffcf8f1b3193c70e956715ca701af0`. A CI pós-merge [Validate Home Service #45255089911](https://github.com/kleber-goncalves/home-service/actions/runs/45255089911) concluiu SUCCESS, incluindo os testes de autorização/foto, cliente de upload, ESLint e build. O Preview atualizado ficou READY no deployment `dpl_FhiT8ui3hTvyKfgrjYezGf7qL364`, commit `a16fc2ad52236c293d54927b73e3a300240cc645`, no alias fixo de `dev`. A foto usa o transporte retomável existente, mas reserva a imagem pelo profissional e grava `IMAGENS` com `id_profissional` preenchido e `id_servico` vazio. O arquivo fica privado no Google Drive; a entrega passa por `/api/public-images?id=<imageId>` e o Apps Script revalida registro e conta ativos. Upload, substituição, remoção, sessão e avatar do cabeçalho estão implementados. **Validação manual concluída em 23/11/2026:** após sincronizar o `apps-script/conecta-local/Code.gs` e publicar nova versão da implantação Web App existente, o responsável confirmou que os testes no Preview passaram. `main` permanece inalterada em `49354a46863d5a5eb36ce32e450b975d4087fe3`.
- Em 24/11/2026, a Etapa 4 — alteração de e-mail — foi integrada exclusivamente em `dev` pela PR #34, merge commit `9aa91e089b689602dd5fd6743bab10f95f7175cf`. O gateway revalida a senha atual com Argon2id; o Apps Script verifica sessão, papel, unicidade e reserva do novo endereço, grava um código com HMAC vinculado ao usuário e destino, validade de 10 minutos, cinco tentativas e intervalo mínimo de 60 segundos. O e-mail atual só é substituído após confirmação; em seguida, todas as sessões são revogadas e o login é exigido novamente. A interface mostra o código apenas como demonstração e informa que nenhum e-mail real é enviado. A validação completa da PR passou em [Validate Home Service #45434385314](https://github.com/kleber-goncalves/home-service/actions/runs/45434385314), incluindo autorização/Apps Script, gateway, lint, registro de ocorrências e build; a CI pós-merge [#45434598519](https://github.com/kleber-goncalves/home-service/actions/runs/45434598519) também concluiu SUCCESS. **Validação manual integrada concluída em 24/11/2026:** após sincronizar/publicar o Apps Script, o responsável confirmou que os testes da alteração de e-mail passaram no Preview de `dev`. Deployment verificado: `dpl_4jh3WSBqjU2hFSrFG2KuDUTAzWoe`, READY, commit `4e416702083750e599588db22ac6a1be4723361c`. A confirmação é demonstrativa e não envia e-mails reais. `main` permanece inalterada.
- O ambiente conectado ao Apps Script/Sheets permanece restrito ao Preview fixo da branch `dev`. A branch `feat/*` não recebe as variáveis secretas de Preview. Como o código da pasta `apps-script/conecta-local/Code.gs` não se sincroniza automaticamente com a implantação Web App do Google, após a integração da etapa será necessário sincronizar o arquivo e publicar nova versão do Apps Script antes dos testes manuais no Preview de `dev`. Não duplicar nem ampliar escopo dos segredos para testar branches de feature.
- O PR #15 (`feat/prototipo-demo-profissional` → `dev`) foi integrado em 16/11/2026. O protótipo funcional com cadastro, confirmação demonstrativa, login, sessão, perfil, criação/pausa/publicação de serviços e persistência no Google Sheets está na branch `dev`.
- Em 20/11/2026, após as integrações das PRs #16, #17 e #14, o responsável confirmou ter repetido os testes do fluxo principal no Preview atualizado de `dev` e informou que a demonstração está funcionando. O histórico anterior de validação do PR #15 permanece registrado em 16/11; a confirmação mais recente é a referência funcional para a continuidade.
- O PR #16 integrou as classes `Usuario`, `Profissional` e `Servico` em `server/domain-entities.js`, com testes em `tests/loo/domain-entities.test.js` (`npm run test:loo`). O PR #17 corrigiu a composição da vitrine para manter os serviços de exemplo junto aos serviços cadastrados.
- O PR #18 adicionou `docs/PROJETO_INTEGRADOR_CONECTA_LOCAL.md`. O PR #19 integrou `dev` em `main`.
- O PR #19 sincronizou o núcleo do protótipo de `dev` com `main` por fast-forward, sem force push. Depois, o PR #20 atualizou quatro documentos em `dev`; em 20/11, a PR #14 adicionou à `dev` a POC-04 independente e desabilitada. `main` permanece em `49354a46863d5a5eb36ce32e450b975d4087fe3b`; portanto, o núcleo funcional da demonstração permanece alinhado, enquanto os arquivos exclusivos da POC-04 e as atualizações documentais estão somente em `dev`.
- A PR #23 concluiu o ciclo de vida dos serviços em `dev` (edição e remoção lógica). Em 20/11/2026, após a sincronização do Apps Script e a publicação da implantação Web App existente, o responsável confirmou que os testes manuais passaram no Preview fixo da branch `dev`; o deployment `dpl_FT5dFsPzB6B1phwGywur4ewjRkZS` está `READY` no commit `e6d231c`. `main` permanece inalterada.
- A PR #25 (`feat/service-city-coverage`) integrou a Etapa 3 exclusivamente em `dev` em 20/11/2026, pelo merge commit `5003604a51def9bdf58df9845d36c2ec75a4452e`. A CI do merge (#44820409487) concluiu SUCCESS, e o Preview fixo de `dev` ficou READY no deployment `dpl_4n5E7JLaUQPHezVk8ymGRXZSS7Bx` (commit de código do merge). A implementação usa `SERVICO_CIDADES` para associar múltiplos municípios por serviço, preserva fallback dos serviços antigos, alinha filtros de categoria e sugere cidades ativas. Em 20/11/2026, o responsável confirmou a sincronização/publicação do Apps Script real e informou que os testes manuais passaram: a edição de um serviço existente atualizou `SERVICO_CIDADES`; a homepage encontrou o serviço pela cidade original; e a associação temporária do mesmo serviço a duas cidades permitiu encontrá-lo nas duas localidades. A validação funcional principal da Etapa 3 está concluída com base nesse relato. **Limpeza concluída:** o responsável confirmou a remoção da cidade temporária e de seus vínculos em `SERVICO_CIDADES`; apenas a cidade original permanece na planilha, com os registros permanentes preservados. `main` permanece inalterada em `49354a46863d5a5eb36ce32e450b975d4087fe3b`.
- A PR #26 (`feat/drive-image-upload`) integrou a Etapa 4 exclusivamente em `dev` em 20/11/2026 (horário local), pelo merge commit `6dab42ba291008a20a490542dcaf28c6c439c7d2`. A CI pós-merge #44850407547 concluiu SUCCESS com auditoria, POC-01/02/03/04, autorização, testes de imagens, LOO, ocorrências, ESLint e build; o workflow AI Context #44850407640 também concluiu SUCCESS. O Preview de `dev` ficou READY no deployment `dpl_Bqwfwchf4vpH1LKLBFte2Y1yav9Y`. O responsável confirmou a validação manual principal no Preview com Apps Script, Sheets e Drive reais de teste. `main` permanece inalterada em `49354a46863d5a5eb36ce32e450b975d4087fe3b`; Production continua sem backend.
- As variáveis `CONECTA_LOCAL_APPS_SCRIPT_URL`, `CONECTA_LOCAL_ALLOWED_ORIGIN` e `CONECTA_LOCAL_HMAC_SECRET` estão configuradas no Vercel Preview com restrição explícita `gitBranch: dev`; seus valores são secretos e não devem ser lidos, copiados para documentação ou compartilhados. Deploys de outras branches, inclusive `feat/*`, não têm conexão automática com Apps Script/Sheets. O ambiente conectado à planilha é exclusivamente o Preview fixo de `dev`: https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app. Não duplicar nem ampliar o escopo dos segredos para facilitar testes de branch. Production permanece sem variáveis de backend.
- Em 21/11/2026, a Etapa 5 foi integrada em `dev` pela PR #28 (merge commit `22ba720c6fdd22f3bef4cc5b29963279c5119ff9`) e corrigida pela PR #29 (`fix: corrigir imagens públicas e restaurar seções da homepage`), integrada exclusivamente em `dev` pelo merge commit `77e88be6d9d20151a178f7fe31ea76509299becb`. A validação pós-merge `Validate Home Service` [#44937440114](https://github.com/kleber-goncalves/home-service/actions/runs/44937440114) e o workflow `AI Context — Synchronize` [#44937440122](https://github.com/kleber-goncalves/home-service/actions/runs/44937440122) concluíram SUCCESS. O responsável sincronizou o `apps-script/conecta-local/Code.gs` com o projeto Apps Script existente e atualizou sua implantação Web App. No Preview fixo de `dev`, confirmou que as cinco imagens reais do serviço de teste `Aparar grama` carregam; ao pausar o serviço, as cinco retornam HTTP 404; ao republicá-lo, as cinco voltam a HTTP 200 com MIME e conteúdo de imagem; após remover uma imagem, seu ID antigo retorna 404 e desaparece do catálogo, enquanto as outras quatro continuam acessíveis. A implantação Vercel verificada ficou READY em `dpl_3me1dDL9tjaeQveKPFx8YXYfrDm3`, no commit `cf0e932b854a48e67c0d69e84136bbae1e40f189`, acessível pelo alias Preview fixo. `main` permanece em `49354a46863d5a5eb36ce32e450b975d4087fe3b`.
- O gateway em `api/app.js` → `server/app-gateway.js` bloqueia as operações de negócio fora de Vercel Preview. Production permanece como vitrine pública, conforme decisão do responsável pelo projeto.
- O Apps Script de negócio está em `apps-script/conecta-local/Code.gs`. O fluxo operacional atual utiliza dez abas do Sheets: `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS`, `SERVICO_CIDADES`, `IMAGENS` e `AUDITORIA`. A modelagem aprovada contempla 12 abas; `CONTROLE_AUTENTICACAO` e `DENUNCIAS` ainda não têm fluxo operacional implementado.
- Argon2id (`hash-wasm@4.13.0`) e comparação de hash por `timingSafeEqual` estão integrados no gateway do protótipo. Isso atende à demonstração acadêmica, não constitui auditoria independente ou aprovação para produção.
- A POC-04 foi integrada à branch `dev` pela PR #14 em 20/11/2026 (merge commit `adb51e2f1de8b9d47fb59205938b3e33e21739a1`), mas continua independente do login principal e desabilitada. Os ensaios sintéticos foram concluídos; os recursos temporários, nonces, segredo Apps Script e variáveis Vercel exclusivas foram limpos. A revisão estática identificou dois bloqueios para qualquer reativação: leitura de corpos/respostas limitada somente após leitura integral e ausência de rate limiting/limite de emissão. O responsável aceitou manter esses pontos como limitações documentadas deste ciclo; não reativar nem conectar a POC ao login principal. Falhas reais de infraestrutura e testes de carga não foram executados. Consultar `docs/POC_04_SESSOES.md`.
- A pesquisa comunitária do Conecta Local está em preparação. Os questionários preliminares para moradores e profissionais estão em `PESQUISA_COMUNIDADE.md`; as orientações de aplicação e análise estão em `docs/GUIA_APLICACAO_PESQUISA_COMUNIDADE.md`; o roteiro detalhado existente permanece em `docs/ROTEIRO_PESQUISA_EXPLORATORIA.md`. Em 20/11/2026, os instrumentos ainda aguardam revisão do professor/orientador; coleta e análise não foram iniciadas/confirmadas. Não fabricar resultados nem iniciar a aplicação antes de confirmar os procedimentos acadêmicos e de participação voluntária.
- Usar somente dados fictícios. Não configurar backend em Production nesta etapa.

- A Etapa 4 (imagens no Google Drive) foi concluída no escopo do MVP e integrada exclusivamente em `dev` pela PR #26, merge commit `6dab42ba291008a20a490542dcaf28c6c439c7d2`. A CI pós-merge [Validate Home Service #44850407547](https://github.com/kleber-goncalves/home-service/actions/runs/44850407547) concluiu SUCCESS; a sincronização automática de contexto [#44850407640](https://github.com/kleber-goncalves/home-service/actions/runs/44850407640) também passou. O deployment Preview de `dev` `dpl_Bqwfwchf4vpH1LKLBFte2Y1yav9Y` ficou READY no commit de merge, em https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app. A integração usa upload retomável em blocos de 1 MiB pela rota Vercel `/api/images`, HMAC servidor-servidor e Apps Script; a URI de sessão do Drive permanece no Apps Script. O fluxo operacional grava metadados em `IMAGENS`, eventos em `AUDITORIA` e aplica permissões por arquivo: serviço publicado/conta ativa permite acesso por link; serviço pausado, removido ou inelegível restringe os arquivos. Limite: até 5 imagens ativas por serviço, JPG/JPEG/PNG/WebP, 5.000.000 bytes cada. O responsável confirmou no Preview dois uploads reais, remoção lógica com auditoria e acesso restrito no Drive, bloqueio da sexta imagem ativa e sincronização de permissões ao pausar e republicar. A validação manual principal está concluída; não foram reportados como ensaiados manualmente nesta rodada os testes individuais de todos os formatos, interrupção deliberada de blocos ou falha forçada entre Drive e Sheets. `main` e Production permanecem inalteradas e sem backend habilitado. O plano Vercel é Hobby; não fazer upgrade nem alterar billing para habilitar o beta de corpo 20 MiB. Preservar os limites dos endpoints JSON atuais e não promover o Preview para Production sem decisão e revisão específicas.

- A entrega pública de imagens em `dev` não expõe o token OAuth ao navegador: `server/public-image-gateway.js` chama `public.image.resolve` por HMAC interno e transmite o conteúdo binário do Drive. O Apps Script revalida, a cada requisição, se a imagem está ativa, o serviço está publicado, o usuário está ativo e MIME/tamanho correspondem aos metadados. O mapeamento frontend usa URLs same-origin `/api/public-images?id=<imageId>`. **Validação manual integrada — PASS em 21/11/2026:** no Preview real com Apps Script, Sheets e Drive, cinco imagens JPEG/PNG foram entregues com HTTP 200; a pausa bloqueou 5/5 com HTTP 404; a republicação recuperou 5/5 com HTTP 200; a remoção de uma imagem fez o ID antigo retornar HTTP 404 e sumir de `public.services`, sem afetar as outras quatro. A validação foi executada pelo responsável e não constitui auditoria independente, teste de carga ou aprovação para Production.

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
- **Finalidade:** projeto acadêmico de desenvolvimento web realizado no contexto de um curso Técnico em Informática, com possibilidade de evolução após a entrega. O responsável esclareceu em 20/11/2026 que este projeto não pertence ao curso de Análise e Desenvolvimento de Sistemas da Uniube; não atribuir a ele essa instituição ou curso.
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

**Estado atualizado em 21/11/2026 — `dev` contém a Etapa 5 (PR #28) e as correções da PR #29; a validação manual do gateway de imagens com Apps Script/Sheets/Drive reais de teste passou. `main` continua no release público `49354a46863d5a5eb36ce32e450b975d4087fe3b`. O snapshot automatizado ao final registra o head corrente.

### Implementado e integrado

- A linha de base anterior à Etapa 5 concentrava a homepage em `src/pages/HomePage.jsx`, misturava serviços públicos e exemplos locais e não possuía catálogo e detalhe em rotas próprias; esse diagnóstico histórico foi tratado pelas PRs #28 e #29.
- **Etapa 5 integrada em `dev` pelas PRs #28 e #29:** implementadas as rotas `/`, `/servicos`, `/categorias` e `/servicos/:serviceId`; homepage com serviços reais e exemplos ilustrativos em seções distintas; catálogo com filtros por texto/categoria/cidade; categorias ativas; detalhe com galeria e WhatsApp; cartão reutilizável com imagem principal e indicador `+N fotos`; seções `FAQSection`, `PopularServices` e `AboutSection` restauradas.
- A API Apps Script `public.services` retorna os metadados das imagens ativas em `images[]`; a camada de catálogo preserva a coleção, e a entrega ao navegador usa o gateway same-origin `/api/public-images?id=<imageId>`. A galeria suporta até cinco imagens por serviço.
- Os cinco exemplos ilustrativos aparecem sempre em seção própria, identificada como exemplos, mesmo quando há serviços publicados; não entram em `/servicos`, na busca, nos filtros ou na contagem de cadastros reais.
- Cadastro, confirmação de código demonstrativo, login, sessão, atualização do perfil, criação, edição, pausa/publicação e remoção lógica de serviços, além da consulta pública, implementados em `src/pages/AuthDemoPage.jsx`, `src/services/app-api.js`, `api/app.js` e `server/app-gateway.js`.
- Em 20/11/2026, o responsável informou que repetiu os testes do fluxo funcional no Preview atualizado de `dev`, após as integrações das PRs #16 e #17, e confirmou o funcionamento correto. O fluxo inclui catálogo, cadastro/ativação demonstrativa, persistência em Sheets, login/restauração de sessão, criação, pausa/publicação, vitrine e logout, com dados fictícios.
- O Apps Script de negócio está em `apps-script/conecta-local/Code.gs`; utiliza operacionalmente as abas `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS`, `SERVICO_CIDADES`, `IMAGENS` e `AUDITORIA`.
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
- A modelagem prevê 12 abas/entidades; dez são utilizadas operacionalmente pelo backend de negócio. `CONTROLE_AUTENTICACAO` e `DENUNCIAS` ainda não têm fluxos operacionais.
- Ainda não implementados: recuperação/alteração de senha ou e-mail, painel administrativo, denúncias/moderação e gestão administrativa de categorias/cidades.
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

### Etapa 3 — Descoberta por cidade e categoria (concluída em 20/11/2026)

- A PR #25 (`feat/service-city-coverage`) foi integrada em `dev` em 20/11/2026 pelo merge commit `5003604a51def9bdf58df9845d36c2ec75a4452e`. Não alterou `main` ou Production.
- O Apps Script no repositório lê e grava a relação `SERVICO_CIDADES` para associar um serviço a um ou mais municípios. A criação exige pelo menos uma cidade ativa; IDs inexistentes, duplicados e cidades inativas em novas associações são recusados.
- Na edição, vínculos já existentes com cidades posteriormente inativadas podem ser preservados; não é permitido criar novas associações com cidades inativas.
- Serviços legados sem linhas em `SERVICO_CIDADES` continuam usando a cidade principal do profissional como fallback até serem editados. A edição passa então a gravar os vínculos do próprio serviço.
- `service.listMine` e `public.services` retornam `cityIds` e `cities`; a busca textual da homepage usa a lista de municípios atendidos e oferece sugestões do catálogo ativo `CIDADES` pelo `datalist` do campo de localidade.
- O catálogo público mantém serviços publicados quando sua categoria é posteriormente inativada. Categorias ativas continuam sendo a fonte dos filtros dinâmicos quando há serviços persistidos; os rótulos dos cartões ilustrativos foram alinhados à taxonomia inicial de `CATEGORIAS`.
- O formulário do profissional permite marcar múltiplos municípios na criação/edição. A cidade principal é sugerida por padrão somente quando ainda está ativa.
- Testes em `tests/authorization/apps-script.test.js` cobrem fallback legado, múltiplas cidades, lista vazia/duplicada/inativa, substituição de vínculos e catálogo após inativação de categoria. Gateway e entidade também validam o contrato `cityIds`.
- **CI — PASS:** workflow no merge commit, run [#44820409487](https://github.com/kleber-goncalves/home-service/actions/runs/44820409487), concluiu SUCCESS; passaram auditoria bloqueante de dependências de produção, POC-01/02/03/04, autorização/ownership, LOO, registro de ocorrências, ESLint e build.
- **Preview — READY:** deployment `dpl_4n5E7JLaUQPHezVk8ymGRXZSS7Bx` está pronto para o commit `5003604a51def9bdf58df9845d36c2ec75a4452e`; o alias fixo `https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app/` aponta para ele.
- **Validação real — PASS:** o responsável confirmou a sincronização de `apps-script/conecta-local/Code.gs` e a publicação de nova versão na implantação Web App existente. No Preview, confirmou que a edição de um serviço atualizou `SERVICO_CIDADES`, que o serviço continuou encontrável pela cidade original e que a associação temporária a uma segunda cidade permitiu encontrá-lo nas duas localidades. A cidade temporária e seus vínculos foram removidos após o ensaio; somente a cidade original permaneceu. Esses resultados são validação manual relatada pelo responsável, não auditoria independente.
- **Limites:** operações em `SERVICOS`, `SERVICO_CIDADES` e `AUDITORIA` não são uma transação atômica. Não declarar atomicidade nem habilitar backend em Production.



### Etapa 5 — Catálogo público, navegação e apresentação de imagens

**Status em 21/11/2026: integrada e validada funcionalmente em `dev`.** A PR #28 integrou o catálogo e a navegação; a PR #29 corrigiu a entrega das imagens reais, manteve os exemplos ilustrativos visíveis em seção independente e restaurou as seções institucionais da homepage. PR #29: [#29](https://github.com/kleber-goncalves/home-service/pull/29), merge commit `77e88be6d9d20151a178f7fe31ea76509299becb`.

**Implementado em `dev`:**
- Rotas públicas `/`, `/servicos`, `/categorias` e `/servicos/:serviceId`, com histórico, navegação por URL direta e compatibilidade com `?auth=demo` e `?poc=01`.
- Homepage com serviços publicados reais e exemplos ilustrativos sempre apresentados em seções separadas; seções `FAQSection`, `PopularServices` e `AboutSection` restauradas.
- Catálogo com pesquisa textual, filtros por categoria/cidade, contador, limpeza de filtros e parâmetros refletidos na URL.
- Página de categorias ativas e detalhe do serviço com galeria de até cinco imagens, miniaturas, controle anterior/próxima, contador, cidades atendidas e contato WhatsApp.
- Modelo público preserva `images[]` ordenada, `categoryId`, IDs e cidades. O cartão apresenta a imagem principal e quantidade de fotos adicionais; imagem ausente/quebrada usa placeholder neutro.
- A entrega das imagens usa a Function Vercel `api/public-images.js`, o gateway `server/public-image-gateway.js` e a ação Apps Script HMAC `public.image.resolve`. O navegador recebe conteúdo binário por URL same-origin; token OAuth e ID do arquivo Drive permanecem no servidor.
- A elegibilidade é revalidada a cada requisição: imagem ativa, serviço publicado, conta de usuário ativa e metadados MIME/tamanho coerentes com o arquivo Drive. O endpoint opera somente no Preview e recusa requisições cross-site.

**Validação automatizada e implantação:**
- Validate Home Service no merge commit da PR #29, [run #44937440114](https://github.com/kleber-goncalves/home-service/actions/runs/44937440114): SUCCESS.
- AI Context — Synchronize, [run #44937440122](https://github.com/kleber-goncalves/home-service/actions/runs/44937440122): SUCCESS.
- Preview fixo de `dev`: deployment `dpl_3me1dDL9tjaeQveKPFx8YXYfrDm3`, READY no commit `cf0e932b854a48e67c0d69e84136bbae1e40f189`; alias `https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app`. Esse ambiente mantém as variáveis conectadas ao Apps Script/Sheets restritas à branch `dev`.

**Validação manual integrada — PASS, executada pelo responsável em 21/11/2026:**
- O responsável sincronizou o `apps-script/conecta-local/Code.gs` atualizado com o projeto Apps Script existente e atualizou a implantação Web App utilizada pelo Preview.
- A consulta `public.services` retornou cinco imagens do serviço de teste `Aparar grama`: três JPEG e duas PNG, com metadados de MIME/tamanho.
- Com o serviço publicado, as cinco imagens foram entregues pelo gateway: HTTP 200, Content-Type de imagem e corpo binário não vazio.
- Após pausar o serviço, as cinco requisições retornaram HTTP 404.
- Após republicá-lo, as cinco voltaram a retornar HTTP 200, com MIME e conteúdo de imagem válidos.
- Após remover uma imagem pela interface de administração, o ID antigo passou a retornar HTTP 404 e deixou de aparecer em `public.services`; as outras quatro imagens continuaram retornando HTTP 200.
- Os exemplos ilustrativos e a homepage corrigida também foram conferidos pelo responsável no site. Os testes são validações funcionais manuais do ambiente de Preview, não auditoria independente, teste de carga ou aprovação para Production.

**Limites e continuidade:** `main` permanece em `49354a46863d5a5eb36ce32e450b975d4087fe3b`, sem backend habilitado. Não ampliar o escopo das variáveis Vercel, não copiar segredos e não promover o Preview para Production sem decisão e revisão específicas. A validação registrada cobre os cenários listados acima; não declara como executados testes de carga, interrupções deliberadas de upload ou auditoria externa.
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
- **Google Sheets:** armazenamento operacional da demonstração nas abas `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS`, `SERVICO_CIDADES`, `IMAGENS` e `AUDITORIA`. A modelagem aprovada possui 12 abas; `CONTROLE_AUTENTICACAO` e `DENUNCIAS` ainda não têm operações de negócio implementadas.
- **Google Drive:** armazenamento de imagens de serviços integrado em `dev` e validado no Preview com a pasta privada e permissões individuais. Upload retomável em blocos, gerenciamento e remoção lógica são implementados pelo Apps Script e pelo gateway Vercel. Não habilitar backend em Production.
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

Google Sheets não impõe automaticamente FKs, unicidade composta ou integridade relacional; esses controles pertencem ao Apps Script e exigem validação de concorrência. A planilha estrutural possui 12 abas modeladas; o backend da demonstração utiliza operacionalmente dez: `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS`, `SERVICO_CIDADES`, `IMAGENS` e `AUDITORIA`. `CONTROLE_AUTENTICACAO` e `DENUNCIAS` ainda não têm fluxo operacional. A persistência do fluxo principal e das imagens foi exercitada no Preview com dados fictícios/licenciados.

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
- Recuperação de senha, alteração de senha e envio real de e-mail não estão implementados. A alteração de e-mail está integrada e validada manualmente em `dev` pela PR #34; a confirmação permanece demonstrativa, sem entrega de mensagens.
- Edição/remoção dos próprios serviços e gerenciamento de imagens no Google Drive estão integrados em `dev` e validados funcionalmente no Preview. A entrega pública usa `server/public-image-gateway.js` + `public.image.resolve`, com token OAuth apenas server-side e revalidação da elegibilidade em cada requisição. Os cenários reais de publicação, pausa, republicação e remoção de imagens foram aprovados em 21/11/2026. Painel administrativo, denúncias/moderação e gestão administrativa ainda não estão implementados.
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
- `PLANO_REDESIGN_INTERFACE.md` define a próxima frente visual/UX; a direção visual ainda depende de diagnóstico e aprovação, e não deve ser presumida.
- `ESPECIFICACAO_MVP.md` v0.4 consolida os requisitos funcionais; as Etapas 3 e 4 do roadmap estão implementadas e validadas funcionalmente em `dev`/Preview. `MODELAGEM_DADOS.md` contém a modelagem lógica e o esquema físico aprovado conceitualmente (12 entidades/102 campos e 12 abas/102 colunas); outras funcionalidades permanecem no backlog.
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

- **Commit de referência:** 40fa1a51eae7a3781649d0e063d68fe26b6a0853
- **Data do commit:** 2026-11-27T13:56:04-03:00
- **Mensagem do commit:** chore(preview): remover rota temporaria de demonstracao
- **Branch desta execução:** feat/professional-dashboard-chart-visual-review
- **Projeto declarado:** home-service@0.0.0
- **Scripts npm:** 14
- **Dependências de runtime:** 6
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
| npm run test:images | node --test tests/images/upload-gateway.test.js tests/images/image-api.test.js tests/images/public-image-gateway.test.js |
| npm run test:public-catalog | node --test tests/public-catalog/public-catalog.test.js |

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
| gsap | ^3.15.1 |
| hash-wasm | 4.13.0 |
| lucide-react | ^1.61.0 |
| react | ^19.3.1 |
| react-dom | ^19.3.1 |
| recharts | ^3.11.2 |

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
- src/components/home/category-featured-services.jsx
- src/components/home/featured-service-card.jsx
- src/components/home/hero-search.jsx
- src/components/home/home-sections.jsx
- src/components/home/local-service-overview.jsx
- src/components/home/site-header.jsx
- src/components/professional/profile-photo-manager.jsx
- src/components/professional/service-image-manager.jsx
- src/components/public/app-link.jsx
- src/components/public/service-card.jsx
- src/components/public/service-image.jsx
- src/components/public/site-footer.jsx
- src/components/ui/badge.jsx
- src/components/ui/button.jsx
- src/components/ui/card.jsx
- src/components/ui/chart.jsx
- src/components/ui/input.jsx
- src/contexts/auth-context.js
- src/contexts/auth-provider.jsx
- src/data/homepage.js
- src/hooks/use-auth.js
- src/hooks/use-public-catalog.js
- src/lib/navigation.js
- src/lib/public-catalog.js
- src/lib/utils.js
- src/main.jsx
- src/pages/AuthDemoPage.jsx
- src/pages/CategoriesPage.jsx
- src/pages/HomePage.jsx
- src/pages/NotFoundPage.jsx
- src/pages/Poc01Page.jsx
- src/pages/ProfessionalDashboardPage.jsx
- src/pages/ServiceDetailPage.jsx
- src/pages/ServicesPage.jsx
- src/services/app-api.js
- src/services/image-api.js
- src/services/poc-01-api.js

### Diretórios principais de src/

- src/components/
- src/contexts/
- src/data/
- src/hooks/
- src/lib/
- src/pages/
- src/services/

### Oito commits recentes até o commit de referência

| Commit | Data | Mensagem |
|---|---|---|
| 40fa1a5 | 2026-11-27 | chore(preview): remover rota temporaria de demonstracao |
| 55b937b | 2026-11-27 | docs(ai-context): atualizar snapshot automaticamente |
| e1985df | 2026-11-27 | docs(ai-context): atualizar snapshot automaticamente |
| c98a5cd | 2026-11-27 | style(preview): diferenciar identificador de demonstracao |
| fa16ccb | 2026-11-27 | fix(preview): identificar dados ficticios na barra superior |
| e07cf1f | 2026-11-27 | docs(ai-context): atualizar snapshot automaticamente |
| d5813c8 | 2026-11-27 | feat(preview): criar showcase com dados ficticios isolados |
| bff02fb | 2026-11-27 | feat(preview): adicionar rota visual sem autenticacao |

<!-- END AUTO-GENERATED SECTION -->
