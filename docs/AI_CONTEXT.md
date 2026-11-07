# Conecta Local — Contexto técnico para IAs

> Documento de continuidade do projeto. Leia antes de sugerir ou realizar alterações. Reúne propósito, decisões, arquitetura planejada, estado implementado, regras de manutenção e limitações. A seção de snapshot ao final é atualizada pelo GitHub Actions.

## 1. Instruções para a IA que assumir o projeto

1. Leia este documento por inteiro antes de propor mudanças, especialmente em uma conversa nova.
2. Confirme a branch, o commit e o estado atual do repositório. O snapshot registra a revisão usada na última sincronização; commits posteriores podem existir.
3. Trate o código da branch em análise como fonte de verdade para o comportamento implementado. A documentação fornece contexto, mas pode ficar desatualizada.
4. Diferencie explicitamente **implementado**, **decisão vigente**, **problema observado** e **planejado**. Não apresente ideias futuras como funcionalidades prontas.
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
15. Consulte também `README.md` e `docs/REGISTRO_DE_OCORRENCIAS.md`. O registro é histórico e não substitui a descrição do estado atual.
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

A plataforma deve funcionar como uma vitrine regional organizada, e não como um sistema de pagamentos ou contratação complexa. O contato inicial será direto com o profissional, preferencialmente pelo WhatsApp, conforme os dados que ele escolher disponibilizar.

## 3. Problema e escopo do produto

### 3.1. Problema a investigar

Hipótese inicial: profissionais autônomos e pequenos empreendedores podem ter dificuldade para divulgar seus serviços e alcançar novos clientes; moradores podem ter dificuldade para localizar profissionais e conhecer os serviços disponíveis na região.

Essa hipótese precisa ser validada com pesquisa de campo. Dados nacionais ajudam a contextualizar o trabalho, mas não comprovam por si só a existência ou a intensidade do problema local.

### 3.2. Áreas previstas

As três áreas fazem parte da decisão vigente de produto, mas só devem ser marcadas como implementadas após existirem no código e passarem por validação.

**Área pública**
- Página inicial e apresentação do Conecta Local.
- Busca por nome ou descrição do serviço.
- Filtros por categoria e localidade/área de atendimento.
- Listagem e detalhes de serviços.
- Perfil público do profissional.
- Acesso ao contato divulgado pelo profissional.

**Painel do profissional**
- Cadastro e autenticação.
- Criação e manutenção do perfil profissional.
- Cadastro, edição, pausa e exclusão dos próprios serviços.
- Envio e gerenciamento de imagens.
- Visualização do estado de publicação.

**Painel administrativo**
- Gestão de profissionais e categorias.
- Análise de denúncias.
- Suspensão de perfis ou serviços inadequados.
- Consulta a registros administrativos necessários.

### 3.3. Escopo reduzido do MVP

Priorizar cadastro e gerenciamento de serviços, busca pública, categorias, perfil do profissional e contato por WhatsApp.

Não incluir na primeira versão, salvo necessidade acadêmica demonstrada: pagamentos, chat interno, sistema de orçamento complexo, avaliações, favoritos, geolocalização em tempo real ou aplicativo nativo.

A publicação automática é a decisão vigente: serviços que passarem pelas validações obrigatórias devem ficar disponíveis sem aprovação manual prévia. Isso não elimina moderação posterior, denúncias, suspensão ou remoção administrativa.

## 4. Estado atual do repositório

**Estado verificado na criação deste contexto (2026-11-06):**

- O repositório contém o scaffold inicial de React + Vite.
- `src/App.jsx` ainda apresenta a tela de demonstração do template Vite/React.
- `src/main.jsx`, `src/App.css`, `index.html`, `vite.config.js`, `eslint.config.js`, `package.json` e `package-lock.json` pertencem à estrutura inicial.
- O repositório está publicado na Vercel, mas isso não significa que funcionalidades do marketplace estejam implementadas.
- Não há, nesta revisão inicial, backend Apps Script integrado, planilha operacional, cadastro, autenticação, pesquisa real ou painel de administração.

Atualize esta seção quando funcionalidades reais forem adicionadas. Use o código e os resultados de validação como evidência.

## 5. Arquitetura e decisões tecnológicas

### 5.1. Frontend

- **React + JavaScript/JSX:** interface e componentes.
- **Vite:** servidor de desenvolvimento e build.
- **Node.js:** ambiente de execução das ferramentas de desenvolvimento, scripts e build.
- **CSS:** estilização responsiva. Tailwind CSS já está presente no scaffold inicial; confirme seu uso antes de descrevê-lo como padrão visual definitivo.

Não foi escolhida uma aplicação Next.js. Não adicionar Express por padrão: para manter o projeto simples, o Google Apps Script é a opção inicial de backend. Reavaliar somente se surgir requisito concreto que justifique uma API Node.js hospedada separadamente.

### 5.2. Backend e dados planejados

- **Google Apps Script:** camada inicial de API e regras de negócio.
- **Google Sheets:** armazenamento inicial de registros, organizado em abas.
- **Google Drive:** armazenamento de imagens enviadas pelos profissionais.

O fluxo previsto é React/Vite → endpoint Apps Script → Google Sheets/Drive. O Apps Script deve validar entradas e permissões no lado confiável. O frontend nunca deve acessar a planilha com credenciais privilegiadas.

Google Sheets é uma solução de armazenamento simplificada para o escopo acadêmico; não é um banco relacional. Considerar concorrência, cotas do Apps Script, limites de execução, consultas e integridade dos registros. Não prometer capacidade de produção em grande escala.

### 5.3. Modelagem de dados prevista

As abas iniciais propostas são:

- `USUARIOS`: identificador, papel e estado da conta; não armazenar senhas em texto puro.
- `PROFISSIONAIS`: informações públicas e comerciais do profissional.
- `SERVICOS`: serviços oferecidos, categoria, proprietário e estado de publicação.
- `CATEGORIAS`: categorias disponíveis.
- `IMAGENS`: relação entre serviço/profissional e identificadores de arquivos no Drive.
- `DENUNCIAS`: denúncias e estado de análise.
- `LOGS`: ações administrativas relevantes, caso necessárias.

Usar UUIDs ou identificadores estáveis. Não usar o número da linha da planilha como identificador de negócio, pois a posição pode mudar.

Esta é uma proposta de modelagem, não uma estrutura já criada. Atualize-a quando a planilha e os campos reais forem definidos.

### 5.4. Autenticação e arquivos — decisões pendentes

- A solução de autenticação ainda precisa ser definida. Não implementar autenticação própria improvisada apenas para evitar escolher um provedor.
- Nunca armazenar senhas em texto puro no Google Sheets. Preferir provedor de autenticação confiável; se uma solução própria for considerada, exigir desenho e revisão de segurança antes.
- A estratégia final de disponibilização das imagens do Drive ainda precisa ser definida. Não tornar uma pasta inteira pública por conveniência.
- O identificador do arquivo no Drive pode ser registrado na planilha; a autorização de acesso e a forma de servir a imagem devem ser avaliadas.
- Definir tamanho máximo, tipos MIME aceitos, validação de conteúdo e limites de envio antes de habilitar uploads.

## 6. Regras de negócio e segurança

Decisões e requisitos a preservar durante a implementação:

1. Visitantes podem pesquisar e visualizar serviços sem criar conta.
2. Profissionais precisam estar autenticados para criar e gerenciar seus serviços.
3. Um profissional só pode alterar os registros que possui.
4. Um usuário comum não pode executar operações administrativas.
5. Administradores podem moderar conteúdo e suspender registros, com justificativa quando aplicável.
6. A publicação automática ocorre somente após validações de campos, estado da conta e regras do produto.
7. Exibir apenas dados que o profissional autorizou tornar públicos.
8. Não solicitar nem expor endereço residencial completo sem necessidade. Cidade e área de atendimento são preferíveis no MVP.
9. Não apresentar identidade, qualificações, avaliações ou reputação como verificadas sem processo real de verificação.
10. Validar novamente no Apps Script/backend. Validação somente no React não protege os dados.
11. Não confiar em papel, ID de proprietário ou estado enviados pelo navegador sem validar a identidade e a autorização no servidor.
12. Não expor chaves privilegiadas, tokens, IDs sensíveis ou credenciais no bundle do Vite, no Git ou neste documento.
13. Aplicar limites de requisição e de upload compatíveis com as cotas do Apps Script.
14. Considerar LGPD, finalidade, minimização, transparência, retenção e proteção dos dados pessoais.

A publicação automática não significa conteúdo confiável. A plataforma precisa de mecanismos de denúncia e moderação posterior.

## 7. Direção visual aprovada

Direção de design definida para a homepage:

- Estilo híbrido: moderno, minimalista, acolhedor e regional.
- Paleta principal laranja com neutros claros e grafite.
- Hero com fotografia de profissional trabalhando e busca em destaque.
- Cards de serviços com fotografia e informações organizadas.
- Navegação responsiva e prioridade para dispositivos móveis.
- Busca como ação principal da homepage.
- Convite para profissionais divulgarem seu trabalho, sem competir visualmente com a busca.

A direção visual está definida, mas não deve ser descrita como implementada até a homepage real existir.

## 8. Regras de desenvolvimento e manutenção

- Preserve JavaScript/JSX e a estrutura simples do Vite.
- Prefira componentes pequenos e reutilizáveis, sem fragmentar funções triviais.
- Separe interface, acesso a dados, validação e regras de negócio.
- Centralize chamadas ao Apps Script em uma camada de serviços; evite URLs e lógica de integração espalhadas pelos componentes.
- Não duplicar regras de validação entre telas. Compartilhe schemas/helpers quando houver ganho real.
- Use estados claros para carregamento, sucesso, vazio e erro.
- Trate falhas de rede e respostas inválidas sem expor detalhes internos ao usuário.
- Não adicionar dependências sem necessidade.
- Não criar dados falsos como se fossem profissionais reais. Dados de demonstração devem ser identificados como exemplos.
- Mantenha o README, este contexto e o registro de ocorrências coerentes com o código.

## 9. Git, branches e commits

- Não presumir que a branch de produção deve receber mudanças diretamente.
- Antes de editar, confirmar branch, estado e commit atual.
- Preferir branches de trabalho com nomes claros, por exemplo `feat/nome-da-funcionalidade`, `fix/nome-do-problema` e `docs/nome-da-documentacao`.
- Usar mensagens de commit descritivas e consistentes, preferencialmente Conventional Commits.
- Pull Requests devem explicar objetivo, mudanças, validações executadas e limitações.
- Não declarar um Preview Vercel como produção nem confundir status de deploy com aprovação funcional.

## 10. Documentação e registro de problemas

- Este `AI_CONTEXT.md` descreve o estado atual e as regras de continuidade.
- `REGISTRO_DE_OCORRENCIAS.md` preserva o histórico de bugs, erros, vulnerabilidades e incidentes.
- Atualize o contexto narrativo no mesmo trabalho quando decisões ou comportamentos relevantes mudarem.
- O snapshot delimitado por marcadores é automatizado; não editar manualmente.
- Não apagar ocorrências resolvidas. Corrigir informações de maneira rastreável.
- O registro é público: incluir apenas resumos sanitizados e aprovados para divulgação.

## 11. Validação e publicação

Os comandos de validação são mantidos em `package.json`. O workflow de qualidade deve executar:

1. Instalação reproduzível com `npm ci`.
2. Validação estrutural do registro de ocorrências.
3. ESLint.
4. Build de produção do Vite.

Quando testes automatizados forem criados, adicioná-los aos scripts e ao workflow. Não criar etapas E2E ou Lighthouse só para imitar outro projeto; introduzi-las quando houver fluxos reais que justifiquem esses testes.

A Vercel hospeda o frontend. O workflow de CI valida o código, mas não substitui a conferência do deployment, do SHA publicado e testes manuais de navegação/responsividade. Não afirmar que o Google Apps Script, Sheets ou Drive estão funcionando antes de validar sua integração real.

## 12. Snapshot automatizado do repositório

<!-- BEGIN AUTO-GENERATED SECTION -->

## Snapshot automatizado do repositório

> Gerado por scripts/update-ai-context.mjs. Não edite manualmente o conteúdo entre os marcadores.

- **Commit de referência:** 6d8f2785f8f5cdb9da8b428a810dc57b5421467e
- **Data do commit:** 2026-11-06T16:48:11-03:00
- **Mensagem do commit:** ci: validar também atualizações documentais do bot
- **Branch desta execução:** chore/project-governance
- **Projeto declarado:** home-service@0.0.0
- **Scripts npm:** 6
- **Dependências de runtime:** 4
- **Dependências de desenvolvimento:** 9
- **Workflows:** 2
- **Scripts de automação:** 2

### Scripts npm

| Comando | Definição |
|---|---|
| npm run dev | vite |
| npm run build | vite build |
| npm run lint | eslint . |
| npm run preview | vite preview |
| npm run check:occurrences | node scripts/validate-occurrence-register.mjs |
| npm run update:ai-context | node scripts/update-ai-context.mjs |

### Variáveis declaradas no .env.example

> Somente os nomes são listados; valores nunca são lidos nem publicados.

- Nenhuma variável declarada.

### Dependências de runtime

| Pacote | Versão declarada |
|---|---|
| @tailwindcss/vite | ^4.3.5 |
| react | ^19.3.1 |
| react-dom | ^19.3.1 |
| tailwindcss | ^4.3.5 |

### Dependências de desenvolvimento

| Pacote | Versão declarada |
|---|---|
| @eslint/js | ^10.0.1 |
| @types/react | ^19.3.0 |
| @types/react-dom | ^19.3.0 |
| @vitejs/plugin-react | ^6.1.2 |
| eslint | ^10.14.0 |
| eslint-plugin-react-hooks | ^7.1.1 |
| eslint-plugin-react-refresh | ^0.5.7 |
| globals | ^17.13.0 |
| vite | ^8.3.6 |

### Workflows do GitHub Actions

- .github/workflows/ai-context.yml — AI Context — Synchronize
- .github/workflows/validate.yml — Validate Home Service

### Scripts de automação

- scripts/update-ai-context.mjs
- scripts/validate-occurrence-register.mjs

### Arquivos JavaScript/JSX em src/

- src/App.jsx
- src/main.jsx

### Diretórios principais de src/

- src/assets/

### Oito commits recentes até o commit de referência

| Commit | Data | Mensagem |
|---|---|---|
| 6d8f278 | 2026-11-06 | ci: validar também atualizações documentais do bot |
| 4d35058 | 2026-11-06 | docs(ai-context): atualizar snapshot automaticamente |
| e2fecf5 | 2026-11-06 | ci: adicionar auditoria de dependências |
| 99140b5 | 2026-11-06 | docs(ai-context): atualizar snapshot automaticamente |
| aa05e60 | 2026-11-06 | docs(ai-context): atualizar snapshot automaticamente |
| d564e8d | 2026-11-06 | fix: corrigir geração do snapshot do AI_CONTEXT |
| 60dc9bb | 2026-11-06 | fix: corrigir validação do registro de ocorrências |
| ea886b6 | 2026-11-06 | docs(ai-context): atualizar snapshot automaticamente |

<!-- END AUTO-GENERATED SECTION -->
