# Especificação funcional do MVP — Conecta Local

> **Status:** levantamento funcional consolidado; revisão documental e validações técnicas pendentes  
> **Versão:** 0.2  
> **Data da consolidação:** 2026-11-09  
> **Escopo:** requisitos funcionais, regras de negócio, dados demonstrativos e critérios técnicos para o MVP acadêmico.  
> **Importante:** decisões registradas neste documento descrevem o comportamento desejado. Elas não significam que as funcionalidades já estejam implementadas.

## 1. Objetivo e contexto

O Conecta Local pretende aproximar pessoas que procuram serviços locais de profissionais autônomos e pequenos empreendedores.

**Jornada principal:** pesquisar → descobrir → conhecer → entrar em contato.

O projeto é uma demonstração acadêmica. O sistema deverá simular fluxos coerentes com uma aplicação real, incluindo cadastro, login, gestão de serviços e moderação, mas utilizará dados fictícios. Não deverá ser apresentado como plataforma operacional para receber cadastros, credenciais ou dados pessoais reais.

O MVP não será um marketplace transacional: não intermediará pagamentos, contratos, agendamentos ou conversas internas. O contato ocorrerá diretamente entre visitante e profissional, principalmente pelo WhatsApp público informado no perfil.

## 2. Estado atual do projeto

A branch \`dev\` contém uma homepage demonstrativa em React + Vite. A busca e os filtros atuais funcionam somente sobre dados ilustrativos no frontend; o campo de cidade ainda não realiza pesquisa geográfica.

Ainda não estão implementados ou integrados:
- cadastro e autenticação de profissionais;
- backend/API operacional;
- Google Sheets como armazenamento operacional;
- Google Drive para uploads reais;
- pesquisa remota;
- perfis e serviços reais;
- painel do profissional ou painel administrativo;
- denúncias e moderação operacionais;
- envio de e-mails.

A arquitetura planejada é React/Vite → Google Apps Script → Google Sheets/Drive. A especificação consolida as decisões funcionais, mas a arquitetura e principalmente a autenticação ainda exigem prova de conceito técnica antes da implementação.

## 3. Classificação e leitura dos requisitos

- **Decisão funcional aprovada:** comportamento escolhido para o MVP nesta rodada de levantamento.
- **Validação técnica pendente:** requisito aprovado conceitualmente, mas cuja viabilidade, segurança ou comportamento ainda precisa ser comprovado.
- **Implementado:** funcionalidade presente no código e validada. Nenhum dos fluxos de backend descritos neste documento deve ser considerado implementado por estar especificado.
- **Fora do MVP:** funcionalidade explicitamente excluída da primeira entrega.

A especificação deve ser usada como referência para a modelagem. Não transformar uma pendência técnica em decisão por conveniência nem apresentar propostas futuras como comportamento já existente.

## 4. Decisões de produto e arquitetura consolidadas

1. Visitantes podem pesquisar e visualizar serviços públicos sem criar conta.
2. Um profissional poderá manter vários serviços, sem limite numérico fixo no MVP.
3. O backend inicial será Google Apps Script; os dados ficarão planejados em Google Sheets e as imagens em Google Drive. Não foi escolhido Firebase ou outro provedor de autenticação.
4. O login pretendido utilizará e-mail e senha próprios do Conecta Local, com a lógica no Apps Script. Essa decisão é para a demonstração acadêmica com dados fictícios, não uma aprovação para receber credenciais reais ou colocar o serviço em produção.
5. A confirmação de e-mail e a recuperação de senha serão simuladas durante a demonstração, com códigos apresentados na própria interface. Não haverá envio real de e-mails nesta etapa. O fluxo deverá permitir futura integração de envio por e-mail sem redesenhar a experiência.
6. A autenticação própria só poderá ser implementada depois de uma prova de conceito que valide armazenamento de senha, sessão, expiração, revogação e comunicação React–Apps Script.
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

A autorização deve ser verificada no Apps Script em toda operação protegida. Nunca confiar em \`role\`, \`userId\`, \`ownerId\` ou estado enviados pelo navegador sem validar a identidade e a permissão no backend.

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

**Modelo escolhido para a demonstração:** autenticação própria com e-mail e senha, implementada no Apps Script, sem Firebase ou outro provedor. A aprovação é funcional e acadêmica; os mecanismos criptográficos e o gerenciamento de sessão continuam bloqueados por validação técnica.

**Cadastro e ativação**
1. O visitante informa os dados exigidos e uma senha.
2. A conta é criada como \`pending_activation\`.
3. O backend gera um código de confirmação de 6 dígitos.
4. Na demonstração, o código é exibido na interface, sem envio de e-mail.
5. O código expira em 10 minutos, aceita no máximo 5 tentativas e só pode ser utilizado uma vez.
6. Solicitações de novo código respeitam intervalo mínimo de 60 segundos e invalidam o código anterior.
7. Após confirmação válida, a conta passa para \`active\` e o profissional poderá acessar o painel.

**Política de senha aprovada**
- Mínimo de 15 caracteres.
- A implementação deverá aceitar pelo menos 64 caracteres.
- Letras maiúsculas, minúsculas, números, símbolos e espaços permitidos; não exigir classes específicas.
- Rejeitar senhas comuns ou conhecidamente comprometidas.
- Não exigir troca periódica sem motivo.
- Nunca armazenar senha em texto puro, nem registrar senha em logs.
- O algoritmo e os parâmetros de armazenamento ainda não foram aprovados tecnicamente.

**Login e tentativas**
- Respostas de erro genéricas, sem revelar se o e-mail está cadastrado.
- Contabilizar tentativas incorretas no backend.
- Após 5 tentativas consecutivas incorretas, aplicar bloqueio temporário de 15 minutos.
- Login correto reinicia a contagem.
- A estratégia precisa ser testada contra bloqueio malicioso de contas; o contador não pode ser confiado ao frontend.

**Sessões**
- Expiração por 30 minutos de inatividade.
- Duração máxima de 8 horas.
- Logout invalida a sessão imediatamente.
- Alteração/recuperação de senha, suspensão ou encerramento da conta invalidam todas as sessões existentes.
- A forma segura de transportar e armazenar o identificador de sessão no navegador permanece pendente de prova de conceito. Não escolher \`localStorage\`, \`sessionStorage\` ou cookie sem avaliar XSS, CORS, redirecionamentos e as limitações do Web App do Apps Script.

**Recuperação de senha**
- O profissional informa o e-mail; a resposta não deve permitir enumerar contas.
- Código de 6 dígitos, validade de 10 minutos, até 5 tentativas, uso único e intervalo de 60 segundos entre solicitações.
- Um novo código invalida o anterior.
- Durante a demonstração, o código aparece na interface. No futuro, poderá ser enviado por e-mail.
- Após validar o código, o profissional cadastra nova senha conforme a política aprovada; as sessões anteriores são invalidadas.

**Alteração de senha**
- Exigir senha atual, nova senha e confirmação.
- Validar a nova senha no backend.
- Invalidar todas as sessões anteriores.
- Registrar o evento de auditoria sem armazenar senhas.

**Alteração de e-mail**
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

| Campo | Regra |
|---|---|
| Nome do serviço | Obrigatório; 5 a 100 caracteres |
| Descrição | Obrigatória; até 1.000 caracteres |
| Categoria | Obrigatória e ativa no momento do cadastro |
| Cidades de atendimento | Pelo menos uma; selecionar da lista cadastrada; múltiplas cidades permitidas |
| Bairros/regiões | Opcionais; texto livre |
| Preço | Opcional; uma modalidade entre as opções aprovadas |
| Imagens | Opcionais; até 5 por serviço; cada arquivo até 5 MB |

**Modalidades de preço**
- Preço fixo — exige valor.
- A partir de — exige valor inicial.
- Negociável — exibe “Preço a combinar”.
- Sob consulta — orienta o visitante a consultar pelo WhatsApp.
- Não informado — não exibe preço.

Valores monetários devem ser numéricos e não negativos quando a modalidade exigir valor.

**Imagens**
- Perfil: até 1 foto.
- Serviço: até 5 imagens.
- Formatos permitidos: JPG/JPEG, PNG e WebP.
- Tamanho máximo: 5 MB por arquivo.
- Validar tipo real do conteúdo, tamanho, autorização e quantidade no backend; não confiar apenas na extensão ou no MIME enviado pelo navegador.

**Publicação e estados**
- Serviço válido de profissional ativo é publicado automaticamente após validação no backend.
- \`published\`: visível publicamente se a conta estiver ativa.
- \`paused\`: oculto publicamente; o profissional pode reativar.
- \`suspended\`: oculto por decisão administrativa; somente administrador pode reativar ou remover e deve registrar justificativa.
- \`removed\`: removido logicamente pelo profissional ou administrador; não aparece publicamente e permanece no histórico da demonstração.
- O profissional pode editar, pausar, reativar ou remover somente seus próprios serviços.
- Uma suspensão administrativa não pode ser ignorada pelo profissional.
- A suspensão da conta oculta os serviços e revoga suas permissões públicas de imagem. Ao reativar a conta, somente serviços que estavam publicados e não estejam individualmente pausados, suspensos ou removidos poderão voltar a aparecer. A modelagem deverá preservar o estado anterior à suspensão da conta.

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

A decisão funcional é que o Apps Script altere as permissões dos arquivos conforme a elegibilidade:
- serviço publicado e conta ativa: permitir visualização pública por link;
- serviço pausado, suspenso ou removido: restringir o arquivo;
- conta suspensa ou encerrada: restringir as imagens associadas.

O comportamento pretendido utiliza permissões equivalentes a \`ANYONE_WITH_LINK\`/visualização e \`PRIVATE\`, quando permitido pelas configurações da conta. Isso exige teste no Drive real antes de ser considerado implementado.

**Limitação conhecida:** uma pessoa pode copiar ou baixar uma imagem enquanto ela estiver pública. Revogar o acesso no Drive não apaga cópias já baixadas, capturas de tela ou arquivos redistribuídos. A mudança de permissão também deve ser verificada em testes de transição e falha parcial.

### 6.7. Denúncias

Qualquer visitante poderá denunciar um perfil ou serviço sem criar conta.

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

**Estados:** \`received\`, \`in_analysis\`, \`valid\`, \`invalid\`, \`closed\`.

O recebimento de denúncia não remove nem suspende automaticamente o conteúdo. Um administrador analisa, registra a decisão e aplica a ação cabível.

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
- A conta recebe \`suspended\`.
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
- A conta recebe \`closed\`; as sessões são invalidadas.
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

Cada evento deverá conter identificador, ator, ação, entidade afetada e data/hora. Não registrar senhas, códigos de confirmação, tokens, segredos ou conteúdo sensível desnecessário. O histórico não poderá ser editado por profissionais; somente administradores autorizados poderão consultá-lo no painel.

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

## 8. Estados de domínio consolidados

| Entidade | Estados |
|---|---|
| Conta profissional | \`pending_activation\`, \`active\`, \`suspended\`, \`closed\` |
| Serviço | \`published\`, \`paused\`, \`suspended\`, \`removed\` |
| Denúncia | \`received\`, \`in_analysis\`, \`valid\`, \`invalid\`, \`closed\` |
| Categoria | ativa / inativa |
| Arquivo de imagem | visível por link / privado, conforme estado elegível |

A conta funciona como condição superior de visibilidade. A modelagem deverá preservar o estado individual do serviço durante suspensão/encerramento da conta para não reativar indevidamente serviços pausados, suspensos ou removidos.

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

## 12. Validações técnicas obrigatórias antes da autenticação

A escolha funcional por Apps Script + e-mail/senha próprios não encerra a análise técnica. Antes de integrar autenticação, fazer uma prova de conceito isolada com dados sintéticos para validar:

1. **Hash de senha:** Apps Script não deve armazenar senha em texto puro nem usar um digest rápido isolado como substituto de um KDF de senha. A referência oficial de \`Utilities\` documenta digest e HMAC; não se deve presumir a existência de uma função nativa pronta para Argon2id, scrypt ou PBKDF2. Avaliar uma implementação PBKDF2-HMAC-SHA-256 revisada e testada, ou uma estratégia demonstrativa mais restrita que não seja confundida com segurança de produção. Validar salt individual, parâmetros, comparação segura e desempenho.
2. **Sessão no navegador:** comprovar como token/sessão será transportado, persistido, renovado, expirado e revogado. A referência de \`TextOutput\` documenta métodos de conteúdo/MIME, mas não oferece método documentado para configurar cabeçalhos arbitrários; não presumir que seja possível configurar \`HttpOnly\`/cookies apenas com TextOutput. Avaliar redirecionamentos do Content Service, CORS e exposição a XSS antes de escolher armazenamento no navegador.
3. **Concorrência e bloqueios:** validar contadores de tentativas, bloqueio de 15 minutos, limites de códigos e operações concorrentes. Evitar que um terceiro consiga bloquear uma conta indefinidamente por abuso da regra de tentativas.
4. **Autorização:** testar que usuário comum não consegue alterar papel, proprietário ou estado enviando payload manipulado; testar acesso cruzado entre profissionais.
5. **Google Drive:** validar a troca entre acesso por link e privado em arquivos individuais, falhas parciais e a política da conta. Confirmar que esconder a URL na interface não é tratado como controle de acesso.
6. **Integração:** testar CORS/POST/JSON, tempo de resposta, quotas, limites de execução e tratamento de exceções do Apps Script.
7. **E-mail futuro:** quando for ativado, revisar permissões, remetente, quotas e tratamento de falha de envio. O fluxo demonstrativo não deve exibir códigos em produção.

**Critério de bloqueio:** se a prova de conceito não conseguir atender aos requisitos mínimos, não implementar autenticação própria por improviso. Registrar a limitação e reapresentar alternativas antes de prosseguir.

Referências técnicas oficiais para a prova de conceito:
- [Apps Script — Utilities](https://developers.google.com/apps-script/reference/utilities/utilities)
- [Apps Script — TextOutput](https://developers.google.com/apps-script/reference/content/text-output)
- [Apps Script — Drive Access](https://developers.google.com/apps-script/reference/drive/access)
- [Apps Script — Cotas e limites](https://developers.google.com/apps-script/guides/services/quotas)
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html)

## 13. Pesquisa de campo e limitações acadêmicas

A hipótese de problema local ainda deve ser validada, se o prazo permitir, por conversas simples com profissionais e pessoas que contratam serviços. Registrar quantidade de participantes, perguntas, respostas resumidas e limitações, sem publicar dados pessoais.

Se a pesquisa não for realizada, registrar essa limitação no trabalho e apresentar os requisitos como hipóteses de projeto, não como necessidades locais comprovadas.

## 14. Critérios para iniciar a Fase 3 — Modelagem de dados

O levantamento funcional está consolidado para orientar a modelagem. Antes de implementar o backend, a Fase 3 deverá definir:

- entidades e campos derivados dos requisitos aprovados;
- UUIDs e relacionamentos;
- estados e transições, incluindo suspensão de conta versus estado individual do serviço;
- abas do Google Sheets, unicidade, integridade e concorrência;
- referências dos arquivos no Drive e regras de permissão;
- dados sintéticos iniciais;
- operações/endpoints e regras de autorização do Apps Script.

A modelagem deve evitar criar campos e entidades sem requisito correspondente. A prova de conceito de autenticação deve ocorrer antes de considerar esse fluxo pronto para integração.

