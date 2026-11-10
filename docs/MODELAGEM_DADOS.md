# Modelagem lógica e física de dados — Conecta Local

> **Versão:** 1.0  
> **Data:** 2026-11-10  
> **Status:** modelagem lógica e esquema físico aprovados conceitualmente; validações técnicas e implementação pendentes.  
> **Escopo:** inventário lógico, esquema físico das 12 abas, campos, relacionamentos, integridade, estados e estratégia de persistência do MVP acadêmico.  
> **Importante:** este documento descreve o modelo aprovado. Não significa que as abas, o Apps Script, as planilhas ou as integrações com Drive já existam.

## 1. Objetivo e limites

Este documento consolida a modelagem lógica derivada da [Especificação funcional do MVP](./ESPECIFICACAO_MVP.md). O modelo contempla **12 entidades e 102 campos**, organizados em três grupos:

- Acesso e autenticação: 5 entidades.
- Catálogo e serviços: 5 entidades.
- Governança: 2 entidades.

A decisão aprovada é utilizar **um único arquivo Google Sheets com 12 abas**, uma para cada entidade. O Google Drive armazenará os arquivos de imagem; seus metadados e relacionamentos serão mantidos na aba `IMAGENS`.

O projeto é uma demonstração acadêmica com dados sintéticos. Não deve receber credenciais, cadastros ou dados pessoais reais. Nenhuma entidade ou aba descrita aqui foi criada por este documento.

### 1.1. Convenções de representação

- UUIDs serão armazenados como texto, gerados pelo backend. O número da linha da planilha nunca será identificador de negócio.
- Datas e horários serão gerados no backend e armazenados em formato consistente, preferencialmente ISO 8601 em UTC. A interface poderá apresentar o horário local.
- Tipos descritos como `UUID`, `FK`, `ENUM`, `DECIMAL`, `INTEGER` e `DATETIME` são tipos lógicos. A representação concreta nas células do Sheets deverá ser padronizada na implementação.
- Chaves estrangeiras, unicidade composta, validação condicional e restrições de estado serão verificadas pelo Apps Script. O Sheets não as impõe automaticamente como um banco relacional.
- Campos privados nunca poderão ser retornados pela API pública.
- Exclusões físicas serão evitadas quando houver histórico ou dependências. Os estados e a auditoria preservarão o histórico da demonstração.
- O backend é a fronteira de confiança. Validação visual no React não substitui autorização, validação de entrada ou integridade no Apps Script.

## 2. Inventário das entidades

| Grupo | Entidade | Responsabilidade | Campos |
|---|---|---|---:|
| Acesso | `USUARIOS` | Conta, identidade de acesso, papel e estado | 11 |
| Acesso | `PROFISSIONAIS` | Dados do perfil profissional | 11 |
| Acesso | `SESSOES` | Sessões autenticadas | 7 |
| Acesso | `CODIGOS_VERIFICACAO` | Confirmação, recuperação e mudança de e-mail | 10 |
| Acesso | `CONTROLE_AUTENTICACAO` | Tentativas e bloqueio temporário por identificador | 6 |
| Catálogo | `SERVICOS` | Serviços oferecidos pelos profissionais | 12 |
| Catálogo | `CATEGORIAS` | Categorias administráveis | 5 |
| Catálogo | `CIDADES` | Municípios disponíveis na plataforma | 7 |
| Catálogo | `SERVICO_CIDADES` | Associação N:N entre serviço e cidade | 4 |
| Catálogo | `IMAGENS` | Metadados de imagens guardadas no Drive | 10 |
| Governança | `DENUNCIAS` | Denúncias de perfis ou serviços | 10 |
| Governança | `AUDITORIA` | Histórico append-only de eventos relevantes | 9 |
| | **Total** | **12 entidades** | **102** |

## 3. Entidades e campos

### 3.1. USUARIOS

Responsável por autenticação, papel e estado da conta. O e-mail é privado e não será exibido em perfis públicos.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_usuario` | UUID (PK) | Sim | Gerado pelo backend, único e imutável. |
| `email` | Texto até 254 | Sim | Normalizado com trim e minúsculas; único após normalização. |
| `senha_hash` | Texto | Sim | Nunca armazenar senha em texto puro; algoritmo depende de prova de conceito aprovada. |
| `senha_salt` | Texto | Sim | Salt individual; formato e tamanho definidos na prova de conceito criptográfica. |
| `senha_algoritmo` | Texto | Sim | Identificador/versionamento e parâmetros do KDF efetivamente utilizado; não presumir algoritmo antes da prova de conceito. |
| `papel` | ENUM | Sim | `professional` ou `admin`; nunca escolhido livremente pelo formulário público. |
| `status` | ENUM | Sim | `pending_activation`, `active`, `suspended`, `closed`. |
| `email_verificado_em` | DATETIME | Não | Nulo até a confirmação válida do endereço. |
| `criado_em` | DATETIME | Sim | Gerado pelo backend e imutável. |
| `atualizado_em` | DATETIME | Sim | Atualizado quando dados da conta mudarem efetivamente. |
| `ultimo_login_em` | DATETIME | Não | Nulo até o primeiro login bem-sucedido. |

**Regras:** e-mail único após normalização; papel administrativo concedido somente por procedimento controlado; conta profissional só pode ficar ativa com um perfil profissional válido; contas administrativas não exigem perfil. Senha, hash, salt e parâmetros nunca entram em logs ou respostas ao navegador.

**Bloqueio técnico:** a implementação de senha depende de prova de conceito de um KDF apropriado, com salt individual, parâmetros versionados, comparação segura e desempenho medido. SHA-256 ou HMAC isolado não é substituto de KDF de senha.

### 3.2. PROFISSIONAIS

Armazena o perfil associado a uma conta profissional. Não duplica o estado da conta: a visibilidade depende de `USUARIOS.status`.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_profissional` | UUID (PK) | Sim | Gerado pelo backend, único e imutável. |
| `id_usuario` | UUID (FK) | Sim | Referencia `USUARIOS.id_usuario`; único, garantindo no máximo um perfil por usuário. |
| `nome_completo` | Texto 2–120 | Sim | Dado privado; não exibir na página pública. |
| `nome_publico` | Texto 2–80 | Sim | Nome apresentado publicamente. |
| `apresentacao` | Texto até 500 | Sim | Texto simples, sem executar ou confiar em HTML fornecido. |
| `id_cidade_principal` | UUID (FK) | Sim | Referencia `CIDADES.id_cidade`; cidade deve estar ativa na criação ou troca. Uma cidade já associada pode ser desativada posteriormente sem apagar o vínculo. |
| `bairros_regioes_atendidos` | Texto até 500 | Não | Texto livre, público; não criar entidade de bairros no MVP. |
| `whatsapp` | Texto normalizado | Sim | Número com código do país e DDD; público. Validar no backend. |
| `telefone_alternativo` | Texto normalizado | Não | Privado por padrão. |
| `criado_em` | DATETIME | Sim | Gerado pelo backend e imutável. |
| `atualizado_em` | DATETIME | Sim | Atualizado em mudanças efetivas. |

**Integridade:** `PROFISSIONAIS.id_usuario` é único. Uma conta `professional` só poderá passar para `active` depois de existir exatamente um perfil válido. Uma conta `admin` não precisa de perfil. Mudanças de papel que deixem serviços ou propriedade em situação inconsistente serão bloqueadas até que exista procedimento seguro e auditado. Suspender/fechar a conta não apaga o perfil.

A fotografia não é armazenada nesta entidade; será registrada em `IMAGENS`.

### 3.3. SESSOES

Mantém sessões autenticadas. O token secreto é entregue ao cliente conforme estratégia ainda sujeita a prova de conceito; apenas seu hash será armazenado.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_sessao` | UUID (PK) | Sim | Gerado pelo backend. |
| `id_usuario` | UUID (FK) | Sim | Referencia `USUARIOS.id_usuario`. |
| `token_hash` | Texto | Sim | Hash do token de alta entropia; único. Nunca armazenar token em claro. |
| `criado_em` | DATETIME | Sim | Data de criação; define o limite absoluto. |
| `ultima_atividade_em` | DATETIME | Sim | Atualizada em atividade autenticada válida. |
| `expira_em` | DATETIME | Sim | Limite absoluto: `criado_em + 8 horas`. |
| `revogada_em` | DATETIME | Não | Nula enquanto não revogada; preenchida no encerramento. |

**Validade efetiva:** a sessão é inválida se revogada, se a conta não estiver ativa, se passar de `expira_em` ou se `ultima_atividade_em + 30 minutos` tiver sido ultrapassado. Login simultâneo em dispositivos é permitido; logout revoga a sessão atual. Alteração/recuperação de senha, suspensão ou encerramento da conta revogam todas as sessões.

**Bloqueio técnico:** transporte e persistência do token no navegador não estão aprovados. Não escolher armazenamento de token ou presumir cookie HttpOnly antes de testar CORS, XSS, redirecionamentos e limitações do Web App Apps Script.

### 3.4. CODIGOS_VERIFICACAO

Mantém metadados de códigos de uso único para confirmação de e-mail, recuperação de senha e mudança de e-mail.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_codigo` | UUID (PK) | Sim | Gerado pelo backend. |
| `id_usuario` | UUID (FK) | Sim | Referencia `USUARIOS.id_usuario`. |
| `finalidade` | ENUM | Sim | `verify_email`, `reset_password`, `change_email`. |
| `email_destino` | Texto até 254 | Sim | E-mail normalizado ao qual o código se destina. |
| `codigo_hmac` | Texto | Sim | HMAC-SHA-256 do código, com chave privada fora da planilha e do frontend. |
| `criado_em` | DATETIME | Sim | Gerado pelo backend; também serve para calcular intervalo de reenvio. |
| `expira_em` | DATETIME | Sim | Validade de 10 minutos a partir da criação. |
| `tentativas` | INTEGER | Sim | De 0 a 5; inicia em 0. |
| `utilizado_em` | DATETIME | Não | Preenchido no primeiro uso válido. |
| `invalidado_em` | DATETIME | Não | Preenchido ao invalidar ou substituir o código. |

**Regras:** código de 6 dígitos; validade de 10 minutos; máximo de 5 tentativas; uso único; intervalo mínimo de 60 segundos para novo envio; novo código invalida o anterior; no máximo um código ativo por combinação de usuário e finalidade. O intervalo é calculado pelo `criado_em` mais recente da mesma finalidade; não há campo separado `ultimo_envio_em`.

Código em claro não será persistido nem registrado em logs. Na demonstração, o backend poderá exibi-lo na interface por canal controlado; esse comportamento deverá ser desativado quando houver envio real por e-mail. Concorrência em tentativas, consumo e reenvio precisa de prova de conceito.

### 3.5. CONTROLE_AUTENTICACAO

Controla falhas de autenticação por identificador de conta sem armazenar o e-mail bruto.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_controle` | UUID (PK) | Sim | Gerado pelo backend. |
| `identificador_hash` | Texto | Sim | HMAC-SHA-256 do e-mail normalizado; único; chave fora da planilha e do frontend. |
| `tentativas_falhas` | INTEGER | Sim | Entre 0 e 5. |
| `inicio_janela_em` | DATETIME | Não | Início da janela de contabilização; nulo antes da primeira falha. |
| `bloqueado_ate` | DATETIME | Não | Nulo quando não bloqueado; preenchido até 15 minutos após atingir o limite. |
| `atualizado_em` | DATETIME | Sim | Atualizado em cada mudança do controle. |

**Regras aprovadas:** cinco falhas dentro de uma janela de 15 minutos acionam bloqueio de 15 minutos. Login bem-sucedido limpa o contador e o bloqueio; ao terminar o bloqueio, a contagem é reiniciada conforme a regra do backend. A operação deve ser atômica sob concorrência. O controle não armazena IP, User-Agent, senha ou token.

**Risco residual:** bloquear por identificador pode permitir que terceiros provoquem indisponibilidade de uma conta. Antes de autenticação, testar mitigação de abuso, mensagens genéricas e controles de frequência adicionais. O contador não pode depender do frontend.

### 3.6. SERVICOS

Armazena os serviços de cada perfil profissional. Um profissional pode cadastrar vários serviços, sem limite numérico fixo no MVP.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_servico` | UUID (PK) | Sim | Gerado pelo backend. |
| `id_profissional` | UUID (FK) | Sim | Referencia `PROFISSIONAIS.id_profissional`; proprietário obtido da sessão validada, nunca confiado ao navegador. |
| `id_categoria` | UUID (FK) | Condicional | Nulo permitido em `draft`; obrigatório para publicação. Deve apontar para categoria existente. Categoria ativa é exigida ao criar/selecionar para publicação; serviços existentes em categoria posteriormente inativa podem continuar publicados. |
| `nome_servico` | Texto 5–100 | Condicional | Pode ficar nulo/incompleto em `draft`; obrigatório e validado na publicação. |
| `descricao` | Texto até 1.000 | Condicional | Pode ficar nula/incompleta em `draft`; obrigatória e validada na publicação. |
| `bairros_regioes` | Texto até 500 | Não | Texto livre; cidades são mantidas em `SERVICO_CIDADES`. |
| `modalidade_preco` | ENUM | Condicional | Pode ficar nula em `draft`; obrigatória na publicação. |
| `valor_preco` | DECIMAL(10,2) | Condicional | Obrigatório e não negativo para `fixed` e `starting_at`; nulo para outras modalidades. |
| `status` | ENUM | Sim | `draft`, `published`, `paused`, `suspended`, `removed`. |
| `criado_em` | DATETIME | Sim | Gerado na criação e imutável. |
| `atualizado_em` | DATETIME | Sim | Atualizado em mudanças efetivas. |
| `publicado_em` | DATETIME | Não | Nulo antes da primeira publicação; preenchido na primeira publicação e preservado em pausas/reativações posteriores. |

**Modalidades de preço:**

| Valor | Exige `valor_preco` | Exibição |
|---|---|---|
| `fixed` | Sim | Preço fixo |
| `starting_at` | Sim | A partir de |
| `negotiable` | Não | Preço a combinar |
| `consultation` | Não | Sob consulta |
| `not_informed` | Não | Sem preço exibido |

**Obrigatoriedade condicional:** em `draft`, `id_servico`, `id_profissional`, `status`, `criado_em` e `atualizado_em` continuam obrigatórios. `id_categoria`, `nome_servico`, `descricao` e `modalidade_preco` podem ficar ausentes ou incompletos. Se uma modalidade de preço já tiver sido escolhida, `valor_preco` deve respeitar imediatamente a regra daquela modalidade. Limites máximos continuam válidos no rascunho; os mínimos e a completude são exigidos na publicação.

**Estados:**

- `draft`: incompleto ou ainda não submetido à publicação; não aparece publicamente e pode existir sem cidade associada.
- `published`: visível somente se a conta estiver ativa e as demais condições de elegibilidade forem atendidas.
- `paused`: oculto; pode ser reativado pelo proprietário se não estiver suspenso/removido administrativamente.
- `suspended`: oculto por decisão administrativa, com justificativa; somente administrador pode reativar ou remover.
- `removed`: removido logicamente, oculto e preservado no histórico.

**Publicação:** a conclusão/publicação ocorre automaticamente após o backend validar conta ativa, perfil válido, nome, descrição, categoria ativa no momento da publicação, modalidade/preço coerentes e pelo menos uma cidade ativa associada em `SERVICO_CIDADES`. Imagens são opcionais. Um rascunho não pode ser exibido antes da confirmação de todas as regras.

**Suspensão da conta:** não alterar o status individual de cada serviço. A visibilidade é calculada combinando `SERVICOS.status` e `USUARIOS.status`; quando a conta fica suspensa/fechada, os serviços deixam de ser públicos sem apagar o estado individual. Na reativação, somente serviços que ainda estiverem `published` voltam a ser elegíveis.

### 3.7. CATEGORIAS

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_categoria` | UUID (PK) | Sim | Gerado pelo backend; único e imutável. |
| `nome` | Texto 2–60 | Sim | Trim; comparação de unicidade sem diferença de caixa ou acentos; preservar grafia original na exibição. |
| `status` | ENUM | Sim | `active` ou `inactive`; novo cadastro inicia `active`. |
| `criado_em` | DATETIME | Sim | Gerado pelo backend e imutável. |
| `atualizado_em` | DATETIME | Sim | Atualizado em mudança efetiva. |

Categorias iniciais: Construção e reformas, Elétrica, Hidráulica, Limpeza, Beleza e estética, Tecnologia, Aulas e educação, Transporte e Outros.

Somente administradores podem cadastrar, editar, desativar ou reativar. Categoria inativa não pode ser selecionada em novos serviços/publicações, mas os serviços que já a utilizam continuam públicos se forem elegíveis. Exclusão física somente sem referências; na demonstração, preferir desativação.

### 3.8. CIDADES

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_cidade` | UUID (PK) | Sim | Gerado pelo backend; único e imutável. |
| `nome` | Texto 2–60 | Sim | Nome do município com grafia preservada; comparação normalizada. |
| `uf` | Texto 2 | Sim | Sigla em maiúsculas, limitada às 27 UFs brasileiras. |
| `codigo_ibge` | Texto 7 dígitos | Não | Opcional; se informado, deve corresponder ao município/UF e ser único. |
| `status` | ENUM | Sim | `active` ou `inactive`; novo cadastro inicia `active`. |
| `criado_em` | DATETIME | Sim | Gerado pelo backend e imutável. |
| `atualizado_em` | DATETIME | Sim | Atualizado em mudança efetiva. |

**Unicidade:** nome normalizado + UF é único; código IBGE é único quando preenchido. A normalização de comparação desconsidera caixa e acentuação, preservando o nome oficial na exibição. Quando o código IBGE estiver presente, validar os sete dígitos e sua correspondência com município e UF. A lista inicial deverá ser conferida com fonte oficial do IBGE.

Cidade inativa não poderá ser usada em novas associações nem selecionada para uma nova cidade principal. Vínculos existentes são preservados e não deixam de ser públicos apenas por desativação. A exclusão física fica bloqueada enquanto houver referências.

### 3.9. SERVICO_CIDADES

Tabela intermediária do relacionamento N:N entre serviços e municípios.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_servico_cidade` | UUID (PK) | Sim | Gerado pelo backend. |
| `id_servico` | UUID (FK) | Sim | Referencia `SERVICOS.id_servico`; proprietário deve estar autorizado. |
| `id_cidade` | UUID (FK) | Sim | Referencia `CIDADES.id_cidade`; cidade deve estar ativa na criação. |
| `criado_em` | DATETIME | Sim | Gerado pelo backend e imutável. |

**Unicidade composta:** `(id_servico, id_cidade)` não pode se repetir. Um serviço pode ter várias cidades e uma cidade pode atender vários serviços. Uma publicação exige pelo menos uma associação com cidade ativa.

Ao deixar de atender em uma cidade, a associação atual é removida e a operação é registrada em `AUDITORIA`, incluindo os dois UUIDs. Se voltar a atender, será criada nova associação. Não permitir remover a última cidade de um serviço publicado sem incluir outra cidade ou alterar o status em uma operação válida. Desativar uma cidade não apaga associações existentes.

### 3.10. IMAGENS

Armazena metadados e propriedade lógica; o binário fica no Google Drive.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_imagem` | UUID (PK) | Sim | Gerado pelo backend. |
| `id_profissional` | UUID (FK) | Condicional | Referencia `PROFISSIONAIS.id_profissional` quando for imagem de perfil; caso contrário, nulo. |
| `id_servico` | UUID (FK) | Condicional | Referencia `SERVICOS.id_servico` quando for imagem de serviço; caso contrário, nulo. |
| `id_arquivo_drive` | Texto | Sim | ID do arquivo no Drive, gerado pelo backend; único nesta entidade. |
| `tipo_mime` | ENUM | Sim | Somente `image/jpeg`, `image/png` ou `image/webp`. |
| `tamanho_bytes` | INTEGER | Sim | Positivo e no máximo **5.000.000 bytes (5 MB)** por arquivo. |
| `ordem_exibicao` | INTEGER | Sim | Perfil: exatamente 1. Serviço: de 1 a 5. |
| `status` | ENUM | Sim | `active` ou `removed`. |
| `criado_em` | DATETIME | Sim | Gerado pelo backend e imutável. |
| `atualizado_em` | DATETIME | Sim | Atualizado quando ordem/status mudar efetivamente. |

**Proprietário exclusivo:** exatamente um entre `id_profissional` e `id_servico` deve estar preenchido. Ambos nulos ou ambos preenchidos são inválidos.

**Limites e posições:**
- No máximo uma imagem ativa por profissional; posição 1.
- No máximo cinco imagens ativas por serviço; posições exclusivas de 1 a 5.
- Imagens removidas não ocupam posição; uma posição liberada pode ser reutilizada.
- Substituição registra nova imagem e marca a anterior como `removed`; não reutilizar o ID de imagem.
- Quantidade, tipo real do conteúdo, tamanho, propriedade e posição devem ser validados no backend, não apenas na interface.

**Visibilidade efetiva:** `status=active` significa que o registro não foi removido, mas não torna o arquivo automaticamente público. Imagem de perfil só é pública se a conta estiver ativa. Imagem de serviço só é pública se o serviço estiver `published` e a conta proprietária estiver ativa. `draft`, `paused`, `suspended`, `removed`, conta suspensa ou fechada implicam acesso privado.

**Drive:** pasta principal deverá permanecer privada; compartilhar individualmente somente arquivos elegíveis. Permissões herdadas de pastas não podem ser removidas diretamente no arquivo filho; a estrutura deverá evitar herança pública indesejada. Revogar acesso não apaga cópias já baixadas.

### 3.11. DENUNCIAS

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_denuncia` | UUID (PK) | Sim | Gerado pelo backend. |
| `id_profissional` | UUID (FK) | Condicional | Alvo profissional; nulo se o alvo for serviço. |
| `id_servico` | UUID (FK) | Condicional | Alvo serviço; nulo se o alvo for profissional. |
| `motivo` | ENUM | Sim | `false_information`, `nonexistent_service`, `inappropriate_content`, `suspected_fraud`, `duplicate_listing`, `other`. |
| `descricao` | Texto até 500 | Condicional | Opcional, exceto para `other`, quando é obrigatória; texto simples e não vazio após trim. |
| `status` | ENUM | Sim | `received`, `in_analysis`, `valid`, `invalid`, `closed`. |
| `id_admin_responsavel` | UUID (FK) | Não | Referencia `USUARIOS.id_usuario`; se preenchido, conta deve ter papel admin e estar autorizada. |
| `criado_em` | DATETIME | Sim | Gerado pelo backend no recebimento. |
| `atualizado_em` | DATETIME | Sim | Atualizado em mudança efetiva. |
| `analisado_em` | DATETIME | Não | Nulo em `received`/ `in_analysis`; preenchido ao alcançar qualquer estado final: `valid`, `invalid` ou `closed`. |

**Alvo exclusivo:** exatamente um entre `id_profissional` e `id_servico` deve estar preenchido e existir. O motivo `nonexistent_service` somente pode ser utilizado quando o alvo for um serviço. Não existe limite de uma denúncia por alvo; denúncias independentes podem ser recebidas.

**Fluxo:** `received` → `in_analysis` → `valid`, `invalid` ou `closed`. Os três últimos estados são finais no MVP e não podem ser reabertos. Qualquer visitante pode enviar denúncia sem login; não coletar identidade do denunciante nem aceitar anexos. Receber denúncia não remove automaticamente o conteúdo. Todas as operações administrativas serão auditadas.

### 3.12. AUDITORIA

Histórico de eventos relevantes, somente por acréscimo pela aplicação (*append-only*). Não é um mecanismo inviolável contra quem tenha acesso privilegiado direto à planilha ou ao projeto Apps Script.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---|---|
| `id_evento` | UUID (PK) | Sim | Gerado pelo backend, único e imutável. |
| `id_usuario_ator` | UUID (FK) | Condicional | FK para `USUARIOS.id_usuario`; obrigatório para ator user/admin; nulo para system/visitor. |
| `tipo_ator` | ENUM | Sim | `user`, `admin`, `system`, `visitor`; papel registrado representa o ator no momento do evento. |
| `acao` | Texto controlado | Sim | Código de ação de catálogo controlado pelo backend. |
| `entidade_afetada` | Texto controlado | Sim | Uma das 12 entidades ou `SISTEMA`. |
| `id_registro_afetado` | UUID | Não | ID do registro alvo; nulo quando não há registro específico. |
| `resultado` | ENUM | Sim | `success`, `failure`, `denied`. |
| `detalhes` | Texto JSON até 1.000 | Não | Complemento estruturado e sanitizado, com lista de propriedades permitidas. |
| `criado_em` | DATETIME | Sim | Gerado pelo backend e imutável. |

**Regras:** apenas o backend grava; a interface administrativa permite consulta, não edição. Eventos não são atualizados nem apagados pela aplicação. Correções geram novo evento. A ação e a entidade afetada usam listas controladas; para `id_registro_afetado`, o backend valida o UUID segundo a entidade indicada, pois a referência polimórfica não possui uma FK relacional única.

Nunca registrar senha, hash de senha, salt, código de verificação, token, hash de token, segredo criptográfico, conteúdo integral de requisição ou dado pessoal desnecessário. `detalhes` pode guardar, por exemplo, status anterior/novo, justificativa sanitizada ou os UUIDs de uma associação removida.

## 4. Relacionamentos e cardinalidades

| Origem | Destino | Cardinalidade | Regra |
|---|---|---|---|
| `USUARIOS` | `PROFISSIONAIS` | 1 : 0..1 | `PROFISSIONAIS.id_usuario` único. Professional ativo exige um perfil. |
| `USUARIOS` | `SESSOES` | 1 : N | Sessões históricas preservadas/revogadas. |
| `USUARIOS` | `CODIGOS_VERIFICACAO` | 1 : N | Histórico; no máximo um ativo por finalidade. |
| `USUARIOS` | `CONTROLE_AUTENTICACAO` | Sem FK direta | Identificação por HMAC de e-mail normalizado; evita armazenar e-mail bruto. |
| `PROFISSIONAIS` | `SERVICOS` | 1 : N | Cada serviço tem um proprietário. |
| `CATEGORIAS` | `SERVICOS` | 1 : N | Categoria pode estar ligada a muitos serviços. |
| `CIDADES` | `PROFISSIONAIS` | 1 : N | Cidade principal. |
| `SERVICOS` | `SERVICO_CIDADES` | 1 : N | Relação intermediária. |
| `CIDADES` | `SERVICO_CIDADES` | 1 : N | Relação intermediária; par único. |
| `PROFISSIONAIS` | `IMAGENS` | 1 : 0..1 ativa | Uma fotografia de perfil ativa no máximo. |
| `SERVICOS` | `IMAGENS` | 1 : 0..5 ativas | Até cinco imagens de serviço ativas. |
| `PROFISSIONAIS` | `DENUNCIAS` | 1 : N | Denúncias cujo alvo é o perfil. |
| `SERVICOS` | `DENUNCIAS` | 1 : N | Denúncias cujo alvo é o serviço. |
| `USUARIOS` | `DENUNCIAS` | 1 : N (opcional) | Administrador responsável. |
| `USUARIOS` | `AUDITORIA` | 1 : N (opcional) | Ator autenticado; visitante/sistema não têm FK de usuário. |

## 5. Restrições de unicidade e validação

| Entidade | Restrição |
|---|---|
| `USUARIOS` | `email` único após trim + minúsculas. |
| `PROFISSIONAIS` | `id_usuario` único. |
| `SESSOES` | `token_hash` único. |
| `CODIGOS_VERIFICACAO` | No máximo um código ativo por `id_usuario + finalidade`; novo código invalida o anterior. |
| `CONTROLE_AUTENTICACAO` | `identificador_hash` único. |
| `SERVICOS` | FKs válidas; regras condicionais de rascunho/publicação e preço. |
| `CATEGORIAS` | `nome` único após normalização sem caixa/acentos. |
| `CIDADES` | `nome normalizado + uf` único; `codigo_ibge` único quando preenchido. |
| `SERVICO_CIDADES` | Par `id_servico + id_cidade` único. |
| `IMAGENS` | `id_arquivo_drive` único; exatamente um proprietário; posições únicas entre imagens ativas do mesmo proprietário. |
| `DENUNCIAS` | Exatamente um alvo; alvo existente; regras de motivo/descrição. |
| `AUDITORIA` | `id_evento` único; referências polimórficas validadas pelo backend. |

As comparações normalizadas de nome/cidade devem preservar o texto original para exibição. O backend deve validar duplicidade sob proteção contra concorrência, não apenas fazer uma leitura sem bloqueio e depois gravar.

## 6. Estados e visibilidade combinada

| Entidade | Estados |
|---|---|
| `USUARIOS` | `pending_activation`, `active`, `suspended`, `closed` |
| `SERVICOS` | `draft`, `published`, `paused`, `suspended`, `removed` |
| `CATEGORIAS` | `active`, `inactive` |
| `CIDADES` | `active`, `inactive` |
| `IMAGENS` | `active`, `removed` |
| `DENUNCIAS` | `received`, `in_analysis`, `valid`, `invalid`, `closed` |

**Elegibilidade pública do serviço:** serviço somente aparece se seu status for `published`, a conta proprietária estiver `active`, o perfil existir e as regras obrigatórias de cidade/categoria/publicação continuarem satisfeitas. Categoria ou cidade inativada posteriormente não oculta automaticamente conteúdo já associado, conforme regras aprovadas.

**Suspensão/encerramento da conta:** a conta inativa/suspensa/fechada oculta serviços e imagens. Não sobrescrever os estados individuais dos serviços. Assim, ao reativar a conta, somente serviços cujo estado individual ainda seja `published` voltam a ser elegíveis; `draft`, `paused`, `suspended` e `removed` permanecem ocultos.

**Imagem pública:** registro `active` é apenas uma condição; o acesso depende também do estado da conta e, para imagem de serviço, do estado do serviço. `removed` nunca é público.

**Denúncias:** receber uma denúncia não muda estado do alvo. A decisão de moderação é separada e auditada.

## 7. Regras de operação e consistência

### 7.1. Cadastro, rascunho e publicação de serviço

1. A identidade do profissional vem da sessão validada no backend.
2. A criação pode gerar `draft` mesmo sem nome completo, descrição, categoria, modalidade/preço ou cidades.
3. Em `draft`, IDs e proprietário, status e datas técnicas permanecem obrigatórios; campos incompletos podem ser nulos/parciais, respeitando limites máximos.
4. Para publicar, o backend valida conta ativa, perfil válido, nome (5–100), descrição (até 1.000), categoria ativa, modalidade/preço coerentes e ao menos uma associação com cidade ativa.
5. Imagens são opcionais; se enviadas, devem satisfazer todos os limites e permissões.
6. Após validação, a publicação é automática no fluxo de conclusão, sem deixar o registro parcialmente público.
7. `publicado_em` recebe o instante da primeira publicação e é preservado nas pausas e reativações subsequentes.
8. Não permitir remover a última cidade de um serviço publicado sem incluir outra ou alterar seu estado de forma válida.

### 7.2. Imagens e Google Drive

- A pasta raiz e as pastas internas do Drive permanecem privadas; não herdar compartilhamento público de pastas.
- Cada arquivo elegível é compartilhado individualmente para leitura por link; arquivos inelegíveis permanecem privados.
- Verificar a permissão efetiva consultando as permissões do arquivo. Permissões herdadas não são removidas diretamente no filho; a estrutura de pastas deve impedir herança pública indesejada.
- Upload: criar arquivo privado, validar conteúdo e tamanho, preparar a permissão necessária, registrar metadados e evento de auditoria e confirmar a associação. Se alguma etapa falhar, manter o arquivo privado/sem elegibilidade e executar compensação/reconciliação.
- Remoção, pausa, suspensão ou encerramento: atualizar estado de domínio e registrar evento do Sheets; a interface oculta imediatamente o recurso; depois revogar permissão pública e confirmar a revogação. Enquanto o Drive não confirmar, a operação permanece incompleta/pendente, embora o conteúdo já esteja oculto na aplicação.
- Falhas de permissão são registradas em evento próprio quando possível e submetidas à reconciliação. Não afirmar que um link antigo foi bloqueado antes de verificar o Drive.
- Revogar permissão não apaga cópias ou capturas previamente obtidas.

A API do Drive alerta que permissões herdadas não podem ser revogadas diretamente em itens filhos e que a remoção precisa ser verificada no arquivo. Consulte [Drive API — compartilhar arquivos e pastas](https://developers.google.com/workspace/drive/api/guides/manage-sharing).

### 7.3. Gravações de dados e auditoria no Sheets

O arquivo de dados terá as 12 abas listadas na seção 2. Para operações que exigem auditoria, a alteração do registro de negócio e a inclusão do evento deverão integrar o mesmo `spreadsheets.batchUpdate`, usando requisições de células compatíveis (por exemplo, atualizações/inserções de células) no mesmo arquivo. A API valida as solicitações antes de aplicá-las e aplica o lote de forma atômica: se uma requisição for inválida, o lote inteiro falha e nenhuma das alterações daquele lote é aplicada.

Referência oficial: [Google Sheets API — spreadsheets.batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate).

**Concorrência:** utilizar `LockService` em trechos críticos de leitura–validação–gravação, como unicidade composta, limites de imagens, tentativas de autenticação e consumo de códigos. O bloqueio não substitui o lote atômico. O escopo do lock deve ser testado; um `ScriptLock` global pode serializar operações de usuários diferentes e limitar desempenho.

Referência oficial: [Apps Script — LockService](https://developers.google.com/apps-script/reference/lock/lock-service).

**Falha do lote:** se o lote de negócio + auditoria falhar, nenhuma alteração desse lote deve ser considerada concluída. O backend tentará registrar um evento separado de falha em uma segunda gravação de auditoria. Se até essa gravação falhar, registrar log técnico sanitizado e sinalizar a falha operacional; isso não oferece garantia de auditoria durável e deverá ser tratado como limitação, nunca como sucesso silencioso.

**Limite de atomicidade:** o lote atômico do Sheets abrange apenas alterações dentro do mesmo arquivo de planilha. Não cria transação distribuída com Google Drive, e-mail, propriedades do Apps Script ou outros serviços.

### 7.4. Reconciliação de permissões do Drive

O estado esperado de cada arquivo pode ser recalculado a partir de `IMAGENS`, `SERVICOS` e `USUARIOS`. Uma rotina idempotente de reconciliação deverá comparar a elegibilidade calculada com as permissões efetivas do Drive, corrigir divergências e registrar o resultado. A forma e a frequência da rotina (execução administrativa ou gatilho agendado) permanecem pendentes de prova de conceito e avaliação de cotas.

Uma operação que dependa de alteração de permissão não será apresentada como integralmente concluída até a confirmação no Drive. O estado dos dados no Sheets pode já ter sido atualizado; a resposta da operação deverá distinguir conclusão parcial de conclusão integral.

## 8. Segurança e privacidade

- Dados de demonstração serão sintéticos.
- Campos privados não serão enviados em respostas públicas.
- Nenhum segredo, chave HMAC, senha, token, código em claro ou credencial será colocado no frontend, nas abas ou no repositório.
- Chaves HMAC ficarão em configuração privada do Apps Script, nunca nas planilhas. Acesso de editores ao projeto deve ser mínimo; propriedades do script não são um cofre inviolável.
- A chave para códigos e a chave para identificadores de autenticação devem ser separadas quando possível.
- Imagens e descrições serão tratadas como conteúdo não confiável.
- O acesso direto às planilhas será restrito; a aplicação não expõe credenciais privilegiadas ao React.
- `AUDITORIA` será append-only pela aplicação, mas usuários com permissões de edição do arquivo/projeto ainda podem adulterar dados. Não classificar o Sheets como log inviolável.
- Retenção de dados é uma regra acadêmica para dados fictícios; uma versão com dados reais exigirá política própria de finalidade, retenção e direitos dos titulares.

## 9. Validações técnicas obrigatórias antes de implementar

1. **Senha:** KDF apropriado, salt individual, parâmetros versionados, comparação segura e desempenho.
2. **Sessão:** transporte, persistência, expiração, revogação e resistência a XSS/CORS no fluxo real React–Apps Script.
3. **Códigos:** HMAC, expiração, uso único, tentativas, intervalo de reenvio e concorrência.
4. **Bloqueio de login:** resistência a abuso e negação de serviço contra contas.
5. **Autorização:** tentativas de alterar papel, proprietário, estado e acessar recursos de outro profissional.
6. **Google Drive:** compartilhamento individual, revogação, herança, acesso a links antigos, falhas e reconciliação.
7. **Sheets:** lote de dados + auditoria, concorrência, unicidade, falhas de gravação e limites/cotas.
8. **Auditoria:** tratamento de falha tanto no lote atômico quanto na gravação separada de falha; ausência de segredos.
9. **Integração:** comunicação React–Web App, CORS/POST/JSON, redirecionamentos, latência, cotas e limites de execução.

Se uma prova de conceito não cumprir requisitos mínimos, não implementar o fluxo por improviso. Registrar a limitação e rever a alternativa antes de prosseguir.

## 10. O que não faz parte deste modelo

Não criar novas entidades para bairros, regiões, avaliações, favoritos, conversas, pagamentos, agendamentos, anexos de denúncias, fila genérica de eventos ou relatórios avançados no MVP. Não adicionar campos apenas por conveniência de interface. Necessidades futuras exigem nova decisão e atualização rastreável da especificação e deste documento.

## 11. Esquema físico aprovado

Esta seção registra o esquema físico aprovado para a futura planilha do Conecta Local. Ela complementa o modelo lógico anterior: define nomes e ordem das colunas, tipo de célula no Google Sheets, valores controlados, campos opcionais e restrições operacionais.

**Estado:** as 12 estruturas foram aprovadas conceitualmente, uma por vez. A aprovação deste documento não significa que a planilha, suas abas, dados, validações ou integrações já tenham sido criados.

### 11.1. Convenções gerais do arquivo

- Será utilizado **um único arquivo Google Sheets**, com exatamente 12 abas operacionais, uma para cada entidade.
- Os nomes das abas serão exatamente: USUARIOS, PROFISSIONAIS, SESSOES, CODIGOS_VERIFICACAO, CONTROLE_AUTENTICACAO, SERVICOS, CATEGORIAS, CIDADES, SERVICO_CIDADES, IMAGENS, DENUNCIAS e AUDITORIA.
- A linha 1 conterá exclusivamente os cabeçalhos. Os registros começam na linha 2.
- Os cabeçalhos usarão os nomes de campo em snake_case, na ordem indicada nas tabelas desta seção.
- UUIDs serão armazenados como texto. Número de linha nunca será identificador ou chave primária.
- Valores ENUM e códigos controlados serão armazenados exatamente como escritos, sem tradução ou variação de caixa.
- Campo opcional sem valor será representado por célula vazia. Não utilizar os textos NULL, N/A, undefined ou similares.
- Datas serão textos ISO 8601 em UTC, preferencialmente no formato YYYY-MM-DDTHH:mm:ss.sssZ. Não depender de formatação regional ou serial numérico de data do Sheets.
- Campos inteiros serão células numéricas inteiras. tamanho_bytes, contadores e posições não devem ser gravados como texto.
- valor_preco será célula numérica com até duas casas decimais, respeitando o domínio lógico DECIMAL(10,2). O backend deverá normalizar valores monetários em centavos nas operações e não depender de comparações imprecisas de ponto flutuante.
- Campos de texto serão armazenados como texto simples. Dados fornecidos pelo usuário nunca serão tratados como fórmulas ou HTML executável.
- Não inserir fórmulas, células mescladas, títulos, subtotais ou linhas de apresentação dentro das abas operacionais.
- Cabeçalhos e estrutura deverão ser protegidos. O acesso direto de edição será restrito a responsáveis técnicos estritamente necessários; a operação normal será feita pelo Apps Script.
- Listas suspensas e validações nativas do Sheets são auxiliares de preenchimento. **O backend permanece como autoridade** e deverá repetir todas as validações, inclusive quando a chamada não vier da interface.
- Nas gravações pela API do Sheets, utilizar a opção de entrada apropriada (RAW, quando aplicável) para evitar que valores enviados sejam interpretados como fórmulas.
- O backend não poderá expor a planilha inteira, hashes de autenticação, tokens, códigos ou outros campos privados ao React.

### 11.2. Inventário físico

| Ordem | Aba | Colunas | Finalidade |
|---:|---|---:|---|
| 1 | USUARIOS | 11 | Identidade de acesso, credenciais, papel e estado da conta |
| 2 | PROFISSIONAIS | 11 | Perfil profissional e dados de contato |
| 3 | SESSOES | 7 | Sessões autenticadas e revogação |
| 4 | CODIGOS_VERIFICACAO | 10 | Códigos de confirmação, recuperação e mudança de e-mail |
| 5 | CONTROLE_AUTENTICACAO | 6 | Contagem de falhas e bloqueio temporário |
| 6 | SERVICOS | 12 | Cadastro, preço, estado e publicação dos serviços |
| 7 | CATEGORIAS | 5 | Categorias administráveis |
| 8 | CIDADES | 7 | Municípios e UFs disponíveis |
| 9 | SERVICO_CIDADES | 4 | Associações atuais entre serviços e municípios |
| 10 | IMAGENS | 10 | Metadados e referência aos arquivos do Drive |
| 11 | DENUNCIAS | 10 | Denúncias e fluxo de análise |
| 12 | AUDITORIA | 9 | Histórico de eventos relevantes |
| | **Total** | **102** | **12 abas** |

### 11.3. USUARIOS — 11 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_usuario | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | email | Texto | Obrigatório; até 254 caracteres; normalizado com trim e minúsculas; único após normalização. |
| C | senha_hash | Texto | Obrigatório; produto do KDF que vier a ser aprovado na prova de conceito. Nunca armazenar senha em claro. |
| D | senha_salt | Texto | Obrigatório; salt individual; formato e tamanho dependem da prova de conceito criptográfica. |
| E | senha_algoritmo | Texto | Obrigatório; identificador/versionamento e parâmetros do KDF efetivamente utilizado. |
| F | papel | Lista controlada | professional ou admin. Papel administrativo não pode ser escolhido pelo formulário público. |
| G | status | Lista controlada | pending_activation, active, suspended ou closed. |
| H | email_verificado_em | Texto ISO 8601 UTC | Opcional; vazio até confirmação válida do endereço. |
| I | criado_em | Texto ISO 8601 UTC | Obrigatório; gerado pelo backend e imutável. |
| J | atualizado_em | Texto ISO 8601 UTC | Obrigatório; atualizado em mudança efetiva. |
| K | ultimo_login_em | Texto ISO 8601 UTC | Opcional; vazio até o primeiro login bem-sucedido. |

**Privacidade:** e-mail, hash, salt e parâmetros de senha são privados. Nunca retornar esses campos em consultas públicas ou registrá-los em logs. Uma conta professional só pode ser ativada quando possuir exatamente um perfil válido; uma conta admin não exige perfil. A implementação de senha permanece bloqueada até a prova de conceito de KDF.

### 11.4. PROFISSIONAIS — 11 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_profissional | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | id_usuario | Texto | Obrigatório; FK para USUARIOS.id_usuario; único, garantindo no máximo um perfil por usuário. |
| C | nome_completo | Texto | Obrigatório; 2–120 caracteres; privado, não exibir publicamente. |
| D | nome_publico | Texto | Obrigatório; 2–80 caracteres; nome exibido publicamente. |
| E | apresentacao | Texto | Obrigatório; até 500 caracteres; texto simples. |
| F | id_cidade_principal | Texto | Obrigatório; FK para CIDADES.id_cidade; cidade deve estar ativa ao criar ou trocar o vínculo. Vínculo existente é preservado se a cidade for posteriormente inativada. |
| G | bairros_regioes_atendidos | Texto | Opcional; até 500 caracteres; texto livre, sem entidade própria de bairros. |
| H | whatsapp | Texto | Obrigatório; telefone normalizado em E.164; público. |
| I | telefone_alternativo | Texto | Opcional; telefone normalizado em E.164; privado por padrão. |
| J | criado_em | Texto ISO 8601 UTC | Obrigatório; gerado pelo backend e imutável. |
| K | atualizado_em | Texto ISO 8601 UTC | Obrigatório; atualizado em mudança efetiva. |

Não armazenar e-mail, senha ou status da conta nesta aba. A foto do perfil será referenciada em IMAGENS; não adicionar URL ou binário aqui.

### 11.5. SESSOES — 7 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_sessao | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | id_usuario | Texto | Obrigatório; FK para USUARIOS.id_usuario. Várias sessões por usuário são permitidas. |
| C | token_hash | Texto | Obrigatório; digest SHA-256 do token de alta entropia, com 64 caracteres hexadecimais minúsculos; único. Armazenar somente o hash. |
| D | criado_em | Texto ISO 8601 UTC | Obrigatório; data de criação da sessão e origem do limite absoluto. |
| E | ultima_atividade_em | Texto ISO 8601 UTC | Obrigatório; atualizar somente após atividade autenticada válida. |
| F | expira_em | Texto ISO 8601 UTC | Obrigatório; exatamente criado_em + 8 horas. |
| G | revogada_em | Texto ISO 8601 UTC | Opcional; vazio enquanto não revogada; preenchido ao revogar. |

O desenho prevê token original com 32 bytes aleatórios (256 bits), mas geração, transporte e persistência no navegador dependem de prova de conceito. A sessão será inválida se revogada, se a conta não estiver ativa, se ultrapassar expira_em ou se ultima_atividade_em + 30 minutos tiver sido ultrapassado. Logout revoga a sessão atual; alteração/recuperação de senha, suspensão ou encerramento revogam todas as sessões. Uma sessão revogada não poderá ser reativada por atualização de atividade.

Não criar coluna status: a validade é calculada pelas datas e pelo estado da conta. Atualizações e revogações concorrentes exigem proteção no backend.

### 11.6. CODIGOS_VERIFICACAO — 10 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_codigo | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | id_usuario | Texto | Obrigatório; FK para USUARIOS.id_usuario. |
| C | finalidade | Lista controlada | verify_email, reset_password ou change_email. |
| D | email_destino | Texto | Obrigatório; até 254 caracteres, normalizado. Deve corresponder ao endereço pertinente à finalidade. |
| E | codigo_hmac | Texto | Obrigatório; HMAC-SHA-256 em hexadecimal minúsculo, 64 caracteres; contexto deve vincular usuário, finalidade e destinatário. |
| F | criado_em | Texto ISO 8601 UTC | Obrigatório; gerado pelo backend. |
| G | expira_em | Texto ISO 8601 UTC | Obrigatório; exatamente criado_em + 10 minutos. |
| H | tentativas | Número inteiro | Obrigatório; entre 0 e 5; começa em 0. |
| I | utilizado_em | Texto ISO 8601 UTC | Opcional; preenchido após utilização válida. |
| J | invalidado_em | Texto ISO 8601 UTC | Opcional; preenchido quando invalidado antes de utilização. |

O código original tem seis dígitos e nunca será armazenado em claro. A chave HMAC fica em configuração privada do Apps Script, fora da planilha, frontend e logs. Uma chave própria para códigos deve ser separada da chave usada no controle de autenticação, quando possível.

Regras: uso único; validade de 10 minutos; máximo de cinco tentativas; intervalo mínimo de 60 segundos entre emissões, calculado a partir do criado_em mais recente daquela finalidade; no máximo um código operacionalmente ativo por id_usuario + finalidade; novo código invalida o anterior. utilizado_em e invalidado_em são mutuamente exclusivos. Código expirado, utilizado, invalidado ou com cinco tentativas não pode ser aceito. Para verify_email, o destino é o endereço a confirmar; para reset_password, o e-mail atual da conta; para change_email, o novo endereço solicitado.

### 11.7. CONTROLE_AUTENTICACAO — 6 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_controle | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | identificador_hash | Texto | Obrigatório; HMAC-SHA-256 do e-mail normalizado, 64 caracteres hexadecimais minúsculos; único. |
| C | tentativas_falhas | Número inteiro | Obrigatório; inteiro entre 0 e 5. |
| D | inicio_janela_em | Texto ISO 8601 UTC | Opcional; vazio antes da primeira falha da janela atual. |
| E | bloqueado_ate | Texto ISO 8601 UTC | Opcional; preenchido até 15 minutos após atingir o limite de falhas. |
| F | atualizado_em | Texto ISO 8601 UTC | Obrigatório; atualizado em cada mudança efetiva. |

Cinco falhas dentro de uma janela de 15 minutos acionam bloqueio por 15 minutos. Login bem-sucedido limpa contador e bloqueio. Ao encerrar o bloqueio, o backend reinicia a contagem; falhas posteriores iniciam nova janela. O controle não armazena e-mail bruto, IP, User-Agent, senha ou token.

Não haverá FK direta para USUARIOS, pois tentativas com identificadores sem conta cadastrada também precisam ser tratadas sem revelar a existência de uma conta. Concorrência e abuso de bloqueio por identificador exigem prova de conceito; o contador nunca depende do frontend.

### 11.8. SERVICOS — 12 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_servico | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | id_profissional | Texto | Obrigatório; FK para PROFISSIONAIS.id_profissional; proprietário obtido da sessão validada. |
| C | id_categoria | Texto | Condicional; FK para CATEGORIAS.id_categoria; vazio permitido em draft, obrigatório para publicar. |
| D | nome_servico | Texto | Condicional; até 100 caracteres em qualquer estado; de 5 a 100 para publicação. |
| E | descricao | Texto | Condicional; até 1.000 caracteres; obrigatória para publicação. |
| F | bairros_regioes | Texto | Opcional; até 500 caracteres. Cidades ficam em SERVICO_CIDADES. |
| G | modalidade_preco | Lista controlada | Condicional; fixed, starting_at, negotiable, consultation ou not_informed. |
| H | valor_preco | Número decimal | Condicional; até duas casas; obrigatório e não negativo para fixed/starting_at; vazio para as demais modalidades. |
| I | status | Lista controlada | Obrigatório; draft, published, paused, suspended ou removed. |
| J | criado_em | Texto ISO 8601 UTC | Obrigatório; gerado na criação e imutável. |
| K | atualizado_em | Texto ISO 8601 UTC | Obrigatório; atualizado em mudanças efetivas. |
| L | publicado_em | Texto ISO 8601 UTC | Opcional; vazio antes da primeira publicação; preenchido na primeira publicação e preservado em pausas/reativações. |

Em draft, id_servico, id_profissional, status, criado_em e atualizado_em são obrigatórios; categoria, nome, descrição e modalidade podem ficar ausentes ou incompletos. Limites máximos continuam válidos no rascunho. Se uma modalidade já estiver definida, o valor deve obedecer imediatamente à regra daquela modalidade.

A publicação exige: conta ativa, perfil válido, nome válido, descrição, categoria ativa no momento da publicação, modalidade/preço coerentes e ao menos uma associação com cidade ativa em SERVICO_CIDADES. Imagens são opcionais. draft, paused, suspended e removed não são públicos. Suspender ou encerrar a conta proprietária oculta seus serviços sem sobrescrever o status individual.

### 11.9. CATEGORIAS — 5 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_categoria | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | nome | Texto | Obrigatório; de 2 a 60 caracteres; preservar grafia original. |
| C | status | Lista controlada | Obrigatório; active ou inactive; novo cadastro inicia active. |
| D | criado_em | Texto ISO 8601 UTC | Obrigatório; gerado pelo backend e imutável. |
| E | atualizado_em | Texto ISO 8601 UTC | Obrigatório; atualizado em mudança efetiva. |

O nome é único após normalização que desconsidera caixa, acentos e espaços excedentes, sem alterar a grafia exibida. Somente administradores podem cadastrar, editar, desativar ou reativar. Categoria inativa não pode ser selecionada em novos serviços/publicações, mas serviços já associados não são ocultados automaticamente.

Categorias iniciais: Construção e reformas; Elétrica; Hidráulica; Limpeza; Beleza e estética; Tecnologia; Aulas e educação; Transporte; Outros.

### 11.10. CIDADES — 7 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_cidade | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | nome | Texto | Obrigatório; de 2 a 60 caracteres; preservar grafia oficial. |
| C | uf | Lista controlada | Obrigatório; sigla de duas letras maiúsculas, uma das 27 UFs brasileiras. |
| D | codigo_ibge | Texto | Opcional; exatamente sete dígitos; único quando preenchido e correspondente ao município/UF. |
| E | status | Lista controlada | Obrigatório; active ou inactive; novo cadastro inicia active. |
| F | criado_em | Texto ISO 8601 UTC | Obrigatório; gerado pelo backend e imutável. |
| G | atualizado_em | Texto ISO 8601 UTC | Obrigatório; atualizado em mudança efetiva. |

A lista de UF é: AC, AL, AP, AM, BA, CE, DF, ES, GO, MA, MT, MS, MG, PA, PB, PR, PE, PI, RJ, RN, RS, RO, RR, SC, SP, SE, TO.

A combinação nome normalizado + UF é única; a normalização desconsidera caixa e acentos, mas preserva o nome original. Código IBGE, quando informado, deve ser validado quanto aos sete dígitos, unicidade e correspondência com município/UF. Cidade inativa não recebe novos vínculos; vínculos existentes são preservados e não deixam de ser públicos apenas pela desativação. Exclusão física fica bloqueada enquanto houver referências. A lista inicial deverá ser conferida com fonte oficial do IBGE.

### 11.11. SERVICO_CIDADES — 4 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_servico_cidade | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | id_servico | Texto | Obrigatório; FK para SERVICOS.id_servico; proprietário precisa estar autorizado. |
| C | id_cidade | Texto | Obrigatório; FK para CIDADES.id_cidade; cidade precisa estar ativa na criação. |
| D | criado_em | Texto ISO 8601 UTC | Obrigatório; gerado pelo backend e imutável. |

A combinação (id_servico, id_cidade) é única. Um serviço pode possuir várias cidades e uma cidade pode possuir vários serviços. A aba contém somente associações atuais: ao deixar de atender em uma cidade, remover a associação e registrar em AUDITORIA os dois UUIDs. Se voltar a atender, criar nova associação com novo UUID e nova data. Não remover a última cidade de um serviço publicado sem incluir outra ou realizar uma mudança válida de estado na mesma operação. Inativar uma cidade não apaga associações existentes.

### 11.12. IMAGENS — 10 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_imagem | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | id_profissional | Texto | Condicional; FK para PROFISSIONAIS.id_profissional quando imagem de perfil; caso contrário, vazio. |
| C | id_servico | Texto | Condicional; FK para SERVICOS.id_servico quando imagem de serviço; caso contrário, vazio. |
| D | id_arquivo_drive | Texto | Obrigatório; ID do arquivo no Drive, gerado pelo backend e único nesta aba. |
| E | tipo_mime | Lista controlada | Obrigatório; image/jpeg, image/png ou image/webp. |
| F | tamanho_bytes | Número inteiro | Obrigatório; positivo e no máximo 5.000.000 bytes por arquivo. |
| G | ordem_exibicao | Número inteiro | Obrigatório; perfil usa exatamente 1; serviço usa de 1 a 5. |
| H | status | Lista controlada | Obrigatório; active ou removed. |
| I | criado_em | Texto ISO 8601 UTC | Obrigatório; gerado pelo backend e imutável. |
| J | atualizado_em | Texto ISO 8601 UTC | Obrigatório; atualizado quando ordem/status mudar efetivamente. |

Exatamente um entre id_profissional e id_servico deve estar preenchido. No máximo uma imagem ativa por profissional, na posição 1; no máximo cinco imagens ativas por serviço, em posições exclusivas de 1 a 5. Imagens removidas não ocupam posições. Substituição cria novo registro/UUID e marca a imagem anterior como removed.

O binário ficará no Google Drive; a planilha guarda metadados e o ID do arquivo, sem coluna de URL pública. Validar no backend o conteúdo real, MIME, tamanho, propriedade e posição — não confiar na extensão ou MIME informado pelo navegador.

A pasta raiz e subpastas permanecem privadas. Compartilhar individualmente somente arquivos elegíveis; validar permissões efetivas e herança. Imagem de perfil só é pública com conta ativa; imagem de serviço somente com serviço published e conta ativa. Estados inelegíveis implicam acesso privado. A revogação de permissão não apaga cópias já baixadas. Operações de Drive e Sheets não formam transação atômica; falhas precisam de compensação/reconciliação e não podem ser apresentadas como concluídas sem confirmação.

### 11.13. DENUNCIAS — 10 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_denuncia | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | id_profissional | Texto | Condicional; FK para PROFISSIONAIS.id_profissional; vazio quando o alvo for serviço. |
| C | id_servico | Texto | Condicional; FK para SERVICOS.id_servico; vazio quando o alvo for perfil. |
| D | motivo | Lista controlada | Obrigatório; false_information, nonexistent_service, inappropriate_content, suspected_fraud, duplicate_listing ou other. |
| E | descricao | Texto | Condicional; até 500 caracteres; obrigatória, não vazia após trim, quando motivo for other. |
| F | status | Lista controlada | Obrigatório; received, in_analysis, valid, invalid ou closed. |
| G | id_admin_responsavel | Texto | Opcional; FK para USUARIOS.id_usuario; quando preenchido, conta deve possuir papel admin e estar autorizada. |
| H | criado_em | Texto ISO 8601 UTC | Obrigatório; gerado pelo backend no recebimento. |
| I | atualizado_em | Texto ISO 8601 UTC | Obrigatório; atualizado em mudança efetiva. |
| J | analisado_em | Texto ISO 8601 UTC | Opcional; vazio em received/in_analysis; preenchido ao alcançar valid, invalid ou closed. |

Exatamente um entre id_profissional e id_servico deve estar preenchido e existir. nonexistent_service só pode apontar para serviço. Denúncias independentes podem apontar para o mesmo alvo. Fluxo: received → in_analysis → valid, invalid ou closed; estados finais não reabrem no MVP.

Qualquer visitante pode denunciar sem login. Não coletar identidade do denunciante, e-mail, telefone ou anexos. Receber denúncia não remove automaticamente o conteúdo. Alterações administrativas são auditadas.

### 11.14. AUDITORIA — 9 colunas

| Coluna | Campo | Tipo físico | Obrigatoriedade e regra |
|---|---|---|---|
| A | id_evento | Texto | Obrigatório; UUID único, gerado pelo backend e imutável. |
| B | id_usuario_ator | Texto | Condicional; FK para USUARIOS.id_usuario; obrigatório para ator user/admin; vazio para system/visitor. |
| C | tipo_ator | Lista controlada | Obrigatório; user, admin, system ou visitor. Representa o tipo no momento do evento. |
| D | acao | Texto controlado | Obrigatório; código de ação pertencente a catálogo controlado pelo backend. |
| E | entidade_afetada | Lista controlada | Obrigatório; uma das 12 entidades ou SISTEMA. |
| F | id_registro_afetado | Texto | Opcional; UUID do registro alvo; vazio quando não houver registro específico. |
| G | resultado | Lista controlada | Obrigatório; success, failure ou denied. |
| H | detalhes | Texto JSON | Opcional; JSON válido, sanitizado, com propriedades permitidas e até 1.000 caracteres. |
| I | criado_em | Texto ISO 8601 UTC | Obrigatório; gerado pelo backend e imutável. |

O catálogo de ações será definido no código confiável do Apps Script, sem uma 13ª aba para catálogo. id_registro_afetado é uma referência polimórfica: o backend valida o UUID segundo entidade_afetada. Os detalhes podem conter, por exemplo, status anterior/novo, justificativa sanitizada ou os dois UUIDs de associação removida.

**Append-only pela aplicação:** somente o backend acrescenta eventos; eventos não são atualizados nem apagados pela aplicação; a interface administrativa permite consulta, não edição. Correções geram novo evento. Isso não torna a planilha inviolável contra quem tenha acesso privilegiado direto à planilha ou ao projeto Apps Script.

Nunca registrar senha, hash de senha, salt, parâmetros secretos, código de verificação, token, hash de token, chave criptográfica, segredo, conteúdo integral de requisição ou dado pessoal desnecessário.

### 11.15. Proteção, consistência e limites operacionais

- As validações nativas do Sheets são conveniência; o Apps Script deverá validar obrigatoriedade, tamanho, tipo, ENUM, unicidade, relacionamentos, propriedade, estados e transições em toda chamada.
- O acesso à planilha será privado e restrito. A interface React nunca recebe a planilha inteira nem credenciais privilegiadas.
- LockService protege trechos críticos de leitura–validação–gravação (por exemplo, unicidade composta, limites de imagens, tentativas e consumo de códigos). O lock não substitui o lote atômico e seu escopo/performance devem ser testados.
- Quando uma mutação exigir auditoria, a alteração de negócio e o novo evento deverão integrar o mesmo spreadsheets.batchUpdate do arquivo, sempre que ambos estiverem no Sheets. Se o lote falhar, a operação não será considerada concluída.
- Se a gravação de um evento de falha separado também falhar, registrar log técnico sanitizado e sinalizar a falha operacional; não afirmar que existe auditoria durável para essa falha.
- Google Sheets e Google Drive não compartilham transação distribuída. Mudanças de permissão exigem confirmação real, tratamento de falha parcial e rotina de reconciliação.
- Nenhuma das regras acima comprova segurança de produção. As provas de conceito obrigatórias da seção 9 continuam bloqueando a ativação de autenticação, sessões, códigos e compartilhamento real no Drive.

## 12. Estado e próximos passos

**Aprovado conceitualmente:**
- inventário lógico de 12 entidades e 102 campos;
- PKs, FKs, cardinalidades e unicidade;
- regras de integridade, estados e visibilidade;
- esquema físico das 12 abas, totalizando 102 colunas, com nomes, ordem, formatos, tipos de célula e validações;
- regras de privacidade, proteção e limites da persistência em Sheets/Drive.

**Ainda não implementado:**
- arquivo Google Sheets e suas 12 abas;
- cabeçalhos e validações nativas;
- registros sintéticos iniciais;
- projeto/API Apps Script;
- uploads e permissões efetivas do Drive;
- autenticação, códigos e sessões;
- provas de conceito técnicas.

**Próxima etapa:** revisão final de consistência da documentação e preparação da inicialização do arquivo Google Sheets. A criação da planilha deverá ocorrer somente após autorização explícita. A primeira inicialização deverá usar dados sintéticos. As provas de conceito de autenticação, concorrência, auditoria e permissões do Drive continuam obrigatórias antes de ativar esses fluxos.

