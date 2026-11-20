# Roteiro de evolução acadêmica — Conecta Local

> **Atualizado em:** 20/11/2026  
> **Finalidade:** organizar as próximas etapas do projeto de estudos, priorizando aprendizado técnico e conclusão coerente da demonstração. Este roteiro não é um plano de operação comercial nem uma lista de requisitos obrigatórios para Production.

## 1. Ponto de partida

O núcleo demonstrativo já está implementado na branch `dev`:

- Homepage pública e catálogo demonstrativo.
- Cadastro com confirmação de código demonstrativo.
- Login e sessão com cookie protegido.
- Perfil profissional.
- Criação, pausa e publicação de serviços.
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

**Em andamento — cobertura automatizada inicial adicionada na branch `feat/authorization-integrity`.**

**Por que vem primeiro:** é o aprendizado de maior valor para um sistema com contas e dados privados. Uma interface pode funcionar perfeitamente para o próprio usuário e ainda permitir acesso indevido a dados de outra conta se a validação do backend estiver incompleta.

**Escopo enxuto:**
- Usar duas contas inteiramente fictícias, profissional A e profissional B.
- Confirmar que A só consulta e altera os próprios dados e serviços.
- Verificar que trocar IDs de serviço/proprietário no payload não permite assumir propriedade.
- Verificar que o navegador não consegue publicar, reativar, suspender ou remover um serviço ignorando as regras do Apps Script.
- Confirmar que operações recusadas não alteram dados e não registram sucesso indevido.
- Conferir que as mudanças relevantes deixam o evento esperado na aba `AUDITORIA`.

**Cobertura automatizada já adicionada na branch de trabalho:**
- O teste executa o `apps-script/conecta-local/Code.gs` real em um harness Node/VM, com duas contas, duas sessões, dois perfis e dois serviços fictícios em uma implementação simulada de Sheets/Properties/LockService.
- Verifica que cada sessão consulta somente os próprios serviços.
- Verifica que A não consegue pausar o serviço de B: a operação recebe `SERVICE_NOT_FOUND`, o estado de B permanece inalterado e não é gravado evento de sucesso falso.
- Verifica que campos extras como `id_usuario`, `id_profissional`, `papel` e `status` não permitem trocar a identidade, assumir perfil alheio ou elevar privilégio.
- Verifica que a criação de serviço deriva o proprietário do perfil ligado à sessão e que estados administrativos são recusados.
- Verifica que somente uma conta cujo papel confiável seja `professional` consegue atualizar perfil e executar operações de serviço; papel diferente é recusado com `ROLE_FORBIDDEN` sem renovar atividade nem alterar dados.
- Verifica no gateway que os payloads de perfil/listagem/status são reduzidos aos campos esperados e que `session.create` não está na allowlist pública do navegador.

**Ainda pendente para fechar a etapa:**
- Repetir, no Preview real de `dev`, uma tentativa cruzada com duas contas fictícias distintas e confirmar diretamente na planilha que o serviço do segundo profissional permaneceu intacto.
- Conferir no Sheets os eventos de auditoria das operações legítimas e a ausência de evento de sucesso para a tentativa recusada.
- Concluir e registrar o resultado da CI da PR antes de integrar.

**Limites técnicos:** o harness executa o código real do Apps Script, mas simula Sheets, Locks e Properties. Não comprova comportamento de quota, falhas reais dos serviços Google ou atomicidade entre gravação de negócio e auditoria. As gravações de negócio e auditoria ainda são chamadas separadas; atomicidade/compensação fica para a etapa de consistência/POC-05, caso haja justificativa acadêmica.

**Critério de conclusão:** as regras de identidade, propriedade, estado e permissão são aplicadas no Apps Script; as tentativas cruzadas são recusadas sem alterar o recurso alheio ou registrar sucesso indevido; e o cenário equivalente é conferido no Preview com dados fictícios.

**Limite:** manter uma bateria pequena e focada. Não transformar esta etapa em pentest amplo, scanner automático ou teste de carga.

### Etapa 2 — Completar o ciclo de vida dos serviços

**Objetivo:** transformar o CRUD atual em uma jornada mais completa para o profissional e praticar regras de domínio.

**Escopo:**
- Editar os dados de um serviço próprio.
- Remover logicamente um serviço, sem apagar histórico de auditoria.
- Preservar as regras de estado: rascunho, publicado, pausado e removido.
- Validar no backend campos, limites, propriedade e transições.
- Registrar criação, edição, pausa, publicação e remoção na auditoria.
- Atualizar a interface para refletir o estado retornado pelo backend, sem declarar sucesso antes da confirmação.

**Critério de conclusão:** o profissional consegue manter seus próprios serviços do início ao fim; outro profissional não consegue alterá-los; estados e auditoria permanecem coerentes.

**Prioridade:** alta. Entrega valor funcional e ensina CRUD, validação em camadas, autorização, modelagem de estado e persistência.

### Etapa 3 — Melhorar a descoberta por cidade e categoria

**Objetivo:** aproximar o catálogo da proposta regional sem construir busca sofisticada.

**Escopo sugerido:**
- Usar as categorias e cidades já cadastradas como dados de referência.
- Se a demonstração realmente precisar de atendimento em várias cidades por serviço, implementar a relação `SERVICO_CIDADES` com validação de IDs e duplicidade.
- Definir se os filtros serão aplicados no backend ou no frontend conforme volume e simplicidade; não criar infraestrutura de busca separada.
- Exibir estados vazios e combinações de filtros de maneira clara.

**Critério de conclusão:** um serviço só aparece nas localidades e categorias permitidas, e os filtros retornam resultados coerentes.

**Prioridade:** média. É valiosa para modelagem relacional e consulta de dados, mas não precisa anteceder a conclusão do CRUD.

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

1. **Agora:** Etapa 1 — autorização e integridade.
2. **Em seguida:** Etapa 2 — editar e remover serviços.
3. **Depois, conforme necessidade:** Etapa 3 — localidades/categorias.
4. **Somente se agregar valor à apresentação:** Etapa 4 — imagens no Drive.
5. **Em paralelo à preparação da entrega:** Etapa 5 — pesquisa acadêmica e acabamento.

Trabalhar uma etapa por branch/PR, sempre partindo de `dev`. Integrar somente depois das verificações pertinentes. Não alterar `main` sem uma decisão explícita de publicação.

## 7. Critério de sucesso do projeto de estudos

O Conecta Local terá cumprido bem seu objetivo acadêmico quando for possível explicar e demonstrar, com evidências:

- Como o frontend conversa com um gateway server-side e com o Apps Script.
- Como autenticação, sessão, autorização e propriedade são aplicadas no backend.
- Como os dados são modelados e persistidos no Sheets.
- Como estados de domínio e auditoria evitam inconsistências.
- Como decisões de escopo, riscos e limitações são documentados.

**Não é necessário construir todas as funcionalidades de um marketplace comercial para demonstrar domínio de desenvolvimento fullstack e fundamentos de segurança.**
