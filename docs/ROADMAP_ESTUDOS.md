# Roteiro de evolução acadêmica — Conecta Local

> **Atualizado em:** 20/11/2026  
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

Em 20/11/2026, o responsável confirmou que repetiu o fluxo funcional no Preview atualizado de `dev` e que a demonstração está funcionando. A POC-04 foi integrada ao repositório, mas continua desabilitada e independente do login principal.

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

**Código integrado em `dev` pela PR #25 em 20/11/2026; validação manual real pendente.**

**Objetivo:** aproximar o catálogo da proposta regional sem construir busca sofisticada.

**Implementado e integrado:**
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

**Pendente para concluir a etapa:**
- Sincronizar `apps-script/conecta-local/Code.gs` no projeto Google Apps Script real.
- Salvar e publicar nova versão na implantação Web App existente, preservando URL/ID, Script Properties, permissões e identidade de execução.
- No Preview fixo atualizado de `dev`, validar criação/edição com duas cidades, busca por cada município, recusa de cidade inválida/inativa, compatibilidade dos serviços antigos e visibilidade quando uma categoria for inativada.
- Usar somente dados fictícios. Não configurar backend em Production.

**Limites:** não criar infraestrutura de busca separada; não implementar geolocalização. Vínculos em Sheets e auditoria não são atômicos.

**Critério de conclusão:** além da CI e do Preview, a integração Apps Script/Sheets e os cenários manuais de cobertura regional devem ser confirmados.

### Etapa 4 — Imagens no Google Drive

**Objetivo:** permitir que o profissional associe imagens ao perfil ou aos serviços.

**Escopo mínimo:**
- Upload de JPG, PNG ou WebP com limite definido na especificação.
- Validar tamanho, tipo real do conteúdo e propriedade no backend.
- Guardar metadados e ID do arquivo no Sheets; manter a pasta raiz privada.
- Tornar público somente o arquivo elegível a um serviço publicado e conta ativa.
- Revogar acesso público ao pausar/remover/suspender, verificando o resultado.
- Tratar falhas parciais entre Sheets e Drive; nunca exibir sucesso antes de confirmar as etapas.

**Critério de conclusão:** upload, exibição, pausa e remoção funcionam com dados fictícios e as permissões do Drive seguem os estados do serviço.

**Prioridade:** média/baixa. Tem grande valor visual, mas é mais complexa por envolver um segundo serviço externo e permissões. Fazer somente quando o fluxo de serviços estiver estável e houver tempo.

### Etapa 5 — Pesquisa acadêmica e acabamento da apresentação

**Objetivo:** fortalecer a justificativa e a qualidade da entrega acadêmica.

Escopo:
- Registrar uma pequena pesquisa com profissionais e moradores, se viável e autorizada, sem coletar dados pessoais desnecessários.
- Apresentar claramente o que é dado real, dado fictício e hipótese do projeto.
- Revisar acessibilidade básica, responsividade, mensagens de erro, estados vazios e fluxo de demonstração.
- Atualizar capturas, roteiro de apresentação e relatório acadêmico conforme o que está realmente implementado.

**Prioridade:** alta para a entrega acadêmica, sem criar novas funcionalidades de backend.

## 4. Itens que devem ficar para depois

Os itens abaixo não são necessários para demonstrar o núcleo atual e podem consumir tempo desproporcional:

- Painel administrativo completo e gestão de papéis.
- Denúncias, fila de moderação e governança operacional.
- Envio real de e-mail, recuperação de senha e alteração de e-mail.
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

1. **Agora:** concluir a Etapa 3 — sincronizar/publicar o Apps Script real e executar os testes manuais no Preview fixo de `dev`.
2. **Depois, conforme necessidade:** Etapa 4 — imagens no Google Drive, somente se trouxer ganho real para a apresentação.
3. **Em paralelo à preparação da entrega:** Etapa 5 — pesquisa acadêmica e acabamento.

Trabalhar uma etapa por branch/PR, sempre partindo de `dev`. Integrar somente depois das verificações pertinentes. Não alterar `main` sem uma decisão explícita de publicação.

## 7. Critério de sucesso do projeto de estudos

O Conecta Local terá cumprido bem seu objetivo acadêmico quando for possível explicar e demonstrar, com evidências:

- Como o frontend conversa com um gateway server-side e com o Apps Script.
- Como autenticação, sessão, autorização e propriedade são aplicadas no backend.
- Como os dados são modelados e persistidos no Sheets.
- Como estados de domínio e auditoria evitam inconsistências.
- Como decisões de escopo, riscos e limitações são documentados.

**Não é necessário construir todas as funcionalidades de um marketplace comercial para demonstrar domínio de desenvolvimento fullstack e fundamentos de segurança.**
