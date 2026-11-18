# Relatório Integrador do Projeto — Conecta Local

**Projeto:** Conecta Local (repositório `home-service`)  
**Natureza:** projeto acadêmico de desenvolvimento web  
**Versão do documento:** 1.0  
**Data de consolidação:** 17 de novembro de 2026  
**Base técnica analisada:** branches `dev` e `main`, commit `49354a46863d5a5eb36ce32e450b975d4087fe3b` (18/11/2026)  
**Ambiente de demonstração:** Vercel Preview — `https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app`

> **Finalidade:** apresentar como o Conecta Local atende às oito etapas solicitadas na atividade integradora: investigação, dados, APS, LOO, PI, segurança, testes e viabilidade. O documento diferencia funcionalidades implementadas, decisões de projeto, evidências existentes e atividades ainda pendentes.

---

## Resumo executivo

O **Conecta Local** é uma plataforma web regional proposta para aproximar pessoas que procuram serviços locais de profissionais autônomos e pequenos empreendedores. A experiência principal é: **pesquisar → descobrir → conhecer → entrar em contato**. O sistema funciona como uma vitrine de serviços; o contato é realizado diretamente com o profissional, principalmente pelo WhatsApp divulgado no perfil.

A análise do código atual da branch `dev` confirma uma homepage pública, interface de acesso/cadastro, confirmação demonstrativa, login, gerenciamento de sessão e operações básicas de serviços. Também confirma uma arquitetura com React/Vite no navegador, uma Vercel Function como gateway HTTP, Google Apps Script como autoridade de negócio e Google Sheets como armazenamento da demonstração.

O projeto já possui implementação concreta de orientação a objetos, controles de segurança, testes automatizados e documentação de arquitetura e dados. Entretanto, **a necessidade específica do município ainda não foi comprovada por pesquisa de campo**. Os números públicos apresentados neste relatório dão contexto nacional e municipal, mas não substituem entrevistas ou questionários com moradores e profissionais locais.

### Situação das oito etapas

| Etapa | Situação atual | Evidência ou pendência principal |
|---|---|---|
| 1. Investigação | Parcial | Problema e público definidos como hipótese; pesquisa local ainda necessária. |
| 2. Dados | Parcial | Indicadores oficiais contextualizam o tema; faltam dados primários de Capelinha. |
| 3. APS — Análise e Projeto de Sistemas | Desenvolvida | Requisitos, atores, regras, arquitetura e modelagem documentados. |
| 4. LOO — Linguagem Orientada a Objetos | Implementada | Classes `Usuario`, `Profissional` e `Servico`, com herança e testes automatizados. |
| 5. PI — Programação/Projeto de Interface | Implementada | Interface React/JSX, CSS/Tailwind e fluxos responsivos. |
| 6. Segurança | Implementada em nível de protótipo | Hash de senha, sessão, CSRF, HMAC, validação de origem e auditoria; sem aprovação para produção. |
| 7. Testes | Suítes automatizadas aprovadas; integração manual validada parcialmente | O PR #15 teve validação ponta a ponta no Preview de sua branch em 16/11/2026. Repetir a jornada no Preview atualizado de `dev` após os PRs #16 e #17. A POC-04 ainda possui ensaios manuais pendentes. |
| 8. Viabilidade | Análise preliminar | Custos de demonstração baixos; uso comercial exige plano e infraestrutura adequados. |

**Critério de leitura:** “implementado” significa que há código ou estrutura versionada. Não significa, por si só, que todos os fluxos foram novamente testados em ambiente real, que houve auditoria independente ou que o sistema esteja liberado para produção.

## 1. Investigação — identificação do problema real

### 1.1. Contexto e problema investigado

Moradores que precisam contratar um serviço local podem encontrar informações espalhadas por indicações pessoais, grupos de mensagens, redes sociais e anúncios individuais. Essa dispersão pode dificultar a comparação de opções, a identificação da área atendida e a localização de um canal de contato confiável.

Do outro lado, profissionais autônomos e pequenos empreendedores podem depender de divulgação informal e de redes pessoais para apresentar o que fazem. Um profissional com pouca visibilidade digital pode ter dificuldade para ser encontrado por pessoas que ainda não conhecem seu trabalho.

O problema que orienta o Conecta Local é, portanto, a **falta de um ponto de consulta organizado e regional para descobrir serviços e conhecer as informações públicas de quem os oferece**.

### 1.2. Delimitação e honestidade da investigação

Esse problema é uma **hipótese de projeto**, não uma conclusão de pesquisa de campo. Até a data deste relatório, não foram apresentados resultados de entrevistas ou questionários aplicados a uma amostra de moradores e profissionais de Capelinha/MG. Assim, não é correto afirmar que a população local já demonstrou determinada dificuldade ou que existe uma demanda quantificada pelo sistema.

A investigação documental e a definição do produto permitem formular o problema e construir um protótipo. A validação local ainda é uma atividade recomendada para fortalecer a justificativa acadêmica e evitar desenvolver funcionalidades que não resolvam uma necessidade percebida pelos usuários.

### 1.3. Público envolvido

| Público | Necessidade a investigar | Resposta proposta pelo Conecta Local |
|---|---|---|
| Morador/cliente | Encontrar um serviço e saber quem o oferece e como entrar em contato. | Busca, categorias, informações públicas e acesso direto ao contato do profissional. |
| Profissional autônomo | Divulgar seus serviços e ser encontrado por novos interessados. | Perfil profissional e cadastro/gerenciamento de serviços. |
| Administrador | Manter informações e conteúdos organizados, quando houver operação administrativa. | Papel administrativo previsto na modelagem; painel de administração ainda não implementado. |

### 1.4. Como validar a hipótese localmente

Recomenda-se uma pesquisa exploratória simples, com participação voluntária e sem coletar dados pessoais desnecessários:

- **Moradores:** meta inicial de 20 a 30 respostas.
- **Profissionais:** meta inicial de 10 a 15 respostas.
- **Instrumento:** questionário curto, entrevista semiestruturada ou formulário presencial/digital.
- **Período de referência:** perguntar sobre experiências dos últimos 3 a 6 meses, para reduzir respostas vagas.

Perguntas sugeridas para moradores:

1. Quando precisa de um profissional, onde costuma procurar?
2. Nos últimos seis meses, teve dificuldade para encontrar alguém que atendesse sua necessidade ou região?
3. Quanto tempo normalmente leva para encontrar e contatar um profissional?
4. Quais informações são decisivas: serviço, localização atendida, apresentação, fotos, preço ou indicação?
5. Prefere entrar em contato por WhatsApp, telefone ou outro canal?

Perguntas sugeridas para profissionais:

1. Como novos clientes normalmente descobrem seus serviços?
2. Quais são as maiores dificuldades para divulgar o trabalho?
3. Já perdeu oportunidades por não ser encontrado ou por falta de informações organizadas?
4. Utiliza redes sociais ou aplicativos de mensagens para divulgar serviços?
5. Teria interesse em manter um perfil público com serviços e área de atendimento?

**Indicadores que devem ser calculados após a coleta:** percentual de moradores que relataram dificuldade; tempo médio autorrelatado para localizar um profissional; canais de descoberta mais citados; percentual de profissionais interessados em uma vitrine regional; categorias de serviço mais mencionadas. A amostra sugerida é exploratória e não deve ser apresentada como representativa de todo o município.

## 2. Dados — números que contextualizam a necessidade

Os dados abaixo ajudam a justificar a relevância do tema, mas possuem abrangências diferentes. Os indicadores nacionais mostram o peso do trabalho por conta própria, dos pequenos negócios e da comunicação digital no Brasil. O dado municipal contextualiza o território. Nenhum deles, isoladamente, comprova a quantidade de moradores que usariam o Conecta Local.

### 2.1. Indicadores selecionados

| Indicador | Número | Relação com o projeto | Limite de interpretação |
|---|---:|---|---|
| População estimada de Capelinha/MG em 2026 | 42.162 pessoas [1] | Dimensiona o município de referência do projeto. | Estimativa populacional; não representa usuários potenciais ou procura por serviços. |
| População de Capelinha no Censo 2022 | 39.626 pessoas [1] | Oferece uma base censitária municipal. | É o último número censitário, não o tamanho atual exato da população. |
| Trabalhadores por conta própria no Brasil em 2025 | 26,1 milhões [2] | Indica a dimensão nacional do trabalho por conta própria. | Não informa quantos estão em Capelinha ou atuam nas categorias do protótipo. |
| Empresas abertas no Brasil em 2025 | 5,1 milhões [3] | Demonstra dinamismo de abertura de negócios. | Aberturas anuais não equivalem ao estoque de empresas ativas nem a prestadores locais. |
| Pequenos negócios entre as empresas abertas em 2025 | Mais de 4,9 milhões (96%) [3] | Reforça a relevância econômica dos pequenos empreendimentos. | Dado nacional de abertura, não demanda local comprovada. |
| Empresas abertas em 2025 no setor de Serviços | Aproximadamente 3,2 milhões (quase 64%) [3] | Aproxima o cenário nacional do segmento em que a plataforma atua. | Classificação ampla de serviços; não se limita a serviços residenciais ou autônomos. |
| Usuários de internet que usaram aplicativos de mensagens em 2024 | 92% [4] | Sustenta a escolha de contato direto por aplicativo de mensagens como canal familiar. | Percentual de usuários de internet com 10 anos ou mais no Brasil. |
| Usuários de internet que divulgaram ou venderam produtos/serviços online em 2024 | 16% [4] | Mostra que a divulgação digital é prática existente, mas não universal. | Usuários de internet; não significa que 16% da população local ofereça serviços. |
| Entre quem divulgou/vendeu online, uso de redes sociais | 73% [4] | Mostra a força das redes sociais como canal de divulgação. | O denominador é o grupo que divulgou/vendeu online, não todos os usuários de internet. |
| Entre quem divulgou/vendeu online, uso de aplicativos de mensagens | 55% [4] | Dá contexto à opção de facilitar o contato por mensagens. | O denominador é o grupo que divulgou/vendeu online; o dado não mede exclusivamente WhatsApp. |

### 2.2. Interpretação dos dados

Os números sugerem um ambiente em que o trabalho por conta própria e os pequenos negócios têm importância econômica, enquanto redes sociais e aplicativos de mensagens são canais amplamente utilizados. Isso torna plausível investigar uma plataforma que organize a descoberta de serviços e preserve o contato direto entre as partes.

A TIC Domicílios 2024 também mostra que a maioria dos usuários da internet pesquisados utiliza mensagens instantâneas. Além disso, entre os usuários que divulgaram ou venderam produtos e serviços online, redes sociais e aplicativos de mensagens aparecem como canais relevantes. Esses resultados dão suporte contextual à decisão de não criar um sistema de mensagens próprio no MVP: o protótipo direciona o visitante ao canal público do profissional.

**Conclusão da etapa:** existem indicadores públicos que justificam estudar o problema, mas a demonstração de necessidade específica em Capelinha depende da pesquisa local proposta na Etapa 1. Os dados nacionais não devem ser usados para afirmar que há 42 mil clientes potenciais, 26 milhões de profissionais no mercado local ou qualquer proporção municipal não medida.

## 3. APS — Análise e Projeto de Sistemas

Nesta atividade, APS é interpretada como **Análise e Projeto de Sistemas**. A etapa organiza o problema em objetivos, atores, requisitos, regras, dados, arquitetura e limites de escopo.

### 3.1. Objetivo geral

Desenvolver uma aplicação web demonstrativa que organize a apresentação de serviços locais e facilite o contato entre visitantes e profissionais, com uma área autenticada para que um profissional fictício possa cadastrar e administrar seus próprios serviços.

### 3.2. Objetivos específicos

- Apresentar serviços por categoria e informações públicas essenciais.
- Permitir que o visitante consulte a vitrine sem precisar criar uma conta.
- Demonstrar cadastro e ativação por código, login e encerramento de sessão.
- Permitir a inclusão e a alteração de estado dos serviços do profissional autenticado.
- Separar interface, gateway HTTP, regras de negócio e persistência.
- Aplicar controles básicos de segurança e manter dados de demonstração fictícios.

### 3.3. Atores e permissões

| Ator | Responsabilidades previstas | Estado no protótipo |
|---|---|---|
| Visitante | Consultar o catálogo e serviços públicos e iniciar contato pelo canal divulgado. | Consulta pública implementada. |
| Profissional | Cadastrar conta, confirmar código, autenticar-se e gerenciar seu perfil/serviços. | Fluxo principal implementado no protótipo. |
| Administrador | Gerenciar profissionais, serviços, categorias, localidades, denúncias e auditoria. | Papel previsto no modelo; painel administrativo e moderação ainda não implementados. |

A autorização de operações protegidas deve ser validada no backend. O navegador não é fonte confiável para decidir o papel, o identificador do usuário ou a propriedade de um serviço.

### 3.4. Requisitos funcionais

| ID | Requisito funcional | Situação |
|---|---|---|
| RF01 | Permitir acesso público à homepage e ao catálogo sem login. | Implementado. |
| RF02 | Apresentar categorias e serviços públicos retornados pelo backend. | Implementado, com exemplos locais como conteúdo ilustrativo complementar. |
| RF03 | Filtrar itens exibidos por texto, categoria e cidade informada. | Implementado no frontend; a filtragem é textual/local, não geoespacial. |
| RF04 | Permitir cadastro de profissional com dados de demonstração. | Implementado no protótipo. |
| RF05 | Gerar e validar um código demonstrativo de confirmação. | Implementado; código é mostrado na interface e não enviado por e-mail. |
| RF06 | Permitir login e criação de sessão autenticada. | Implementado no código; revalidação manual no Preview após a última correção de ambiente permanece necessária. |
| RF07 | Permitir consultar os dados do profissional e os seus serviços. | Implementado no fluxo autenticado. |
| RF08 | Permitir criar serviço e alterar seu estado entre publicado e pausado. | Implementado no protótipo. |
| RF09 | Exibir serviço publicado na vitrine pública, respeitando as condições de visibilidade do backend. | Implementado no fluxo de consulta; validar ponta a ponta no ambiente de demonstração. |
| RF10 | Permitir logout com revogação da sessão. | Implementado no código. |
| RF11 | Permitir envio real de e-mail, recuperação de senha e gestão administrativa completa. | Fora do escopo atual. |

### 3.5. Requisitos não funcionais

- **Segurança:** tráfego HTTPS, segredos somente no servidor, validação de origem, assinatura servidor-servidor, sessão protegida, controles CSRF e validação no backend.
- **Privacidade:** somente dados fictícios na demonstração; não solicitar documentos, endereço residencial ou credenciais pessoais reais.
- **Usabilidade:** navegação compreensível, formulários com mensagens de validação e ações visíveis.
- **Responsividade:** interface utilizável em telas de computador e dispositivos móveis.
- **Manutenibilidade:** componentes separados, regras documentadas, scripts de validação e commits versionados.
- **Disponibilidade e desempenho:** suficientes para demonstração acadêmica; não há comprovação de capacidade para grande volume de acessos.
- **Acessibilidade:** priorizar HTML semântico, foco visível, navegação por teclado, contraste e respeito à preferência por movimento reduzido.

### 3.6. Regras de negócio e limites

1. Visitantes podem consultar serviços públicos sem autenticação.
2. O profissional autenticado só pode gerenciar serviços associados à sua conta.
3. Apenas serviços elegíveis e publicados devem aparecer na vitrine pública.
4. A confirmação de e-mail é simulada: o código aparece na interface; não existe envio real de e-mail nesta entrega.
5. A senha não deve ser armazenada em texto puro.
6. A área de administração, denúncias, moderação operacional, recuperação de senha e upload de imagens no Google Drive estão fora do escopo implementado.
7. Não há pagamentos, reservas, contratos ou chat interno. A plataforma encaminha o visitante para contato direto.
8. Todas as contas, credenciais, contatos e serviços usados em testes devem ser fictícios.

### 3.7. Modelagem de dados

A modelagem lógica documenta **12 entidades e 102 campos** distribuídos em três grupos:

- **Acesso e autenticação:** `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO` e `CONTROLE_AUTENTICACAO`.
- **Catálogo e serviços:** `SERVICOS`, `CATEGORIAS`, `CIDADES`, `SERVICO_CIDADES` e `IMAGENS`.
- **Governança:** `DENUNCIAS` e `AUDITORIA`.

A implementação atual do Apps Script utiliza diretamente as abas `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `SERVICOS`, `CATEGORIAS`, `CIDADES` e `AUDITORIA`. As demais entidades permanecem previstas na modelagem para evoluções futuras; não se deve dizer que todos os 12 módulos estão plenamente operacionais.

O Google Sheets é utilizado como persistência didática e não deve ser confundido com um banco de dados relacional. Integridade referencial, unicidade, propriedade, estados e validações precisam ser aplicadas pelo Apps Script. Para uma evolução comercial ou aumento relevante de volume, deve-se reavaliar o armazenamento e considerar um banco de dados próprio.

### 3.8. Arquitetura da solução

```text
Navegador
  React + JavaScript/JSX + CSS/Tailwind
          |
          | HTTPS / mesma origem
          v
Vercel Function — gateway HTTP
  valida método, origem, contrato, sessão/CSRF
  calcula hash de senha e assina a chamada interna
          |
          | POST servidor-servidor com HMAC-SHA-256
          v
Google Apps Script — backend de negócio
  autenticação, autorização, regras e auditoria
          |
          v
Google Sheets — dados da demonstração
```

O React não chama o Web App do Apps Script diretamente. A Vercel Function recebe chamadas de mesma origem, aplica controles de borda e encaminha a solicitação assinada. O Apps Script valida a assinatura e é a autoridade final para as operações de negócio e acesso aos dados.

### 3.9. Tecnologias utilizadas

| Camada | Tecnologia | Função |
|---|---|---|
| Interface | React 19, JavaScript/JSX | Componentes, estados e interação. |
| Desenvolvimento/build | Vite 8 | Servidor de desenvolvimento e geração do bundle. |
| Estilos | Tailwind CSS 4 e CSS | Layout, responsividade e identidade visual. |
| Componentes/ícones | Componentes locais no padrão shadcn/ui e Lucide React | Reutilização visual e ícones. |
| Gateway HTTP | Vercel Functions / Node.js | Receber requisições same-origin e encaminhá-las ao Apps Script. |
| Backend de negócio | Google Apps Script | Regras, autorização, persistência e auditoria. |
| Armazenamento | Google Sheets | Registros da demonstração. |
| Versionamento e CI | GitHub e GitHub Actions | Histórico de mudanças e validações automatizadas. |

## 4. LOO — Linguagem Orientada a Objetos

A etapa de LOO está implementada no back-end Node.js, em `server/domain-entities.js`. O objetivo é demonstrar classes, objetos, atributos, métodos e herança com entidades que fazem parte do próprio domínio do Conecta Local.

### 4.1. Classes implementadas

| Classe | Atributos principais | Métodos | Responsabilidade |
|---|---|---|---|
| `Usuario` | `email` | `toAccountPayload()` | Representar os dados básicos da conta e montar o payload técnico correspondente. |
| `Profissional extends Usuario` | Herda `email`; possui `fullName`, `publicName`, `whatsapp`, `presentation`, `cityId`. | `toRegistrationPayload()` | Representar o perfil profissional associado à conta e organizar os dados do cadastro. |
| `Servico` | `serviceId`, `categoryId`, `title`, `description`, `status`. | `toCreatePayload()`, `publicar()`, `pausar()`, `toStatusPayload()`. | Representar um serviço e suas operações de criação, publicação e pausa. |

### 4.2. Relação de herança e objetos

`Profissional` herda de `Usuario`. Isso permite reutilizar o atributo `email` e o método `toAccountPayload()` e acrescentar os dados específicos de um profissional. A classe `Servico` representa um serviço que possui dados próprios e métodos para alterar o estado.

```text
Usuario
  └── Profissional

Profissional
  └── possui serviços
        └── Servico
```

Um objeto é uma instância criada a partir de uma classe. Por exemplo, `new Profissional({...})` cria um profissional específico com valores para seus atributos. `new Servico({...})` cria um serviço que pode executar `pausar()` ou `publicar()`.

### 4.3. Exemplo simplificado

```javascript
const profissional = new Profissional({
  email: "ana@example.test",
  fullName: "Ana Silva",
  publicName: "Ana Serviços",
  whatsapp: "34999999999",
  presentation: "Perfil fictício para demonstração.",
  cityId: "cidade-ficticia-01",
});

const servico = new Servico({
  serviceId: "servico-ficticio-01",
  title: "Instalação de chuveiro",
});

servico.pausar();
console.log(profissional.email); // atributo herdado de Usuario
console.log(servico.status);     // paused
```

Os valores são fictícios e servem apenas para explicar a implementação.

### 4.4. Integração com o sistema e evidências

O gateway instancia `Profissional` durante o cadastro e instancia `Servico` nas operações de criação e alteração de estado. As classes organizam os dados e payloads. A validação final de sessão, autorização, propriedade, integridade e gravação continua sendo responsabilidade do Apps Script.

Os testes da LOO estão em `tests/loo/domain-entities.test.js` e o comando de execução é `npm run test:loo`. A suíte contém cinco casos:

1. `Usuario` mantém o e-mail e monta os dados da conta.
2. `Profissional` herda de `Usuario` e converte os atributos para o contrato do backend.
3. `Servico` monta o payload de criação esperado.
4. `Servico.pausar()` altera o estado para `paused`.
5. `Servico.publicar()` altera o estado para `published`.

A implementação demonstra os conceitos solicitados de classe, objeto, atributo, método e herança. Não é necessário afirmar que todos os pilares de orientação a objetos foram explorados em profundidade; o escopo implementado está concentrado nesses conceitos.

## 5. PI — Interface com HTML, CSS e JavaScript

### 5.1. Como a exigência é atendida

O projeto utiliza React com JavaScript e JSX. O JSX permite descrever a estrutura visual de componentes utilizando uma sintaxe semelhante a HTML dentro de arquivos JavaScript; durante a compilação, o Vite transforma esse código em recursos executáveis pelo navegador. Portanto, a interface utiliza HTML semântico gerado pela aplicação, CSS e JavaScript, embora não seja composta por páginas estáticas escritas manualmente em HTML puro.

- `index.html`: documento de entrada da aplicação.
- `src/main.jsx` e `src/App.jsx`: inicialização e composição principal.
- `src/pages/HomePage.jsx`: página pública.
- `src/pages/AuthDemoPage.jsx`: cadastro, confirmação, login e área do profissional.
- `src/components/home/`: cabeçalho, busca/hero e seções da página pública.
- `src/components/ui/`: componentes reutilizáveis de interface.
- `src/index.css`: estilos globais, tokens visuais, responsividade e ajustes de acessibilidade.

### 5.2. Componentes e experiência do usuário

A interface pública apresenta a proposta da plataforma, campo de busca, seleção de categorias, cards de serviços/profissionais ilustrativos, explicação de como funciona, perguntas frequentes e chamadas para ação. O fluxo de cadastro e acesso apresenta formulários com validação, etapas de confirmação e área autenticada.

A busca pública consulta serviços e categorias pelo gateway e combina os serviços retornados com exemplos visuais locais. A filtragem atual por texto/categoria/cidade é realizada no frontend sobre os itens carregados. O campo de cidade não realiza geocodificação nem uma pesquisa geográfica por distância. As fotografias e os perfis de exemplo não representam profissionais cadastrados.

### 5.3. Responsividade e usabilidade

A interface foi construída com classes utilitárias e regras CSS para diferentes larguras de tela. A estrutura prioriza navegação compreensível, componentes consistentes, foco visível e respeito à configuração de movimento reduzido. O teste em aparelhos e navegadores reais continua importante, especialmente em telas pequenas e dispositivos de menor desempenho.

### 5.4. Limites da interface atual

- Não existe painel administrativo funcional.
- A confirmação é demonstrativa e não envia mensagens de e-mail.
- Não existe fluxo de recuperação de senha.
- Upload de fotos para Google Drive não está implementado.
- A pesquisa geográfica e a cobertura por distância não estão implementadas.
- Cards e fotografias de exemplo são ilustrativos e não devem ser confundidos com prestadores reais.

## 6. Segurança — proteção dos dados

A segurança foi considerada na arquitetura e no código do protótipo. O objetivo é demonstrar práticas importantes de proteção, não declarar o sistema certificado ou aprovado para uso comercial. Todos os testes devem utilizar contas e dados fictícios.

### 6.1. Proteção de senhas

- A senha é processada no runtime Node.js da Vercel Function, não no navegador nem no Apps Script.
- O código usa Argon2id por meio da biblioteca `hash-wasm` versão `4.13.0`.
- O perfil configurado é `argon2id$v=19$m=19456,t=2,p=1` (19.456 KiB de memória, duas iterações e paralelismo 1).
- É gerado um salt aleatório individual de 16 bytes.
- A política de entrada aceita de 15 a 128 pontos de código Unicode, com limite de 512 bytes UTF-8, normalização NFC e rejeição de caracteres de controle ou Unicode inválido.
- O Apps Script recebe o hash, o salt e o identificador do algoritmo, não a senha em texto puro.
- A comparação do hash no gateway utiliza `timingSafeEqual`.

### 6.2. Sessão e cookies

O gateway emite o cookie `__Host-conecta_local_session` com os atributos `HttpOnly`, `Secure`, `SameSite=Strict` e `Path=/`, sem atributo `Domain`. O navegador envia o cookie automaticamente nas requisições same-origin; o JavaScript da página não deve ler o token da sessão.

O token é opaco e gerado com fonte criptográfica. O gateway calcula SHA-256 do token antes de encaminhá-lo ao Apps Script; a planilha armazena o hash, não o valor original do token. O Apps Script valida a sessão e aplica os limites previstos de 30 minutos de inatividade e oito horas de duração absoluta. O logout solicita a revogação da sessão e a expiração do cookie.

### 6.3. Proteção contra CSRF e validação de origem

- O gateway verifica o cabeçalho `Origin` contra uma origem HTTPS exata configurada no ambiente Preview.
- Origem ausente, `null`, diferente ou metadado de navegação incompatível é recusado.
- Operações protegidas exigem token CSRF em cabeçalho próprio (`x-csrf-token`).
- O token CSRF é derivado por HMAC-SHA-256 e comparado de forma resistente a diferenças de tempo.
- O cookie `SameSite=Strict` funciona como defesa adicional, sem substituir a validação do servidor.

### 6.4. Comunicação entre Vercel e Apps Script

A comunicação servidor-servidor utiliza HMAC-SHA-256. A assinatura cobre uma mensagem canônica com versão, timestamp, nonce, ação, identificador de requisição e hash do payload. O Apps Script verifica a assinatura, rejeita timestamp fora da janela permitida e registra nonces para impedir repetição (*replay*). O fluxo utiliza lock para proteger a reserva de nonce e falha fechado quando os controles necessários não estão disponíveis.

As chaves ficam em variáveis de ambiente server-side da Vercel e em propriedades privadas do projeto Apps Script. Não devem aparecer no frontend, no repositório, em logs ou em mensagens de erro. O gateway aceita apenas ações de uma lista permitida, exige POST e JSON válido e limita o tamanho do corpo/payload.

### 6.5. Integridade, autorização e auditoria

O Apps Script é a autoridade para validar sessão, estado da conta, propriedade dos serviços, permissões e transições de estado. O identificador de proprietário informado pelo navegador não deve ser tratado como prova de autorização. Eventos importantes são registrados na aba `AUDITORIA`.

O Google Sheets não impõe chaves estrangeiras ou transações relacionais automaticamente. Por isso, as verificações de integridade precisam ser feitas na lógica do Apps Script e acompanhadas de testes. A planilha não deve ser apresentada como uma solução de banco relacional para produção.

### 6.6. Limites de segurança e condições de uso

- O backend do protótipo é habilitado apenas em Vercel Preview; o código desativa as rotas de negócio quando o ambiente não é `preview`.
- O projeto é acadêmico e deve usar somente dados fictícios. Não inserir senhas pessoais, documentos, números privados ou dados reais de clientes.
- A confirmação por e-mail é simulada; não há envio real de e-mail.
- Recuperação de senha, painel administrativo e moderação completa ainda não estão implementados.
- Não foi realizada auditoria independente, teste de carga ou certificação de segurança.
- Controles implementados reduzem riscos conhecidos, mas não eliminam vulnerabilidades nem garantem segurança absoluta.

**Conclusão da etapa:** o protótipo demonstra controles relevantes de senha, sessão, origem, CSRF, HMAC, replay, autorização e auditoria. A liberação para produção exigiria revisão de segurança independente, política operacional, monitoramento, backups, gestão de incidentes e revisão da infraestrutura e do armazenamento.

## 7. Testes — situações e critérios de validação

O repositório possui suítes automatizadas para comunicação (POC-01), assinatura HMAC/replay (POC-02), investigação de senhas (POC-03) e LOO. O workflow `.github/workflows/validate.yml` está configurado para executar testes, auditoria de dependências, verificação do registro de ocorrências, ESLint e build.

A existência de um teste automatizado no repositório não significa que toda a jornada da aplicação tenha sido testada manualmente após cada alteração de configuração externa. Por isso, a tabela separa a evidência automatizada da validação ponta a ponta recomendada.

### 7.1. Cenários de teste

| ID | Situação de teste | Procedimento resumido | Resultado esperado | Evidência/situação |
|---|---|---|---|---|
| T01 | Método HTTP inválido | Enviar GET para rota que aceita somente POST. | Resposta 405; nenhuma chamada ao Apps Script. | Teste automatizado de gateway existente. |
| T02 | JSON inválido ou tipo de conteúdo incorreto | Enviar corpo malformado ou `Content-Type` incompatível. | Requisição recusada (400/415); nenhuma operação de negócio. | Testes automatizados POC-01/02 existentes. |
| T03 | Ação fora da lista permitida | Enviar nome de ação não reconhecido. | Gateway recusa a operação antes de encaminhar ao Apps Script. | Teste automatizado existente. |
| T04 | Assinatura HMAC inválida ou ausente | Chamar o endpoint Apps Script sem assinatura válida ou alterar payload após assinatura. | Apps Script recusa a chamada. | Testes automatizados POC-02 existentes. |
| T05 | Reutilização de nonce | Repetir uma solicitação com o mesmo nonce. | Segunda chamada é recusada como replay. | Testes automatizados POC-02 existentes. |
| T06 | Política de senha | Testar senha abaixo do mínimo, senha válida de 15+ caracteres, Unicode e limites de bytes. | Entradas inválidas são recusadas; entradas dentro da política podem ser processadas. | Testes automatizados POC-03 existentes. |
| T07 | Hash de senha | Gerar hash Argon2id e comparar senha correta e incorreta. | Senha correta valida; senha diferente não autentica. | Testes isolados da POC-03; a suíte do produto não substitui ensaio de integração completo. |
| T08 | Herança e operações LOO | Instanciar `Profissional`, verificar herança de `Usuario`, pausar e publicar um `Servico`. | Atributos e payloads corretos; estados `paused` e `published`. | Cinco casos automatizados em `tests/loo/domain-entities.test.js`. |
| T09 | Cadastro e confirmação | Criar conta totalmente fictícia e usar o código exibido na interface. | Conta é registrada; código válido ativa o fluxo; código inválido/expirado é recusado. | Validado manualmente no Preview da branch do PR #15 em 16/11/2026; repetir no Preview atualizado de `dev`. |
| T10 | Login e restauração de sessão | Entrar com credencial fictícia e recarregar a página. | Sessão é reconhecida pelo backend; dados do profissional são carregados. | Validado manualmente no Preview da branch do PR #15 em 16/11/2026; repetir no Preview atualizado de `dev`. |
| T11 | Criação e alteração de serviço | Criar um serviço, pausar e publicar novamente. | Estado é salvo no Sheets e refletido na área do profissional. | Criar, pausar e publicar novamente foi validado manualmente no Preview da branch do PR #15 em 16/11/2026; repetir no Preview atualizado de `dev`. Edição/remoção não fazem parte da implementação atual. |
| T12 | Visibilidade pública e autorização | Publicar serviço e consultar homepage; tentar alterar serviço que não pertence ao usuário autenticado. | Serviço publicado elegível aparece; operação de outro proprietário é negada. | Visibilidade de serviço publicado na homepage foi validada no Preview do PR #15 em 16/11/2026. O ensaio adversarial de acesso cruzado entre profissionais ainda precisa de evidência específica. |
| T13 | Logout e revogação | Encerrar a sessão e tentar acessar uma operação protegida com a sessão anterior. | Sessão é revogada, cookie expirado e operação protegida recusada. | Logout, novo login e refresh foram validados manualmente no Preview do PR #15 em 16/11/2026; repetir no Preview atualizado de `dev`. |
| T14 | Origem externa | Enviar requisição com origem diferente da permitida. | Gateway responde com recusa; operação não chega ao backend de negócio. | Validação de Origin implementada no gateway. A evidência específica de rejeição manual no Preview atualizado de `dev` ainda precisa ser registrada. |

### 7.2. Comandos de validação

Executar na raiz do repositório, utilizando a versão Node.js recomendada (Node 24):

```bash
npm ci
npm run test:poc01
npm run test:poc02
npm run test:poc03
npm run test:loo
npm run check:occurrences
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
```

O workflow do GitHub Actions executa essas etapas de validação. A auditoria completa de dependências de desenvolvimento é informativa e não bloqueia a execução quando falha, conforme configuração do workflow; a auditoria de dependências de produção com severidade alta é bloqueante.

### 7.3. Roteiro de demonstração manual

1. Abrir a URL Preview da branch `dev` com `/?auth=demo&mode=register`.
2. Criar um profissional usando nome, e-mail, telefone e senha estritamente fictícios.
3. Confirmar a conta utilizando o código exibido na própria interface.
4. Entrar com as credenciais fictícias e conferir o carregamento dos dados.
5. Criar um serviço de exemplo.
6. Alternar o serviço entre publicado e pausado e observar o estado na área profissional.
7. Abrir a homepage e verificar a visibilidade do serviço publicado e o canal de contato.
8. Encerrar a sessão e verificar que o acesso protegido exige nova autenticação.

**Estado de implantação em 18/11/2026:** após o merge da PR #20, a Vercel publicou um Preview da branch `dev` no commit `6c787ec` com estado `READY`. A PR #20 e os commits subsequentes deste ajuste são exclusivamente documentais; o código funcional foi originalmente sincronizado com `main` no commit `49354a4`. O estado `READY` confirma build e publicação, não a jornada ponta a ponta. O fluxo manual foi validado no Preview da branch de implementação do PR #15 em 16/11/2026, mas precisa ser repetido no Preview atualizado de `dev` após as integrações #16 e #17.

## 8. Viabilidade — custos e benefícios

A análise considera dois cenários diferentes: a demonstração acadêmica e uma eventual operação pública/comercial. O custo de uma prova acadêmica pequena não deve ser confundido com o custo de manter um serviço com usuários, dados pessoais, suporte e exigência de disponibilidade.

### 8.1. Estimativa de custo da demonstração acadêmica

| Item | Estimativa inicial | Observação |
|---|---:|---|
| Vercel Hobby | US$ 0/mês | Plano gratuito destinado a uso pessoal e não comercial; sujeito aos limites e regras da plataforma. |
| Google Sheets / Apps Script | US$ 0 incremental presumido | Considera conta existente e uso dentro das cotas; não inclui eventual plano Google Workspace. |
| GitHub | US$ 0 incremental presumido | Considera repositório e Actions dentro das cotas do plano usado. |
| Domínio próprio | R$ 0 na estimativa-base | A demonstração pode utilizar o domínio fornecido pela Vercel; domínio próprio seria adicional. |
| Equipamento e internet | Não contabilizados | Pressupõe equipamento e conexão já disponíveis. |
| Desenvolvimento | Não monetizado | Não existe apontamento de horas e valor/hora neste relatório. |

A estimativa de US$ 0/mês é apenas uma hipótese de custo incremental para a demonstração, desde que os serviços permaneçam dentro dos limites gratuitos e das condições de uso [6]. A Vercel informa que o plano Hobby é limitado a uso pessoal e não comercial. Não deve ser usado para uma operação comercial.

### 8.2. Cenário de evolução comercial

A Vercel informa o plano Pro a partir de **US$ 20/mês** [5], com crédito de uso incluído, antes de impostos e de eventual consumo adicional. Esse valor é uma referência da página oficial consultada em 17/11/2026, e não um orçamento fechado em reais. O câmbio, impostos, uso, domínio, serviços de e-mail, monitoramento, banco de dados, armazenamento/backup e suporte podem gerar custos adicionais.

Para estimar mão de obra, utilizar a fórmula:

`Custo de desenvolvimento = horas efetivamente trabalhadas × valor da hora técnica`

As horas não foram registradas neste relatório; portanto, não é correto inventar um valor de desenvolvimento.

### 8.3. Limitações técnicas com impacto financeiro

- Google Apps Script possui cotas e limites de execução. A documentação oficial informa limite de seis minutos por execução, entre outros limites de simultaneidade e serviços [7]. As cotas podem mudar sem aviso.
- Google Sheets é adequado para a demonstração controlada, mas não oferece as garantias e recursos de um banco de dados relacional transacional.
- Crescimento do número de usuários, serviços e consultas pode exigir banco de dados gerenciado, cache, observabilidade, backup, controle de acesso e revisão da arquitetura.
- O envio real de e-mails, recuperação de senha, armazenamento de imagens, administração e moderação exigirão implementação, revisão e custos adicionais.
- Antes de operar comercialmente, será necessário verificar termos dos provedores, privacidade, proteção de dados, segurança, suporte, continuidade e requisitos legais aplicáveis.

### 8.4. Benefícios esperados

- Centralizar a apresentação de serviços locais em uma vitrine organizada.
- Facilitar a descoberta por categoria e informações do serviço.
- Dar ao profissional um espaço estruturado para apresentar o trabalho.
- Reduzir etapas entre encontrar um serviço e contatar o profissional.
- Manter o contato direto, sem criar intermediação de pagamento ou contratação dentro do sistema.
- Demonstrar competências acadêmicas em análise, modelagem, desenvolvimento web, orientação a objetos, segurança e testes.

Esses benefícios são esperados; ainda precisam ser medidos com usuários reais antes de serem apresentados como resultados alcançados.

### 8.5. Indicadores para avaliar um piloto

| Indicador | Como medir | O que demonstra |
|---|---|---|
| Profissionais cadastrados | Contagem de contas de demonstração/piloto válidas. | Adesão da oferta local. |
| Serviços publicados | Contagem de serviços elegíveis e publicados. | Volume de opções disponíveis. |
| Buscas sem resultado | Buscas que retornam zero itens ÷ total de buscas. | Lacunas de categorias ou cobertura. |
| Cliques de contato | Cliques no canal público de contato, com medição que respeite privacidade. | Interesse em contatar os profissionais. |
| Tempo para encontrar serviço | Tempo observado ou autorrelatado em tarefa de busca. | Eficiência da experiência. |
| Satisfação | Avaliação voluntária após tarefa de uso. | Percepção de utilidade e facilidade. |
| Conversão do cadastro | Cadastros concluídos ÷ cadastros iniciados. | Clareza do fluxo de entrada do profissional. |

### 8.6. Conclusão de viabilidade

Para uma demonstração acadêmica com dados fictícios e baixo volume, a arquitetura escolhida permite apresentar as principais etapas sem assumir um custo elevado de infraestrutura. Entretanto, a solução atual não deve ser tratada como pronta para exploração comercial. O plano Hobby da Vercel é não comercial, o Apps Script possui cotas, e o Sheets não foi escolhido para uma operação transacional de escala.

A evolução responsável seria validar a necessidade local, medir o uso do protótipo, corrigir pendências funcionais, revisar segurança e privacidade e, somente então, elaborar uma arquitetura e um orçamento de produção.

## Conclusão geral

O Conecta Local cobre de forma concreta boa parte das exigências acadêmicas: possui uma proposta de solução, requisitos e modelagem, interface web, implementação de orientação a objetos, controles de segurança e uma estrutura de testes automatizados. A arquitetura separa a experiência do usuário, o gateway e o backend de negócio e documenta os limites da persistência em planilha.

As duas lacunas mais importantes para fortalecer a apresentação acadêmica são **validar o problema com moradores e profissionais de Capelinha** e **registrar a execução manual completa dos fluxos no ambiente Preview**. Os números nacionais justificam investigar o tema, mas não substituem a pesquisa local. Do mesmo modo, um deploy `READY` não substitui o teste funcional da aplicação.

A conclusão adequada é que o Conecta Local é um **protótipo acadêmico funcional em evolução, com evidências de implementação e testes automatizados**, e não um marketplace comercial pronto. Essa delimitação torna a apresentação tecnicamente honesta e mostra consciência sobre o que foi construído, o que foi testado e o que ainda precisa ser validado.

## Referências externas

1. **IBGE.** Cidades e Estados — Capelinha/MG. População do Censo 2022 e estimativa municipal de 2026. Disponível em: [IBGE — Cidades e Estados: Capelinha](https://www.ibge.gov.br/cidades-e-estados/mg/capelinha.html). Acesso em: 17 nov. 2026.
2. **IBGE.** PNAD Contínua: em 2025, taxa anual de desocupação foi de 5,6% enquanto a taxa de subutilização foi de 14,5%. Dados de trabalhadores por conta própria. Disponível em: [IBGE — PNAD Contínua 2025](https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/2013-agencia-de-noticias/releases/45759-pnad-continua-em-2025-taxa-anual-de-desocupacao-foi-de-5-6-enquanto-taxa-de-subutilizacao-foi-14-5). Acesso em: 17 nov. 2026.
3. **SEBRAE.** É recorde: 5,1 milhões de empresas foram abertas em 2025. Agência Sebrae de Notícias, 26 jan. 2026. Disponível em: [Sebrae — empresas abertas em 2025](https://agenciasebrae.com.br/economia-e-politica/e-recorde-51-milhoes-de-empresas-foram-abertas-em-2025/). Acesso em: 17 nov. 2026.
4. **CGI.br / NIC.br / Cetic.br.** Pesquisa TIC Domicílios 2024. São Paulo, 2025. Dados de comunicação e divulgação/venda online, especialmente páginas impressas 70 e 86–87 do relatório. Disponível em: [Cetic.br — Pesquisa TIC Domicílios 2024 (PDF)](https://www.cetic.br/media/docs/publicacoes/2/20250512120132/tic_domicilios_2024_livro_eletronico.pdf). Acesso em: 17 nov. 2026.
5. **Vercel.** Pricing — Hobby, Pro e Enterprise. Disponível em: [Vercel — Pricing](https://vercel.com/pricing). Acesso em: 17 nov. 2026.
6. **Vercel.** Hobby Plan — condições de uso e limites do plano gratuito. Última atualização indicada pela documentação: 7 jan. 2026. Disponível em: [Vercel — Hobby Plan](https://vercel.com/docs/plans/hobby). Acesso em: 17 nov. 2026.
7. **Google for Developers.** Cotas para serviços do Google Apps Script. Disponível em: [Google for Developers — Cotas do Apps Script](https://developers.google.com/apps-script/guides/services/quotas?hl=pt-br). Acesso em: 17 nov. 2026.

## Documentação interna do projeto

- `README.md` — visão geral, tecnologias e execução local.
- `docs/AI_CONTEXT.md` — contexto técnico e estado registrado do projeto.
- `docs/ESPECIFICACAO_MVP.md` — requisitos, atores e regras funcionais.
- `docs/MODELAGEM_DADOS.md` — modelo lógico e esquema das 12 entidades.
- `docs/LOO_ORIENTACAO_OBJETOS.md` — implementação de classes e herança.
- `docs/ARQUITETURA_APPS_SCRIPT.md` — arquitetura de integração.
- `docs/ATIVAR-PROTOTIPO-GOOGLE-SHEETS.md` — ativação do protótipo funcional.
- `docs/POC_01_COMUNICACAO.md` — comunicação entre frontend, Vercel e Apps Script.
- `docs/POC_02_ASSINATURA_GATEWAY.md` — HMAC e proteção contra replay.
- `docs/POC_03_ARMAZENAMENTO_SENHAS.md` — investigação e validação do armazenamento de senhas.
- A POC-04 está em uma branch independente (`feat/poc-04-session-cookie`), na PR #14 em Draft; a documentação e as pendências completas permanecem nessa branch até a conclusão da revisão.
- `docs/REGISTRO_DE_OCORRENCIAS.md` — histórico sanitizado de ocorrências.

---

**Nota de atualização:** este relatório representa a leitura do código e da documentação disponível na branch `dev` no commit informado no cabeçalho. Alterações posteriores podem exigir revisão do status, dos requisitos, da arquitetura e das evidências de teste.
