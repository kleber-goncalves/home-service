# Roteiro de evolução acadêmica — Conecta Local

> **Atualizado em:** 24/11/2026  
> **Finalidade:** organizar as próximas etapas do projeto de estudos, priorizando aprendizado técnico e conclusão coerente da demonstração. Este roteiro não é um plano de operação comercial nem uma lista de requisitos obrigatórios para Production.

## 1. Ponto de partida

O núcleo demonstrativo já está implementado na branch `dev`:

- Homepage pública e catálogo demonstrativo.
- Cadastro com confirmação de código demonstrativo.
- Login e sessão com cookie protegido.
- Perfil profissional.
- Criação, edição, pausa, publicação e remoção lógica de serviços.
- Persistência no Google Sheets por Vercel Function e Google Apps Script.
- Controles de gateway, HMAC, Argon2id, comparação de hashes e validações de entrada.
- Classes de domínio `Usuario`, `Profissional` e `Servico`.

Em 20/11/2026, o responsável confirmou que repetiu o fluxo funcional no Preview atualizado de `dev` e que a demonstração está funcionando. Depois disso, foram integradas as jornadas de conta e perfil (PRs #30–#34), além do catálogo público (PRs #28 e #29). Em 24/11/2026, `dev` está no commit `d16278c5b6df6df370645b18a05dfb5ea0effe08` e o Preview está READY no deployment `dpl_AfNaMm1WqRFJa3jhhwXhfkgwPUTv`. A POC-04 continua desabilitada e independente do login principal.

**Limite fixo do projeto nesta fase:** usar somente dados fictícios, manter o backend restrito ao Preview e preservar `main` como vitrine pública.

## 2. Como decidir o que merece ser feito

Uma etapa entra no plano quando atende a pelo menos uma destas condições:

1. Completa uma jornada central do produto.
2. Ensina um conceito importante de desenvolvimento fullstack, modelagem, segurança ou integração.
3. Corrige um risco real do fluxo implementado.
4. Melhora de forma perceptível a demonstração acadêmica.

Evitar tarefas que apenas aumentem a arquitetura, criem infraestrutura sem necessidade ou simulem requisitos de um negócio que o projeto não pretende operar.

## 3. Etapas recomendadas

### Etapa 0 — Encerramento do núcleo demonstrativo

**Status: concluída.**

**Objetivo:** manter uma versão funcional e reproduzível para apresentação.

Escopo concluído:
- Integração do núcleo funcional em `dev`.
- Persistência e operações básicas de serviços.
- Revalidação manual do fluxo principal pelo responsável no Preview atualizado em 20/11/2026.
- Integração da PR #14, preservando a POC-04 desabilitada.
- Registro do estado de `dev` e `main`.

Não reabrir esta etapa sem um bug reproduzível ou mudança de requisito.

### Etapa 1 — Autorização e integridade dos dados

**Validação técnica concluída em 20/11/2026; PR #22 integrada exclusivamente em `dev`.** A etapa atendeu aos critérios de isolamento de propriedade e autorização por papel confiável no backend real do Apps Script.

**Por que veio primeiro:** é o aprendizado de maior valor para um sistema com contas e dados privados. Uma interface pode funcionar perfeitamente para o próprio usuário e ainda permitir acesso indevido a dados de outra conta se a validação do backend estiver incompleta.

**Implementação integrada pela PR #22:**
- O gateway reduz o payload de `profile.update` aos campos editáveis permitidos e deriva o token de sessão do cookie; `service.listMine` encaminha somente esse token.
- O Apps Script usa `appRequireProfessionalSession_` para exigir o papel confiável `professional` nas operações de perfil e serviços. O papel recebido do navegador não é autoridade; papel diferente é recusado com `ROLE_FORBIDDEN` (HTTP 403).
- A identidade e o perfil são derivados da sessão validada; a propriedade do serviço é conferida no backend.
- A suíte `tests/authorization/` executa o `apps-script/conecta-local/Code.gs` real em um harness Node/VM com dois profissionais, sessões, perfis e serviços fictícios, usando mocks de Sheets/Properties/LockService.
- Os testes cobrem listagem isolada, acesso cruzado, mass assignment, derivação do proprietário na criação, estados não permitidos, sessão inválida, papel não profissional e sanitização do gateway.
- O comando `npm run test:authorization` foi integrado ao workflow de validação.

**Validação automatizada:**
- **17 testes de autorização: 17 PASS, 0 FAIL** (12 Apps Script e 5 gateway).
- A execução final `Validate Home Service #44797635404` concluiu **SUCCESS** no head da PR `54142fca94b71e72b19cee7dbaae2d6467db4dd0`; todos os passos do job passaram, incluindo auditoria bloqueante de dependências de produção, POC-01/02/03/04, autorização, LOO, registro de ocorrências, ESLint e build.
- A PR #22 foi integrada exclusivamente em `dev` pelo merge commit `1bf55488539c5e4874573f77737827c1089504cc`, em 20/11/2026. `main` permaneceu inalterada.

**Validação manual de propriedade — PASS em 20/11/2026:**
- O profissional B criou um serviço fictício; autenticado como A, o responsável tentou executar `service.setStatus` usando o ID do serviço de B.
- A API respondeu HTTP **404**, com `error.code: SERVICE_NOT_FOUND`.
- O registro de B permaneceu `published` na aba `SERVICOS`; a aba `AUDITORIA` não recebeu evento de sucesso indevido.
- Esse ensaio confirmou o isolamento de propriedade que já existia em `dev`, antes do merge da PR #22.

**Validação manual de papel no Apps Script real — PASS em 20/11/2026:**
- O arquivo `apps-script/conecta-local/Code.gs` do projeto Apps Script real foi sincronizado com a versão de `dev` e uma nova versão foi publicada na implantação Web App existente.
- Com a conta fictícia A temporariamente marcada como `admin`, foi enviada uma operação `service.setStatus` para um serviço pertencente à própria A.
- A API respondeu HTTP **403**, com `error.code: ROLE_FORBIDDEN`.
- A aba `SESSOES` manteve o valor de `ultima_atividade_em`; a aba `SERVICOS` permaneceu intacta, com o serviço `published`; a aba `AUDITORIA` não recebeu sucesso indevido.
- A tentativa anterior, executada antes de atualizar o Apps Script, havia retornado HTTP 200; foi preservada como evidência de que o Web App publicado estava desatualizado. Após a sincronização e publicação, o mesmo cenário foi recusado corretamente.
- O aviso adicional `Fetch failed loading` do Console não alterou a interpretação do resultado: a resposta HTTP efetivamente recebida foi 403 com `ROLE_FORBIDDEN`.

**Limites técnicos:** o harness automatizado simula Sheets, Locks e Properties; não comprova quotas, falhas reais dos serviços Google ou atomicidade entre gravação de negócio e auditoria. As gravações de negócio e auditoria continuam separadas. Avaliar atomicidade/compensação na POC-05 somente se houver justificativa acadêmica.

**Encerramento operacional:** antes de retomar o uso normal da conta fictícia A, confirmar que seu campo `papel` voltou a `professional`. Não deixar a conta de demonstração com papel temporário `admin`.

**Critério de conclusão atendido:** identidade, propriedade, estado e papel são impostos no Apps Script; as tentativas indevidas foram recusadas sem alterar recursos alheios ou registrar sucesso falso; os cenários manuais foram conferidos no Preview com dados fictícios.

**Limite:** manter uma bateria pequena e focada. Não transformar esta etapa em pentest amplo, scanner automático ou teste de carga.

### Etapa 2 — Completar o ciclo de vida dos serviços

**Status: concluída em 20/11/2026. PR #23 integrada exclusivamente em `dev`.**

**Implementação integrada:**
- `service.update` permite editar nome, categoria e descrição, com identidade e proprietário derivados da sessão validada.
- `service.remove` realiza remoção lógica, preserva a linha em `SERVICOS` e registra a ação em `AUDITORIA`.
- O backend rejeita mass assignment e impede que o profissional edite/remova serviços de outra pessoa ou altere estados administrativos (`suspended` e `removed`).
- A edição preserva estado, proprietário, preço e timestamps relevantes. A interface apresenta os estados e confirma a remoção.

**Validação automatizada — PASS:**
- A PR #23 foi integrada pelo merge commit `0f9e887347444deb1307e65d127d969e595c81ed`.
- A execução [Validate Home Service #44812170065](https://github.com/kleber-goncalves/home-service/actions/runs/44812170065) concluiu **SUCCESS** no merge commit: POC-01 12/12, POC-02 20/20, POC-03 26/26, POC-04 33/33, autorização/ownership 22/22 e LOO 7/7; auditoria de dependências de produção, registro de ocorrências, ESLint e build também passaram.

**Validação integrada no ambiente real — PASS em 20/11/2026:**
- O responsável confirmou a sincronização do `apps-script/conecta-local/Code.gs` e a publicação de uma nova versão na implantação Web App existente.
- O Preview de `dev` ficou `READY` no deployment `dpl_FT5dFsPzB6B1phwGywur4ewjRkZS`, commit `e6d231ce5cc978338bce23010d2003c7f551fd7c`.
- O alias fixo usado nos testes foi `https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app/`; sua resolução para o deployment atualizado foi conferida.
- O responsável informou que executou os testes manuais da etapa e que todos passaram. Esse registro reflete a confirmação do responsável, sem inventar logs ou resultados individuais não compartilhados.

**Limites:** os testes automatizados simulam Sheets/Properties/LockService; não comprovam quotas ou falhas reais dos serviços Google. A gravação de negócio e a auditoria continuam separadas; não afirmar atomicidade. Manter dados fictícios e backend restrito ao Preview.

**Critério de conclusão atendido:** edição e remoção lógica estão integradas em `dev`, com autorização e propriedade impostas no backend; os testes automatizados passaram e o responsável confirmou a validação manual no Preview atualizado.


### Etapa 3 — Melhorar a descoberta por cidade e categoria

**Status: concluída em 20/11/2026 — validação funcional principal e limpeza dos dados temporários confirmadas.**

**Objetivo:** aproximar o catálogo da proposta regional sem construir busca sofisticada.

**Implementado e integrado pela PR #25 em `dev`:**
- Usa `CATEGORIAS` e `CIDADES` do catálogo ativo como fonte dos filtros e sugestões da homepage.
- Implementa a relação `SERVICO_CIDADES` para permitir um ou mais municípios por serviço.
- Valida no Apps Script IDs existentes, cidades ativas, ausência de duplicidade e pelo menos um município por serviço.
- Preserva vínculos antigos com cidade posteriormente inativada durante a edição, sem permitir novas associações inativas.
- Mantém fallback para serviços legados sem linhas em `SERVICO_CIDADES`, usando a cidade principal do profissional até a primeira edição do serviço.
- Retorna a cobertura por serviço em `service.listMine` e `public.services`; a busca textual da homepage considera todos os municípios vinculados e oferece sugestões de cidades ativas.
- Alinha os rótulos dos cartões/categorias ilustrativas à taxonomia inicial cadastrada em `CATEGORIAS`.
- Mantém serviços publicados visíveis quando sua categoria é inativada posteriormente, conforme a regra da especificação.
- Acrescenta seleção de múltiplos municípios ao formulário de criação/edição do profissional.

**Validação automatizada — PASS:**
- Merge commit `5003604a51def9bdf58df9845d36c2ec75a4452e`; workflow [#44820409487](https://github.com/kleber-goncalves/home-service/actions/runs/44820409487) concluiu SUCCESS.
- Auditoria bloqueante de dependências de produção, POC-01/02/03/04, autorização/ownership, LOO, registro de ocorrências, ESLint e build passaram.
- Preview fixo de `dev` está READY no deployment `dpl_4n5E7JLaUQPHezVk8ymGRXZSS7Bx`.

**Validação manual no Preview de `dev` — PASS, confirmada pelo responsável em 20/11/2026:**
- O responsável confirmou a sincronização do `apps-script/conecta-local/Code.gs` no projeto Apps Script e a publicação de uma nova versão na implantação Web App existente.
- Ao editar um serviço que já existia e salvar a cidade selecionada, a aba `SERVICO_CIDADES` foi atualizada imediatamente.
- Na homepage pública, o serviço foi encontrado pela cidade já cadastrada na planilha.
- Para testar a relação múltipla, foi adicionada uma segunda cidade temporária; o mesmo serviço foi associado às duas cidades e salvo.
- O responsável confirmou que a homepage encontrou o mesmo serviço nas duas cidades e que os testes executados passaram.
- O ensaio confirma a persistência do vínculo múltiplo no Sheets e a descoberta pública por cada cidade. A confirmação é baseada no relato do responsável; não foram fornecidos logs individuais ou capturas de cada operação.

**Cenários adicionais não comprovados nesta rodada:**
- Recusa de IDs inexistentes, cidades inativas e cidades duplicadas por chamadas inválidas.
- Preservação de vínculos legados sem associação explícita e comportamento após inativação de categoria.
- Esses cenários continuam cobertos ou parcialmente cobertos pela suíte automatizada conforme os testes existentes, mas não devem ser descritos como validação manual real.

**Limpeza dos dados de demonstração — concluída:**
- O responsável confirmou que a segunda cidade, criada apenas para o teste, e seus vínculos correspondentes foram removidos de `CIDADES` e `SERVICO_CIDADES`.
- A planilha voltou a manter somente a cidade original; o serviço permanente e os demais registros foram preservados.

**Limites:** não criar infraestrutura de busca separada; não implementar geolocalização. Vínculos em Sheets e auditoria não são atômicos. Usar somente dados fictícios e não configurar backend em Production.

**Critério de conclusão atendido:** Apps Script sincronizado/publicado, serviço associado a duas cidades, persistência conferida na aba `SERVICO_CIDADES`, busca pública aprovada nas duas localidades e dados temporários removidos após o ensaio.

### Etapa 4 — Imagens no Google Drive

**Status: concluída no escopo do MVP para imagens de serviços.** A implementação foi integrada exclusivamente em `dev` pela PR #26, merge commit `6dab42ba291008a20a490542dcaf28c6c439c7d2`. A CI pós-merge #44850407547 concluiu **SUCCESS**, e a sincronização do contexto técnico #44850407640 também passou.

**Arquitetura entregue:**
- Upload retomável em blocos binários de 1 MiB por rota Vercel dedicada, encaminhado ao Apps Script por HMAC.
- Sessão de Drive e URI retomável mantidas no Apps Script; navegador não recebe credenciais OAuth nem URI de upload do Drive.
- Arquivos guardados individualmente na pasta raiz privada; metadados e histórico na aba `IMAGENS`; eventos operacionais registrados em `AUDITORIA`.
- Limite de 5 imagens ativas por serviço, JPG/JPEG/PNG/WebP, até 5.000.000 bytes por arquivo.
- Gerenciador na área profissional com prévias locais, progresso, cancelamento, recuperação e remoção lógica.
- Permissão por arquivo sincronizada com o estado do serviço: publicado e conta ativa permitem visualização por link; pausado, removido ou inelegível ficam restritos.

**Validação manual real — Preview + Apps Script + Sheets + Drive:**
- [x] Dois uploads reais concluídos para o mesmo serviço.
- [x] Remoção lógica refletida em **Meus serviços**, status `removed` em `IMAGENS`, evento em `AUDITORIA` e acesso geral `Restrito` no Drive.
- [x] Limite de cinco imagens ativas confirmado; após uma imagem removida, quatro novas puderam ser adicionadas e a sexta imagem ativa foi bloqueada.
- [x] Serviço publicado: imagens acessíveis por link.
- [x] Serviço pausado: imagens restritas.
- [x] Serviço republicado: acesso por link restaurado.
- [x] Resultados conferidos pelo responsável na aplicação, no Google Sheets e no Google Drive.

**Validação automatizada:** PR #26 com CI aprovada antes do merge e CI pós-merge #44850407547 **SUCCESS**, incluindo auditoria bloqueante de dependências, POC-01/02/03/04, autorização/propriedade, testes do gateway e cliente de upload, LOO, registro de ocorrências, ESLint e build de produção.

**Limites e itens fora desta etapa:** foto de perfil, galeria avançada, ordenação por arrastar e soltar, compressão/otimização de imagens, painel administrativo de mídia e operação em Production. Não declarar como testes manuais realizados nesta rodada repetição individual de todos os formatos, interrupção deliberada de blocos ou falha forçada entre Drive e Sheets.

**Ambiente:** a funcionalidade está em `dev` e no Preview de desenvolvimento. `main` e Production permanecem inalteradas e sem backend habilitado. A Etapa 5 foi concluída funcionalmente pelas PRs #28 e #29; a próxima etapa do roadmap é a Etapa 6 — redesign visual/UX. Qualquer promoção futura para Production exige decisão e revisão específicas.

### Etapa 5 — Catálogo público, navegação e apresentação das imagens

**Status: entrega funcional integrada em `dev` pelas PRs #28 e #29; validação integrada da entrega de imagens concluída em 21/11/2026.** O plano detalhado está em `docs/PLANO_CATALOGO_PUBLICO_E_NAVEGACAO.md`.

**Implementado:**
- Homepage reorganizada com pesquisa, categorias em destaque, serviços cadastrados e exemplos ilustrativos em área separada.
- Rotas públicas `/`, `/servicos`, `/categorias` e `/servicos/:serviceId`, com suporte a URLs diretas e navegação SPA.
- Pesquisa textual e filtros locais por categoria e cidade, com estado e parâmetros refletidos na URL.
- Cartões reutilizáveis, imagem principal e indicador de fotos adicionais.
- Detalhes do serviço com descrição, profissional, cidades atendidas, contato público e galeria de até cinco imagens.
- Entrega de imagens pelo gateway same-origin `/api/public-images`, com validação de elegibilidade no Apps Script e OAuth restrito ao servidor.
- Preservação dos exemplos ilustrativos fora do catálogo, da busca, dos filtros e da contagem de serviços cadastrados.

**Integração e validação registradas:**
- PR #28 integrada em `dev` pelo merge commit `22ba720c6fdd22f3bef4cc5b29963279c5119ff9`.
- PR #29 integrada em `dev` pelo merge commit `77e88be6d9d20151a178f7fe31ea76509299becb`.
- CI pós-merge [Validate Home Service #44937440114](https://github.com/kleber-goncalves/home-service/actions/runs/44937440114) e AI Context [#44937440122](https://github.com/kleber-goncalves/home-service/actions/runs/44937440122) concluíram SUCCESS.
- O responsável sincronizou o Apps Script e publicou nova versão na implantação Web App existente.
- No Preview de `dev`, cinco imagens do serviço fictício `Aparar grama` retornaram HTTP 200 com conteúdo e MIME de imagem; a pausa bloqueou as cinco com HTTP 404; a republicação restaurou HTTP 200; a remoção de uma imagem bloqueou o ID removido e preservou as outras quatro.
- Esta evidência comprova a integração do gateway de imagens, mas não registra por si só a homologação manual completa de todos os filtros, rotas, tamanhos de tela e fluxos de conta.

**Ponto de melhoria identificado pelo responsável em 24/11/2026:** embora a estrutura funcional esteja integrada, o design visual atual foi considerado genérico. A próxima etapa será o redesign visual/UX, com diagnóstico e definição de uma identidade própria, preservando o comportamento existente. Ver `docs/PLANO_REDESIGN_INTERFACE.md`.

**Limites:** manter os filtros no cliente sobre os dados públicos existentes; não criar mecanismo externo de busca, geolocalização ou infraestrutura adicional sem necessidade demonstrada. Não inventar avaliações, estrelas, reputação, preço ou disponibilidade. Não alterar `main`, habilitar backend em Production ou ampliar o escopo dos segredos Vercel.

### Etapa 6 — Redesign visual e experiência da interface

**Status: próxima etapa aprovada; ainda não iniciada.** O responsável identificou que a interface está funcional, porém visualmente genérica. O objetivo é dar ao Conecta Local uma identidade visual reconhecível, melhorar hierarquia, composição e consistência e elevar a qualidade percebida sem adicionar funcionalidades desnecessárias.

**Plano de trabalho:** `docs/PLANO_REDESIGN_INTERFACE.md`.

**Escopo previsto:**
- Auditar visualmente as páginas públicas e a área autenticada em desktop e mobile.
- Identificar padrões genéricos, inconsistências, excesso de componentes/cards e problemas de hierarquia.
- Preparar propostas de direção visual com referências e composição próprias; nenhuma paleta, fonte ou estilo está aprovado neste momento.
- Definir tokens de cor, tipografia, espaçamento, largura, bordas, sombras, estados e movimento.
- Reestruturar progressivamente cabeçalho, hero, busca, categorias, cartões, galeria, rodapé, autenticação, perfil e gestão de serviços.
- Preservar rotas, contratos de API, sessão, autorizações, upload, imagens e os fluxos já aprovados.
- Validar responsividade, acessibilidade, estados de interface e regressões funcionais.

**Critério de sucesso:** a aplicação deixa de parecer um template genérico e passa a ter identidade visual consistente em todas as jornadas principais, sem perda de funcionalidades, acessibilidade ou responsividade.

**Limites:** JavaScript/JSX, React, Vite e Tailwind existentes; evitar dependências novas e refatorações estruturais sem motivo. Não implementar um redesign baseado em tendências aleatórias nem copiar integralmente outra plataforma. Trabalhar em branch derivada de `dev`, PR direcionada a `dev`, dados fictícios e Preview; preservar `main`/Production.

### Etapa 7 — Pesquisa acadêmica com a comunidade

**Status: instrumentos preparados; revisão do professor/orientador, coleta e análise ainda pendentes.** Esta etapa será retomada depois do redesign da interface.

**Instrumentos disponíveis:**
- `PESQUISA_COMUNIDADE.md` — questionários preliminares para moradores e profissionais.
- `docs/GUIA_APLICACAO_PESQUISA_COMUNIDADE.md` — orientações de preparação, aplicação e análise.
- `docs/ROTEIRO_PESQUISA_EXPLORATORIA.md` — roteiro e perguntas da investigação.

**Próximos passos:**
- Confirmar com o professor/orientador se a atividade exige autorização, termo ou procedimento institucional antes de abordar participantes.
- Aplicar somente após essa orientação, com participação voluntária e sem coletar nomes, e-mails, telefones, endereços ou outros dados identificáveis.
- Buscar, se viável e aprovado, 20 a 30 respostas de moradores e 10 a 15 de profissionais; a amostra será exploratória e por conveniência, não representativa do município.
- Analisar respostas reais, calcular percentuais por pergunta e registrar também opiniões contrárias ou pouco favoráveis à proposta.
- Atualizar o relatório acadêmico com o método, período, número de respostas válidas, limitações e resultados efetivamente obtidos.

**Regra de integridade acadêmica:** não inventar participantes, respostas, percentuais ou conclusões.

## 4. Itens que devem ficar para depois

Os itens abaixo não são necessários para demonstrar o núcleo atual e podem consumir tempo desproporcional:

- Painel administrativo completo e gestão de papéis.
- Denúncias, fila de moderação e governança operacional.
- Envio real de e-mail e recuperação de senha. A alteração de e-mail já existe em `dev` em modo demonstrativo, sem envio real de mensagens.
- Analytics, dashboards, notificações e relatórios avançados.
- Pagamentos, contratação, agendamento, chat, avaliações e favoritos.
- Migração para PostgreSQL, Firebase, Supabase ou outra infraestrutura sem requisito concreto.
- Docker, Kubernetes, microsserviços, filas ou observabilidade empresarial.

Reavaliar somente quando houver exigência acadêmica explícita ou uma necessidade funcional real.

## 5. Decisões de segurança que permanecem vigentes

- Não usar contas, senhas, contatos ou dados pessoais reais.
- Não habilitar backend em Production.
- Não adicionar variáveis `POC04_*` nem reativar `/api/poc04/session`.
- A POC-04 tem dois bloqueios de hardening documentados: limites de corpo/resposta aplicados após leitura integral e ausência de rate limiting/limite de emissão. Eles não precisam ser resolvidos enquanto a POC permanecer desativada e fora do fluxo principal.
- Não interpretar os testes do protótipo como auditoria independente, certificação ou autorização para uso real.
- Executar somente validações proporcionais à alteração: testar o fluxo afetado e rodar a suíte automatizada pertinente antes de integrar mudanças.

## 6. Ordem prática recomendada

1. **Agora:** iniciar a Etapa 6 — redesign visual e experiência da interface — seguindo `docs/PLANO_REDESIGN_INTERFACE.md`. Começar pelo diagnóstico visual e pela exploração de direção de arte; não alterar código em larga escala antes de definir a linguagem visual.
2. **Depois:** retomar a Etapa 7 — pesquisa comunitária — somente após a orientação do professor do curso Técnico em Informática e confirmação do procedimento aplicável. A coleta permanece pendente.
3. **Na preparação da entrega:** revisar acessibilidade, responsividade, roteiro de demonstração e relatório acadêmico, registrando apenas funcionalidades e resultados efetivamente concluídos.

A Etapa 5 (catálogo público) está integrada pelas PRs #28 e #29; não reiniciá-la como nova funcionalidade. Seus critérios de navegação e apresentação ainda podem ser reavaliados durante o redesign. Trabalhar uma etapa por branch/PR, sempre partindo de `dev`. Integrar somente depois das verificações pertinentes. Não alterar `main` sem uma decisão explícita de publicação.

## 7. Critério de sucesso do projeto de estudos

O Conecta Local terá cumprido bem seu objetivo acadêmico quando for possível explicar e demonstrar, com evidências:

- Como o frontend conversa com um gateway server-side e com o Apps Script.
- Como autenticação, sessão, autorização e propriedade são aplicadas no backend.
- Como os dados são modelados e persistidos no Sheets.
- Como estados de domínio e auditoria evitam inconsistências.
- Como decisões de escopo, riscos e limitações são documentados.

**Não é necessário construir todas as funcionalidades de um marketplace comercial para demonstrar domínio de desenvolvimento fullstack e fundamentos de segurança.**
