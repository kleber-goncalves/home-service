# Especificação funcional do MVP — Conecta Local

> **Status:** rascunho inicial para revisão  
> **Versão:** 0.1  
> **Escopo:** levantamento e organização dos requisitos funcionais e não funcionais do MVP  
> **Regra de leitura:** este documento não transforma hipóteses ou propostas em decisões definitivas. Os itens estão classificados para deixar explícito o que já foi decidido e o que ainda precisa de validação.

## 1. Objetivo

Definir o comportamento esperado da primeira versão funcional do Conecta Local antes de modelar as planilhas e implementar o backend.

O produto pretende aproximar moradores que procuram serviços locais de profissionais autônomos e pequenos empreendedores que desejam divulgar o próprio trabalho.

**Jornada principal:** pesquisar → descobrir → conhecer → entrar em contato.

O MVP deve demonstrar essa jornada com dados reais cadastrados, sem assumir responsabilidades de intermediação comercial, pagamento, contratação ou agendamento.

## 2. Contexto e estado atual

A branch `dev` contém uma homepage demonstrativa em React + Vite. A busca e os filtros atuais operam sobre dados ilustrativos no frontend. O campo de cidade ainda não realiza pesquisa geográfica.

Até a elaboração desta especificação, não estão integrados:
- cadastro real de profissionais;
- autenticação;
- API ou backend operacional;
- Google Sheets como armazenamento;
- Google Drive para imagens reais;
- painel do profissional ou painel administrativo;
- contatos reais de prestadores.

A arquitetura planejada inicialmente é React/Vite → Google Apps Script → Google Sheets/Drive. Essa arquitetura ainda precisará ser detalhada e validada na etapa técnica.

## 3. Classificação dos requisitos

Os requisitos são classificados por prioridade:

- **P0 — essencial:** necessário para demonstrar a jornada central do MVP.
- **P1 — importante:** necessário para uma operação minimamente administrável ou para completar a experiência, mas pode ser implementado após o núcleo.
- **Fora do MVP:** explicitamente excluído da primeira versão.

E também por situação:

- **Decisão registrada:** orientação já presente no contexto do projeto.
- **Proposta:** requisito sugerido neste documento, sujeito à revisão.
- **Pendente:** depende de escolha ou validação antes da implementação.

## 4. Decisões de produto já registradas

Os pontos abaixo já constam no contexto do projeto e devem ser preservados, salvo revisão explícita:

1. A área pública deve permitir descobrir serviços sem exigir conta.
2. O profissional deverá ter uma área autenticada para administrar seus próprios dados e serviços.
3. O contato deverá ocorrer diretamente entre interessado e profissional, preferencialmente por WhatsApp, conforme o contato que o profissional decidir disponibilizar.
4. A primeira versão não será um sistema de pagamentos, contratação, orçamento complexo ou agendamento.
5. Serviços que passarem pelas validações obrigatórias poderão ser publicados automaticamente, sem aprovação manual prévia.
6. A publicação automática deverá ser acompanhada por mecanismos de denúncia e moderação posterior.
7. O profissional só poderá gerenciar os próprios registros; o servidor deverá conferir identidade e autorização.
8. Identificadores estáveis (UUID ou equivalente) deverão ser usados nos relacionamentos, e não números de linha das planilhas.
9. Não expor endereço residencial completo sem necessidade. Priorizar cidade e área de atendimento.
10. Google Apps Script, Sheets e Drive são opções planejadas para o primeiro backend, não integrações já existentes.
11. A solução de autenticação e a estratégia segura de entrega das imagens continuam pendentes.

## 5. Atores e permissões esperadas

| Ator | Objetivo | Permissões esperadas |
|---|---|---|
| Visitante | Encontrar um serviço | Pesquisar, filtrar e visualizar informações públicas; iniciar contato por canal divulgado |
| Profissional | Divulgar e gerenciar seus serviços | Criar conta, manter o próprio perfil e gerenciar somente os próprios serviços |
| Administrador | Manter a qualidade da plataforma | Gerenciar categorias e moderar contas, serviços e denúncias, conforme permissões administrativas |

**Regra de segurança:** a interface pode ocultar ações, mas a autorização precisa ser aplicada no backend. Não confiar em `role`, `userId`, `ownerId` ou estado enviados pelo navegador sem validação confiável.

## 6. Requisitos funcionais propostos

### 6.1. Área pública

| ID | Prioridade | Requisito | Critério de aceite |
|---|---|---|---|
| RF-PUB-01 | P0 | Permitir visualizar a página pública sem autenticação | Um visitante acessa a página sem criar conta |
| RF-PUB-02 | P0 | Listar serviços publicados e disponíveis | A listagem não apresenta serviços pausados, suspensos ou removidos |
| RF-PUB-03 | P0 | Pesquisar serviços por texto | A pesquisa considera, no mínimo, o título do serviço; os campos adicionais serão definidos na revisão |
| RF-PUB-04 | P0 | Filtrar serviços por categoria | Ao selecionar uma categoria, somente serviços compatíveis são exibidos; deve existir forma clara de remover o filtro |
| RF-PUB-05 | P0 | Abrir detalhes de um serviço | A tela apresenta as informações públicas do serviço e permite identificar o profissional responsável |
| RF-PUB-06 | P0 | Exibir perfil público do profissional | O visitante visualiza somente informações marcadas para divulgação |
| RF-PUB-07 | P0 | Permitir iniciar contato com o profissional | O link de contato usa um canal informado e validado; não deve inventar ou completar números |
| RF-PUB-08 | P1 | Filtrar por cidade ou área de atendimento | O resultado considera uma localidade/área cadastrada, sem exigir GPS ou localização em tempo real |

**Observação sobre localidade:** a busca por cidade/área é uma necessidade de produto prevista, mas a unidade geográfica, a regra de correspondência e a forma de cadastro precisam ser confirmadas. O campo de cidade atualmente exibido na homepage é apenas demonstrativo.

### 6.2. Cadastro e acesso do profissional

| ID | Prioridade | Requisito | Critério de aceite |
|---|---|---|---|
| RF-ACC-01 | P0 | Permitir que um profissional crie uma conta | O cadastro só é concluído após validação dos dados e do mecanismo de autenticação escolhido |
| RF-ACC-02 | P0 | Permitir que o profissional acesse sua área autenticada | Usuário não autenticado não acessa operações privadas |
| RF-ACC-03 | P0 | Permitir manter informações do perfil profissional | O usuário autenticado altera somente o próprio perfil |
| RF-ACC-04 | P0 | Permitir encerrar a sessão | Após sair, operações privadas exigem nova autenticação |
| RF-ACC-05 | P1 | Permitir solicitar recuperação de acesso | O fluxo usa o mecanismo escolhido para autenticação; não expõe dados que facilitem enumeração de contas |

**Pendente crítico:** escolher a solução de autenticação. Não implementar armazenamento improvisado de senhas no Google Sheets, nem senha em texto puro ou hash caseiro.

### 6.3. Gerenciamento dos serviços

| ID | Prioridade | Requisito | Critério de aceite |
|---|---|---|---|
| RF-SRV-01 | P0 | Cadastrar um serviço vinculado ao profissional autenticado | O backend define o proprietário a partir da identidade autenticada, não de um ID livre enviado pelo cliente |
| RF-SRV-02 | P0 | Editar um serviço próprio | O backend recusa a alteração de serviço pertencente a outro profissional |
| RF-SRV-03 | P0 | Pausar ou reativar um serviço próprio | Serviços pausados deixam de aparecer na busca pública |
| RF-SRV-04 | P0 | Excluir ou solicitar remoção de serviço próprio | A regra de exclusão lógica/física será definida na modelagem; o serviço removido não aparece publicamente |
| RF-SRV-05 | P0 | Associar o serviço a uma categoria válida | O backend rejeita categoria inexistente ou indisponível |
| RF-SRV-06 | P1 | Vincular imagens ao perfil ou serviço | O upload respeita limites de tamanho, formato, quantidade e autorização ainda a definir |
| RF-SRV-07 | P0 | Publicar automaticamente após validações | Um serviço válido de uma conta habilitada pode ser exibido sem aprovação manual prévia |

A lista exata de campos obrigatórios e opcionais ainda precisa ser aprovada. Não presumir preço, endereço, disponibilidade, certificação ou outros dados como obrigatórios sem decisão.

### 6.4. Administração e moderação

| ID | Prioridade | Requisito | Critério de aceite |
|---|---|---|---|
| RF-ADM-01 | P1 | Gerenciar categorias disponíveis | Somente administrador autorizado cria, altera, desativa ou reativa categorias |
| RF-ADM-02 | P1 | Receber denúncias de serviços ou perfis | Um visitante consegue encaminhar uma denúncia sem receber acesso a dados privados |
| RF-ADM-03 | P1 | Analisar e encerrar denúncias | Administrador autorizado registra decisão e estado da denúncia |
| RF-ADM-04 | P1 | Suspender ou remover conteúdo inadequado | O conteúdo suspenso/removido deixa de ser público e a ação fica rastreável |
| RF-ADM-05 | P1 | Restringir funções administrativas | Usuário comum e profissional não executam operações administrativas |

**Risco de produto:** publicação automática sem mecanismo mínimo de denúncia/moderação pode deixar conteúdo inadequado exposto. Antes de abrir o cadastro ao público, definir como a moderação será operada, mesmo que a primeira versão use um processo administrativo simples.

## 7. Regras de negócio iniciais

As regras abaixo consolidam decisões existentes e propostas que precisam ser confirmadas:

1. Visitantes podem pesquisar e visualizar serviços públicos sem autenticação.
2. Somente serviços em estado publicável são exibidos.
3. Cada serviço pertence a um profissional identificado no backend.
4. Um profissional só pode criar, editar, pausar, reativar ou remover os próprios serviços.
5. A categoria precisa existir e estar ativa para ser vinculada a um serviço.
6. A publicação automática depende de conta habilitada e de todos os campos obrigatórios válidos.
7. Pausar um serviço deve removê-lo das listagens públicas sem apagar necessariamente seu histórico.
8. Suspensão administrativa deve prevalecer sobre a ação de reativação feita pelo profissional.
9. Contatos e dados pessoais só podem ser exibidos conforme finalidade e autorização do titular.
10. A plataforma não deve sugerir que verificou identidade, qualificação, reputação ou avaliações sem processo real de verificação.
11. Falhas de integração não podem ser apresentadas como sucesso ao usuário.
12. A validação no frontend melhora a experiência, mas não substitui a validação e a autorização no backend.

### 7.1. Estados sugeridos para análise

Os nomes abaixo são uma proposta conceitual para a modelagem, não um contrato definitivo:

- **Serviço:** rascunho, publicado, pausado, suspenso, removido.
- **Conta profissional:** pendente de ativação, ativa, suspensa, encerrada.
- **Denúncia:** recebida, em análise, procedente, improcedente, encerrada.

Revisar se todos esses estados são realmente necessários. Evitar estados redundantes e transições sem utilidade para o escopo acadêmico.

## 8. Requisitos não funcionais

| ID | Requisito | Critério ou orientação |
|---|---|---|
| RNF-01 | Responsividade | Fluxos públicos e privados utilizáveis em celular e desktop, sem rolagem horizontal acidental |
| RNF-02 | Acessibilidade | HTML semântico, foco visível, navegação por teclado, rótulos e contraste adequado |
| RNF-03 | Desempenho | Carregar listas e imagens de forma proporcional ao tamanho do projeto; evitar transferir todas as imagens originais de uma vez |
| RNF-04 | Segurança | Validar entrada, identidade, propriedade e permissões no backend |
| RNF-05 | Privacidade | Coletar o mínimo necessário, informar finalidade e evitar exposição de dados pessoais |
| RNF-06 | Resiliência | Exibir estados de carregamento, vazio, sucesso e erro; tratar falhas de rede sem expor detalhes internos |
| RNF-07 | Manutenibilidade | Manter separação entre interface, serviços de API, validação e regras de negócio |
| RNF-08 | Compatibilidade | Priorizar navegadores modernos e testar ao menos os navegadores disponíveis no ambiente de desenvolvimento |

O uso de Apps Script e Sheets exige considerar cotas, concorrência, latência e integridade. Não anunciar a solução como pronta para grande escala.

## 9. Fora do escopo do MVP

Não implementar na primeira versão sem justificativa e revisão de escopo:

- pagamentos ou intermediação financeira;
- contratação ou assinatura de contratos;
- agendamento e calendário de disponibilidade;
- chat interno;
- sistema avançado de orçamentos e propostas;
- avaliações, notas ou comentários públicos;
- favoritos e recomendações personalizadas;
- rastreamento ou geolocalização em tempo real;
- aplicativo nativo para Android/iOS;
- automações ou integrações complexas sem necessidade demonstrada.

## 10. Questões que precisam de decisão

Estas perguntas bloqueiam ou influenciam a modelagem e a implementação. Não devem ser respondidas por suposição:

### Produto e cadastro
1. O profissional poderá cadastrar vários serviços? A proposta é **sim**, mas precisa ser confirmada.
2. Quais campos serão obrigatórios no perfil profissional?
3. Quais campos serão obrigatórios em cada serviço?
4. O preço será exibido? Será valor fixo, “a combinar” ou campo opcional?
5. Quais canais de contato serão aceitos: somente WhatsApp ou também telefone/e-mail?
6. O profissional poderá atender várias cidades ou bairros? Como isso será representado?
7. Quantas imagens poderão ser enviadas por perfil e por serviço?

### Acesso e governança
8. Qual mecanismo de autenticação será utilizado?
9. Como será criado e protegido o primeiro usuário administrador?
10. O profissional poderá excluir a conta? Como serão tratados os serviços e dados associados?
11. Quais motivos de denúncia serão disponibilizados e quem fará a moderação?

### Operação e dados
12. Qual será a região inicial atendida e como será padronizada a localidade?
13. Qual o limite de tamanho e os formatos permitidos para imagens?
14. Por quanto tempo os registros de conta, serviço e denúncia serão mantidos?
15. Quais dados serão demonstrativos durante a apresentação acadêmica e como ficarão identificados?

## 11. Validação com usuários e pesquisa de campo

A hipótese de problema local ainda não foi comprovada. Recomenda-se uma validação simples antes de fechar todos os campos e regras:

- conversar com alguns profissionais autônomos e pequenos empreendedores;
- conversar com pessoas que contratam serviços locais;
- descobrir como divulgam/procuram serviços atualmente;
- identificar quais informações são essenciais para decidir entrar em contato;
- testar se a proposta de catálogo regional resolve uma dificuldade real.

A pesquisa pode ser pequena e compatível com o prazo acadêmico. Registrar quantidade de participantes, perguntas, respostas resumidas e limitações. Não publicar nomes, telefones ou dados pessoais dos participantes sem necessidade e autorização.

Caso não seja possível realizar pesquisa, registrar explicitamente essa limitação no trabalho acadêmico e tratar os requisitos como hipóteses, não como necessidades comprovadas.

## 12. Critérios para considerar a especificação pronta

Antes da modelagem de dados e dos contratos da API, revisar e aprovar:

- [ ] campos obrigatórios do perfil profissional;
- [ ] campos obrigatórios do serviço;
- [ ] regra de múltiplos serviços por profissional;
- [ ] categorias e localidade/área de atendimento;
- [ ] política de contato público;
- [ ] fluxo de cadastro e autenticação;
- [ ] estados de conta e serviço;
- [ ] publicação automática e validações que a permitem;
- [ ] fluxo mínimo de denúncia e moderação;
- [ ] estratégia de imagens;
- [ ] requisitos de privacidade e exclusão de dados.

Não é necessário criar uma especificação empresarial extensa. O objetivo é eliminar ambiguidades suficientes para evitar retrabalho na planilha, no Apps Script e nas telas.

## 13. Próxima etapa

Após revisar e decidir os itens pendentes, avançar para **Fase 3 — Modelagem dos dados**, definindo:

1. entidades e campos realmente necessários;
2. identificadores e relacionamentos;
3. estados e regras de transição;
4. abas do Google Sheets e integridade entre registros;
5. estratégia de imagens e referências do Google Drive.

A modelagem deverá derivar dos requisitos aprovados, não antecipar decisões de autenticação ou infraestrutura ainda em aberto.
