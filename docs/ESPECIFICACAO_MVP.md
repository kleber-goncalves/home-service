# Especificação funcional do MVP — Conecta Local

> **Status:** versão 0.4 — requisitos e modelagem consolidados; demonstração acadêmica funcional parcialmente implementada e integrada em `dev`. Estado técnico atualizado em 24/11/2026 na seção 2. Os requisitos das seções seguintes descrevem o escopo pretendido e não devem ser confundidos com funcionalidades já entregues.  
> **Versão:** 0.4  
> **Data da consolidação:** 2026-11-10  
> **Escopo:** requisitos funcionais, regras de negócio, dados demonstrativos e critérios técnicos para o MVP acadêmico.  
> **Importante:** decisões registradas neste documento descrevem o comportamento desejado. Elas não significam que as funcionalidades já estejam implementadas.

## 1. Objetivo e contexto

O Conecta Local pretende aproximar pessoas que procuram serviços locais de profissionais autônomos e pequenos empreendedores.

**Jornada principal:** pesquisar → descobrir → conhecer → entrar em contato.

O projeto é uma demonstração acadêmica. O sistema deverá simular fluxos coerentes com uma aplicação real, incluindo cadastro, login, gestão de serviços e moderação, mas utilizará dados fictícios. Não deverá ser apresentado como plataforma operacional para receber cadastros, credenciais ou dados pessoais reais.

O MVP não será um marketplace transacional: não intermediará pagamentos, contratos, agendamentos ou conversas internas. O contato ocorrerá diretamente entre visitante e profissional, principalmente pelo WhatsApp público informado no perfil.

## 2. Estado atual do projeto — 24/11/2026

A branch `dev` contém a demonstração acadêmica funcional do Conecta Local. O estado foi verificado no commit `d16278c5b6df6df370645b18a05dfb5ea0effe08`; o Preview Vercel correspondente está READY no deployment `dpl_AfNaMm1WqRFJa3jhhwXhfkgwPUTv`. A branch `main` permanece no commit `49354a46863d5a5eb36ce32e450b975d4087fe3b`, sem backend de negócio habilitado.

**Funcionalidades integradas em `dev`:**
- Homepage pública e catálogo de serviços com rotas `/servicos`, `/categorias` e `/servicos/:serviceId`.
- Pesquisa textual e filtros locais por categoria e cidade, considerando os municípios vinculados em `SERVICO_CIDADES`.
- Detalhes públicos do serviço com dados permitidos, contato por WhatsApp e galeria de até cinco imagens.
- Separação entre serviços publicados cadastrados e exemplos ilustrativos.
- Cadastro, confirmação demonstrativa, login/logout e sessão por cookie HttpOnly.
- Edição do perfil profissional, incluindo nome completo, nome público, WhatsApp, apresentação e cidade principal.
- Upload, substituição e remoção da foto de perfil por gateway; arquivo privado no Drive.
- Criação, edição, pausa, publicação e remoção lógica dos próprios serviços.
- Upload e gerenciamento de até cinco imagens por serviço, com controle de acesso ligado ao estado do serviço e da conta.
- Alteração de e-mail com reautenticação, código demonstrativo e revogação das sessões antigas após a confirmação.
- Gateway com Argon2id, HMAC, proteção contra replay, CSRF, validação de Origin, autorização e controle de sessão.
- Classes de domínio `Usuario`, `Profissional` e `Servico`.

**Integrações e evidências:** as PRs #28 e #29 integraram o catálogo e a entrega segura das imagens em `dev`. Em 21/11/2026, o responsável confirmou no Preview a leitura de cinco imagens de teste no Drive, bloqueio de acesso quando o serviço foi pausado, restauração após republicação e revogação da imagem removida. Em 24/11/2026, confirmou a conclusão dos testes manuais da alteração de e-mail após sincronizar/publicar o Apps Script. As validações de cada fluxo são específicas às evidências registradas; não significam homologação completa de todas as jornadas.

**Persistência operacional:** o Apps Script utiliza atualmente dez abas do Google Sheets: `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CATEGORIAS`, `CIDADES`, `SERVICOS`, `SERVICO_CIDADES`, `IMAGENS` e `AUDITORIA`. A modelagem aprovada contempla 12 abas; `CONTROLE_AUTENTICACAO` e `DENUNCIAS` ainda não possuem fluxo operacional integrado.

**Próxima evolução:** em 24/11/2026, o responsável identificou que a interface, embora funcional, possui aparência visual genérica. A próxima frente aprovada é o redesign visual/UX, documentado em `docs/PLANO_REDESIGN_INTERFACE.md`. A direção visual ainda não foi escolhida; cores, fontes e referências não devem ser presumidas.

**Limites e itens ainda não implementados:**
- Envio real de e-mail e recuperação de senha.
- Painel administrativo funcional, denúncias/moderação e gestão administrativa de categorias/cidades.
- Pesquisa geográfica, geolocalização, cálculo de distância e ordenação por proximidade.
- Auditoria de segurança independente, testes de carga e aprovação para produção.

O código de confirmação de cadastro e a alteração de e-mail são demonstrativos; não há provedor de envio real configurado. O projeto usa apenas dados fictícios e não deve receber credenciais ou dados pessoais reais.

## 3. Classificação e leitura dos requisitos

- **Decisão funcional aprovada:** comportamento escolhido para o MVP nesta rodada de levantamento.
- **Validação técnica pendente:** requisito aprovado conceitualmente, mas cuja viabilidade, segurança ou comportamento ainda precisa ser comprovado.
- **Implementado na demonstração integrada em `dev`:** funcionalidade presente no código e, quando indicado, validada manualmente no Preview. A evidência de validação é específica ao fluxo e à data informados; não presume que todas as alterações posteriores tenham sido retestadas.
- **Fora do MVP:** funcionalidade explicitamente excluída da primeira entrega.

A especificação deve ser usada como referência para a modelagem. Não transformar uma pendência técnica em decisão por conveniência nem apresentar propostas futuras como comportamento já existente.

## 4. Decisões de produto e arquitetura consolidadas

1. Visitantes podem pesquisar e visualizar serviços públicos sem criar conta.
2. Um profissional poderá manter vários serviços, sem limite numérico fixo no MVP.
3. O backend de negócio inicial será Google Apps Script; os dados ficarão em Google Sheets e as imagens em Google Drive. A Vercel Function atuará como gateway HTTP server-side entre React e Apps Script, sem assumir as regras de domínio ou a autoridade dos dados. Não foi escolhido Firebase ou outro provedor de autenticação.
4. O login pretendido utilizará e-mail e senha próprios do Conecta Local, com a lógica no Apps Script. Essa decisão é para a demonstração acadêmica com dados fictícios, não uma aprovação para receber credenciais reais ou colocar o serviço em produção.
5. A confirmação de e-mail e a recuperação de senha serão simuladas durante a demonstração, com códigos apresentados na própria interface. Não haverá envio real de e-mails nesta etapa. O fluxo deverá permitir futura integração de envio por e-mail sem redesenhar a experiência.
6. A autenticação própria só poderá ser implementada depois de provas de conceito que validem a comunicação React → Vercel Function → Apps Script, assinatura da chamada servidor-servidor, armazenamento de senha, cookie/sessão, expiração e revogação.
7. A publicação de serviços será automática após validação do backend e confirmação de que a conta está ativa.
8. Denúncias serão analisadas por administrador; o recebimento de uma denúncia não removerá automaticamente o conteúdo.
9. Não expor endereço residencial completo. Utilizar cidades e áreas de atendimento.
10. Todos os registros usados na demonstração serão fictícios e identificados como dados de exemplo.
11. Google Sheets não é banco relacional. Considerar concorrência, cotas, latência e integridade; não prometer escala de produção.

## 5. Atores e permissões

| Ator | Permissões |
|---|---|
| Visitante | Pesquisar, filtrar, visualizar serviços e perfis públicos e iniciar contato pelos canais divulgados |
| Profissional | Gerenciar o próprio perfil e somente os próprios serviços, após autenticação |
| Administrador | Gerenciar profissionais, serviços, categorias, localidades e denúncias; consultar a auditoria |

A autorização deve ser verificada no Apps Script em toda operação protegida. Nunca confiar em `role`, `userId`, `ownerId` ou estado enviados pelo navegador sem validar a identidade e a permissão no backend.

## 6. Requisitos funcionais aprovados

### 6.1. Área pública, pesquisa e resultados

- Acesso sem login.
- Pesquisa textual por nome do serviço, nome público do profissional e palavras presentes na descrição.
- Filtros por categoria, cidade e bairro/região de atendimento.
- Ordenação por relevância (quando houver termo de pesquisa) e por data de publicação mais recente.
- Não haverá filtro de preço obrigatório no escopo inicial.
- Exibir somente serviços publicados e elegíveis: o profissional precisa estar ativo e o serviço não pode estar pausado, suspenso ou removido.
- Perfis públicos devem mostrar somente os campos definidos como públicos.
- O visitante poderá iniciar contato pelo WhatsApp do profissional. O sistema não deve inventar, completar ou divulgar um número alternativo não autorizado.

### 6.2. Perfil do profissional

| Campo | Obrigatoriedade | Visibilidade |
|---|---|---|
| Nome completo | Obrigatório; 2 a 120 caracteres | Privado, para uso interno |
| Nome público | Obrigatório; 2 a 80 caracteres | Público |
| Apresentação/descrição | Obrigatória; até 500 caracteres | Pública |
| Foto de perfil | Opcional; no máximo 1 imagem | Pública quando o perfil estiver elegível |
| Cidade principal | Obrigatória; selecionada de lista cadastrada | Pública |
| Bairros/regiões atendidos | Opcionais; texto livre | Públicos |
| WhatsApp | Obrigatório | Público |
| Telefone alternativo | Opcional | Privado por padrão |
| E-mail de acesso | Obrigatório e único | Privado; não será exibido publicamente |

A conta poderá atender várias cidades e bairros. O endereço residencial completo não será solicitado nem exibido. A normalização do e-mail removerá espaços externos e tratará letras maiúsculas/minúsculas como equivalentes para fins de unicidade e login.

### 6.3. Cadastro, autenticação e conta

**Modelo escolhido para a demonstração:** autenticação própria com e-mail e senha, usando Apps Script como autoridade de negócio e Vercel Function como gateway de confiança. A implementação foi integrada em `dev` pelo PR #15 e validada manualmente em Preview em 16/11/2026, com dados fictícios. Isso não representa aprovação para produção.

**Cadastro e ativação**
1. O visitante informa os dados exigidos e uma senha.
2. A conta é criada como `pending_activation`.
3. O backend gera um código de confirmação de 6 dígitos.
4. Na demonstração, o código é exibido na interface, sem envio de e-mail.
5. O código expira em 10 minutos, aceita no máximo 5 tentativas e só pode ser utilizado uma vez.
6. Solicitações de novo código respeitam intervalo mínimo de 60 segundos e invalidam o código anterior.
7. Após confirmação válida, a conta profissional passa para `active` somente se já possuir exatamente um perfil válido em `PROFISSIONAIS`; caso contrário, permanece `pending_activation` até concluir o perfil. Contas `admin` não exigem perfil profissional. A mudança de papel que gere vínculos incompatíveis será bloqueada até tratamento seguro e auditado.

**Política de senha aprovada**
- Mínimo de 15 caracteres.
- A implementação deverá aceitar pelo menos 64 caracteres.
- Letras maiúsculas, minúsculas, números, símbolos e espaços permitidos; não exigir classes específicas.
- Rejeitar senhas comuns ou conhecidamente comprometidas.
- Não exigir troca periódica sem motivo.
- Nunca armazenar senha em texto puro, nem registrar senha em logs.
- A implementação da demonstração utiliza Argon2id via `hash-wasm@4.13.0` no gateway Node.js, com perfil `m=19456 KiB,t=2,p=1` investigado na POC-03 (mediana aproximada de 130 ms nas medições registradas). Hash, salt e identificador do algoritmo são enviados ao Apps Script; a comparação é feita no servidor com `timingSafeEqual`. Não tratar esses resultados como auditoria independente ou aprovação para produção.

**Login e tentativas**
- Respostas de erro genéricas, sem revelar se o e-mail está cadastrado.
- Contabilizar tentativas incorretas no backend.
- Após 5 falhas dentro de uma janela de contabilização de 15 minutos, aplicar bloqueio temporário de 15 minutos. O contador é controlado no backend por identificador HMAC do e-mail normalizado; login bem-sucedido reinicia o controle. Testar abuso de bloqueio malicioso contra contas.
- Login correto reinicia a contagem.
- A estratégia precisa ser testada contra bloqueio malicioso de contas; o contador não pode ser confiado ao frontend.

**Sessões**
- Expiração por 30 minutos de inatividade.
- Duração máxima de 8 horas.
- Logout invalida a sessão imediatamente.
- Alteração/recuperação de senha, suspensão ou encerramento da conta invalidam todas as sessões existentes.
- A demonstração principal utiliza o cookie `__Host-conecta_local_session` emitido pela Vercel Function com `HttpOnly; Secure; SameSite=Strict; Path=/`, sem `Domain`. O token original não é exposto ao React; o Apps Script recebe e valida seu hash. CSRF, Origin, HMAC, logout e revogação fazem parte do fluxo integrado. Em 20/11/2026, o responsável confirmou os testes do fluxo no Preview atualizado de `dev`. A POC-04 é outro experimento, independente e desabilitado; não participa dessa sessão.

**Recuperação de senha — requisito futuro, ainda não implementado**
- O profissional informa o e-mail; a resposta não deve permitir enumerar contas.
- Código de 6 dígitos, validade de 10 minutos, até 5 tentativas, uso único e intervalo de 60 segundos entre solicitações.
- Um novo código invalida o anterior.
- Durante a demonstração, o código aparece na interface. No futuro, poderá ser enviado por e-mail.
- Após validar o código, o profissional cadastra nova senha conforme a política aprovada; as sessões anteriores são invalidadas.

**Alteração de senha — requisito futuro, ainda não implementado**
- Exigir senha atual, nova senha e confirmação.
- Validar a nova senha no backend.
- Invalidar todas as sessões anteriores.
- Registrar o evento de auditoria sem armazenar senhas.

**Alteração de e-mail — requisito futuro, ainda não implementado**
- O profissional solicita a mudança autenticado.
- Verificar se o novo endereço já está em uso.
- Enviar/gerar código de confirmação de 6 dígitos para o novo endereço; na demonstração, exibir o código na interface.
- O e-mail antigo continua sendo o login até a confirmação do novo.
- Registrar a alteração na auditoria.

**Envio real de e-mail no futuro**
- Não enviar e-mails nesta etapa.
- Planejar a futura ativação para confirmação e recuperação de acesso por e-mail, mantendo os mesmos prazos e regras.
- A implementação futura deverá observar as cotas vigentes do Apps Script/MailApp e não poderá exibir códigos na interface ou registrá-los em logs.

### 6.4. Serviços

Um profissional poderá cadastrar vários serviços, sem limite numérico fixo no MVP.

**Estado atual da demonstração em `dev`:** criação, edição, pausa, publicação e remoção lógica estão integradas ao Sheets. A PR #23 adicionou `service.update` e `service.remove`, com validação de sessão/papel/propriedade no Apps Script, preservação do registro na remoção e auditoria. Em 20/11/2026, após o responsável sincronizar e publicar a versão atualizada do Apps Script, ele confirmou que os testes manuais passaram no Preview fixo atualizado de `dev`.

**Etapa 3 integrada em `dev` pela PR #25 em 20/11/2026:** o código permite múltiplos municípios por serviço via `SERVICO_CIDADES`, valida cidades no Apps Script, mantém fallback para serviços antigos sem vínculos e permite busca pública por qualquer município associado. A CI do merge (#44820409487) passou e o Preview fixo de `dev` está READY. Ainda falta sincronizar/publicar o Apps Script real e executar a validação manual ponta a ponta no Preview; portanto, a etapa está implementada no repositório, mas a validação operacional ainda não foi concluída.

| Campo | Regra |
|---|---|
| Nome do serviço | Pode ficar ausente/incompleto em `draft`; obrigatório na publicação, 5 a 100 caracteres |
| Descrição | Pode ficar ausente/incompleta em `draft`; obrigatória na publicação, até 1.000 caracteres |
| Categoria | Pode ficar ausente em `draft`; obrigatória e ativa na publicação. Uma categoria desativada posteriormente não oculta serviços já associados. |
| Cidades de atendimento | `draft` pode não ter cidade; a publicação exige pelo menos uma cidade ativa associada por `SERVICO_CIDADES`; múltiplas cidades permitidas |
| Bairros/regiões | Opcionais; texto livre |
| Preço | Modalidade obrigatória na publicação; valor obrigatório somente para preço fixo e a partir de |
| Imagens | Opcionais; até 5 por serviço; cada arquivo até 5 MB |

**Modalidades de preço**
- Preço fixo — exige valor.
- A partir de — exige valor inicial.
- Negociável — exibe “Preço a combinar”.
- Sob consulta — orienta o visitante a consultar pelo WhatsApp.
- Não informado — não exibe preço.

Valores monetários devem ser numéricos e não negativos quando a modalidade exigir valor.

**Imagens**
- Perfil: no máximo 1 imagem ativa, na posição 1.
- Serviço: até 5 imagens ativas, com posições exclusivas de 1 a 5.
- Formatos permitidos: JPG/JPEG, PNG e WebP.
- Tamanho máximo exato: 5.000.000 bytes (5 MB) por arquivo.
- Imagens removidas não ocupam posição; uma posição liberada pode ser reutilizada.
- Validar conteúdo real, tamanho, autorização, quantidade e posição no backend; não confiar apenas na extensão ou no MIME enviado pelo navegador.

**Rascunho, publicação e estados**
- Um serviço pode ser salvo como `draft` incompleto, sem cidade associada e sem categoria, nome, descrição ou modalidade de preço completos. O rascunho não aparece publicamente.
- Na publicação, nome (5–100), descrição (até 1.000), categoria ativa, modalidade/preço coerentes, conta ativa, perfil válido e pelo menos uma cidade ativa são obrigatórios. Após a validação do backend, a publicação ocorre automaticamente no fluxo de conclusão.
- `draft`: em elaboração, privado e não pesquisável.
- `published`: visível publicamente quando a conta estiver ativa e as demais regras forem satisfeitas.
- `paused`: oculto; o profissional pode reativar se não houver bloqueio administrativo.
- `suspended`: oculto por decisão administrativa; somente administrador pode reativar ou remover, com justificativa auditada.
- `removed`: removido logicamente pelo profissional ou administrador; não aparece publicamente e permanece no histórico.
- O profissional pode editar, pausar, reativar ou remover somente seus próprios serviços.
- Uma suspensão administrativa não pode ser ignorada pelo profissional.
- A suspensão/fechamento da conta oculta os serviços e restringe imagens, mas não sobrescreve o estado individual do serviço. Na reativação, somente serviços cujo estado individual continue `published` poderão voltar a aparecer.
- `publicado_em` registra a primeira publicação e é preservado em pausas e reativações.

### 6.5. Localidades e categorias

**Localidades**
- Cidade e estado serão selecionados de lista pré-cadastrada.
- O profissional poderá informar mais de uma cidade e bairros/regiões atendidos.
- Bairro/região será texto livre.
- O administrador poderá consultar e cadastrar cidades.
- Não haverá GPS, rastreamento ou divulgação de endereço residencial.

**Categorias iniciais**
1. Construção e reformas
2. Elétrica
3. Hidráulica
4. Limpeza
5. Beleza e estética
6. Tecnologia
7. Aulas e educação
8. Transporte
9. Outros

O administrador poderá cadastrar, editar, desativar e reativar categorias. Categoria inativa não poderá ser escolhida em novos serviços. Serviços existentes nessa categoria continuarão disponíveis. Exclusão definitiva somente quando não houver serviços vinculados.

### 6.6. Imagens e visibilidade no Google Drive

A decisão funcional é que o Apps Script altere as permissões dos arquivos conforme a elegibilidade. **O fluxo de upload e gerenciamento de permissões no Drive ainda não está implementado na demonstração.**
- serviço publicado e conta ativa: permitir visualização pública por link;
- serviço pausado, suspenso ou removido: restringir o arquivo;
- conta suspensa ou encerrada: restringir as imagens associadas.

O comportamento pretendido utiliza permissões equivalentes a `ANYONE_WITH_LINK`/visualização e `PRIVATE`, quando permitido pelas configurações da conta. O compartilhamento será individual por arquivo, com pasta raiz privada. A revogação será confirmada no Drive; permissões herdadas de pastas exigem atenção. O limite por arquivo é 5.000.000 bytes. Isso exige teste no Drive real antes de ser considerado implementado.

**Limitação conhecida:** uma pessoa pode copiar ou baixar uma imagem enquanto ela estiver pública. Revogar o acesso no Drive não apaga cópias já baixadas, capturas de tela ou arquivos redistribuídos. A mudança de permissão também deve ser verificada em testes de transição e falha parcial.

### 6.7. Denúncias

Qualquer visitante poderá denunciar um perfil ou serviço sem criar conta. **O recebimento e a gestão de denúncias ainda não estão implementados.**

**Motivos**
- Informações falsas.
- Serviço inexistente.
- Conteúdo inadequado.
- Suspeita de fraude.
- Anúncio duplicado.
- Outro motivo.

**Dados da denúncia**
- Alvo: perfil ou serviço (obrigatório).
- Motivo (obrigatório).
- Descrição complementar (opcional; até 500 caracteres).
- Se o motivo for “Outro”, a descrição será obrigatória.
- Anexos/imagens não serão permitidos no MVP.
- Identificação do denunciante não será obrigatória.
- Data/hora e identificador serão gerados pelo backend.

**Estados:** `received`, `in_analysis`, `valid`, `invalid`, `closed`. Os estados `valid`, `invalid` e `closed` são finais no MVP.

Cada denúncia aponta para exatamente um alvo: profissional ou serviço. O motivo `nonexistent_service` só se aplica ao alvo serviço; `other` exige descrição. `analisado_em` fica nulo em `received`/`in_analysis` e é preenchido pelo backend ao alcançar qualquer estado final (`valid`, `invalid` ou `closed`). O recebimento de denúncia não remove nem suspende automaticamente o conteúdo. Um administrador analisa, registra a decisão e aplica a ação cabível.

### 6.8. Painel administrativo e governança

O painel administrativo mínimo permitirá:
- listar, pesquisar e consultar profissionais; suspender e reativar contas;
- listar e pesquisar serviços; suspender, reativar ou remover serviços;
- consultar denúncias, analisar e registrar decisões;
- cadastrar, editar, desativar e reativar categorias;
- consultar e cadastrar cidades;
- consultar o histórico de auditoria.

**Primeiro administrador**
- Será criado manualmente pelo responsável pelo projeto, por procedimento controlado.
- O formulário público não permitirá escolher ou enviar o papel de administrador.
- Somente administrador autorizado poderá conceder esse papel a outra conta.
- Toda autorização administrativa será validada no Apps Script, nunca apenas pela interface.

**Suspensão da conta**
- A conta recebe `suspended`.
- O acesso ao painel é bloqueado e todas as sessões são invalidadas.
- Serviços ficam ocultos e imagens associadas deixam de ter acesso público.
- A reativação pelo administrador restaura a visibilidade apenas dos serviços que eram publicados e não possuem bloqueio individual.

**Suspensão individual**
- O administrador pode suspender um serviço sem suspender o profissional.
- A justificativa é obrigatória e auditada.
- O profissional não pode remover a suspensão.
- O administrador decide entre reativar ou remover o serviço.

### 6.9. Encerramento de conta e retenção

- O profissional poderá solicitar o encerramento da própria conta.
- A conta recebe `closed`; as sessões são invalidadas.
- Seus serviços deixam de aparecer publicamente e as imagens são restringidas.
- Na demonstração, os registros permanecem armazenados enquanto o projeto estiver ativo, para preservar histórico e relacionamentos.
- O administrador poderá limpar os dados fictícios por procedimento controlado.
- Essa retenção foi definida para a demonstração; uma futura versão com dados reais exigirá política própria de privacidade, retenção e exclusão, considerando a LGPD.

### 6.10. Auditoria

Registrar, no mínimo, eventos relevantes como:
- login e eventos de autenticação relevantes;
- criação de conta;
- alteração de perfil;
- criação, alteração, pausa, reativação ou remoção de serviço;
- suspensão/reativação de conta ou serviço;
- recebimento e análise/decisão de denúncia;
- alteração de categoria/localidade;
- encerramento de conta;
- ações de concessão/revogação de papel administrativo.

Cada evento deverá conter identificador, ator, ação, entidade afetada, resultado e data/hora; detalhes complementares serão estruturados e sanitizados. A aplicação tratará `AUDITORIA` como append-only: somente o backend escreve e a interface administrativa consulta sem editar. Isso não torna a planilha inviolável contra editores com acesso direto. Não registrar senhas, hashes de senha, salts, códigos, tokens, hashes de tokens, chaves ou dados pessoais desnecessários. Alterações de dados e inclusão do evento correspondente serão agrupadas no mesmo `spreadsheets.batchUpdate` do arquivo de dados. Falhas de lote não serão consideradas sucesso; tentar registrar a falha em gravação separada.

### 6.11. Comportamento e tratamento de falhas

- Exibir estados de carregamento, sucesso, vazio e erro.
- Não apresentar sucesso antes de receber confirmação do backend.
- Em falha de comunicação, preservar os dados preenchidos no formulário.
- Impedir envios duplicados por duplo clique.
- Confirmar antes de ações destrutivas ou administrativas.
- Após expiração de sessão, solicitar novo login.
- Mostrar mensagens amigáveis; detalhes técnicos ficam no log, sem segredos ou dados pessoais desnecessários.
- Cadastro, login e administração não terão funcionamento offline no MVP.

## 7. Regras gerais de validação

- Validar campos obrigatórios e limites de caracteres no React e novamente no Apps Script.
- Remover espaços externos e normalizar e-mail.
- Impedir e-mails duplicados considerando a normalização definida.
- Validar formato plausível de WhatsApp com DDD e número; o backend não pode confiar apenas em máscara visual.
- Validar categoria ativa e cidade cadastrada no momento da operação.
- Rejeitar preços negativos e valores ausentes em modalidades que exigem valor.
- Validar quantidade, tamanho e conteúdo real dos arquivos.
- Tratar descrições como texto simples; não renderizar HTML fornecido pelo usuário como conteúdo confiável.
- Verificar identidade, papel, propriedade e estado da conta no backend a cada operação protegida.
- Aplicar controle de concorrência nas operações críticas para evitar duplicidade, inconsistência de estado ou corrida entre atualizações.
- Validar unicidade simples/composta, FKs lógicas e regras condicionais no backend; Sheets não impõe integridade relacional automaticamente.
- Usar lock em operações críticas de leitura–validação–gravação; o lock não substitui atomicidade de lote.
- Operações com Drive são etapas separadas do Sheets; confirmar permissões e reconciliar falhas antes de apresentar conclusão integral.

## 8. Estados de domínio consolidados

| Entidade | Estados |
|---|---|
| Conta profissional | `pending_activation`, `active`, `suspended`, `closed` |
| Serviço | `draft`, `published`, `paused`, `suspended`, `removed` |
| Denúncia | `received`, `in_analysis`, `valid`, `invalid`, `closed` |
| Categoria | ativa / inativa |
| Arquivo de imagem | `active`, `removed`; acesso público/privado é calculado pela imagem e pelos estados do proprietário/serviço |

A conta funciona como condição superior de visibilidade. A suspensão/fechamento oculta serviços e imagens sem sobrescrever `SERVICOS.status`; na reativação, somente serviços cujo estado individual continue `published` são elegíveis. `draft` nunca é público. Categorias/cidades inativadas não retiram automaticamente serviços e vínculos existentes.

## 9. Dados da demonstração

Preparar uma base inicial fictícia, com referência sugerida:
- 8 profissionais fictícios;
- 16 a 24 serviços;
- todas as categorias iniciais;
- 3 a 5 cidades cadastradas;
- alguns exemplos de denúncias e decisões administrativas;
- 1 administrador criado manualmente.

As quantidades são uma base inicial para demonstração, não um limite de arquitetura. Identificar claramente os dados como fictícios na interface e na documentação. Não utilizar nomes, telefones, e-mails, fotos ou senhas de pessoas reais sem necessidade e autorização; preferir dados sintéticos e imagens licenciadas/adequadas.

## 10. Requisitos não funcionais

| ID | Requisito | Orientação |
|---|---|---|
| RNF-01 | Responsividade | Fluxos utilizáveis em celular e desktop |
| RNF-02 | Acessibilidade | HTML semântico, foco visível, teclado, rótulos e contraste |
| RNF-03 | Desempenho | Carregar listas e imagens proporcionalmente; evitar leituras integrais repetidas das planilhas |
| RNF-04 | Segurança | Validar entrada, identidade, propriedade e permissões no Apps Script |
| RNF-05 | Privacidade | Minimizar dados, identificar a finalidade e não expor dados privados |
| RNF-06 | Resiliência | Tratar estados de erro, falhas parciais e concorrência |
| RNF-07 | Manutenibilidade | Separar interface, API, validação e regras de negócio |
| RNF-08 | Compatibilidade | Priorizar navegadores modernos e validar a comunicação real com o Web App |

## 11. Fora do escopo do MVP

- pagamentos ou intermediação financeira;
- contratação e assinatura de contratos;
- agendamento e calendário de disponibilidade;
- chat interno;
- orçamentos complexos;
- avaliações, notas ou comentários públicos;
- favoritos e recomendações personalizadas;
- rastreamento/geolocalização em tempo real;
- aplicativo nativo Android/iOS;
- anexos em denúncias;
- envio real de e-mails durante a demonstração atual;
- funcionamento offline para operações privadas ou administrativas;
- limites de volume, analytics e relatórios avançados sem necessidade acadêmica.

## 12. Estado das validações técnicas e pendências

As provas de conceito de transporte, assinatura, armazenamento de senha e o fluxo de autenticação principal foram executadas em ambiente controlado com dados sintéticos. A existência desses controles não equivale a auditoria independente, certificação ou aprovação para Production.

1. **Comunicação e HMAC — integrados:** POC-01 e POC-02 foram integradas a `dev`; assinatura HMAC-SHA-256, timestamp, nonce e proteção contra replay possuem ensaios automatizados e manuais registrados.
2. **Armazenamento de senha — integrado à demonstração:** Argon2id via `hash-wasm@4.13.0`, perfil `m=19456 KiB,t=2,p=1`, e comparação no gateway com `timingSafeEqual`. O valor de desempenho da POC é uma medição pontual, não uma garantia de capacidade ou certificação.
3. **Sessão principal — integrada:** cookie HttpOnly/Secure/SameSite, CSRF, Origin, hash de token no Sheets, logout e revogação fazem parte do fluxo principal. O responsável confirmou a revalidação manual do fluxo principal no Preview atualizado de `dev` em 20/11/2026.
4. **POC-04 — sessão sintética independente:** integrada pela PR #14, mas permanece desabilitada e não integra o login principal. Os ensaios sintéticos foram concluídos; recursos temporários foram limpos. Dois pontos de hardening bloqueiam qualquer reativação: leitura de corpos/respostas limitada somente após leitura integral e ausência de rate limiting/limite de emissão. Não reativar.
5. **Autorização — integrada e validada em `dev`:** a PR #22 integrou autorização por papel confiável e propriedade no Apps Script. A suíte `tests/authorization/` usa o `Code.gs` real em harness Node/VM com Sheets/Properties/LockService simulados. Validações manuais registraram recusa de acesso cruzado (`SERVICE_NOT_FOUND`, HTTP 404) e de papel inadequado (`ROLE_FORBIDDEN`, HTTP 403).
6. **Ciclo de vida dos serviços — integrado:** a PR #23 integra `service.update` e `service.remove`; o proprietário é derivado da sessão, mass assignment é recusado e estados administrativos são protegidos. A remoção lógica preserva a linha em `SERVICOS` e registra evento em `AUDITORIA`. O responsável confirmou a validação manual no Preview em 20/11/2026.
7. **Persistência e integridade:** Google Sheets é utilizado para a demonstração. Não presumir transação relacional ou atomicidade entre serviços distintos. As dez abas operacionais atuais estão listadas na seção 2; `CONTROLE_AUTENTICACAO` e `DENUNCIAS` permanecem sem fluxo integrado. Gravações de negócio e auditoria não devem ser descritas como atômicas sem evidência específica.
8. **Google Drive — imagens integradas:** upload retomável e gerenciamento de até cinco imagens por serviço; foto de perfil com fluxo próprio. Arquivos privados são entregues por gateway same-origin, que mantém OAuth no servidor e revalida elegibilidade. O responsável confirmou os fluxos manuais principais de imagens de serviço e foto de perfil no Preview; a validação não representa teste de carga ou auditoria independente.
9. **Conta e e-mail — alteração integrada de forma demonstrativa:** a PR #34 implementa reautenticação com senha atual, confirmação de novo endereço, unicidade, expiração/limite de tentativas, auditoria e revogação de sessões. O responsável confirmou os testes manuais em 24/11/2026 após atualização do Apps Script. O código é exibido na interface e não há envio real de e-mail. Recuperação de senha ainda não está implementada.
10. **Catálogo público — integrado:** PRs #28 e #29 implementam homepage, catálogo, categorias, detalhes, galeria e entrega segura das imagens. A integração real de imagens foi validada manualmente no Preview em 21/11/2026. Os detalhes da evidência e os critérios de interface ainda não homologados estão em `docs/PLANO_CATALOGO_PUBLICO_E_NAVEGACAO.md`.
11. **Design visual — próxima frente:** o responsável considera a aparência atual genérica. O redesign visual/UX está planejado em `docs/PLANO_REDESIGN_INTERFACE.md`; ainda não foi iniciado e não altera os requisitos funcionais do MVP.
12. **Limites operacionais:** não há auditoria independente, teste de carga ou aprovação de segurança para produção. Antes de qualquer uso fora da demonstração, seriam necessárias revisões de cotas, latência, concorrência, backup, monitoramento, privacidade, retenção e resposta a incidentes.

**Critério de bloqueio:** manter a demonstração restrita ao Preview, com dados fictícios. Não habilitar o backend em Production nem aceitar credenciais/dados pessoais reais. Registrar evidências por ambiente e data; não declarar testes manuais concluídos sem executá-los.

## 13. Pesquisa de campo e limitações acadêmicas

A hipótese de problema local ainda deve ser validada, se o prazo permitir, por conversas simples com profissionais e pessoas que contratam serviços. Registrar quantidade de participantes, perguntas, respostas resumidas e limitações, sem publicar dados pessoais.

Se a pesquisa não for realizada, registrar essa limitação no trabalho e apresentar os requisitos como hipóteses de projeto, não como necessidades locais comprovadas.

## 14. Fase 3 — Modelagem lógica consolidada

A modelagem lógica está consolidada em [`MODELAGEM_DADOS.md`](./MODELAGEM_DADOS.md). O documento define 12 entidades e 102 campos, UUIDs, relacionamentos, cardinalidades, estados, unicidade, integridade, visibilidade, auditoria e estratégia de persistência no Sheets/Drive.

## 15. Fase 4 — Esquema físico consolidado

O esquema físico das 12 abas foi aprovado conceitualmente e também está documentado em [`MODELAGEM_DADOS.md`](./MODELAGEM_DADOS.md), na seção 11. Foram definidos o nome e a ordem das abas, a ordem e o nome das 102 colunas, os tipos de célula, os campos opcionais, os valores controlados, os relacionamentos, as validações e as regras de proteção.

A estrutura planejada contém um único arquivo Google Sheets com 12 abas. O arquivo estrutural foi criado pelo responsável pelo projeto e sua exportação foi conferida; as abas e cabeçalhos estão presentes. Isso não significa que os registros sintéticos, o backend Apps Script ou as integrações com Drive tenham sido implementados.

**Estado em 20/11/2026:** modelagem e planilha estrutural estão concluídas; o backend da demonstração utiliza oito abas e o fluxo principal de cadastro/login/serviços foi implementado e revalidado pelo responsável no Preview atualizado de `dev`. A PR #14 também foi integrada, mantendo a POC-04 desabilitada e independente. As próximas etapas recomendadas estão priorizadas em `docs/ROADMAP_ESTUDOS.md`; Drive, administração, denúncias, recuperação de senha e demais requisitos permanecem como evolução opcional, não como pré-requisito para a demonstração acadêmica.

