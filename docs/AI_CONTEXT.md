# Conecta Local — Contexto técnico para IAs

> Documento de continuidade do projeto. Leia antes de sugerir ou realizar alterações. Reúne propósito, decisões, arquitetura planejada, estado implementado, regras de manutenção e limitações. A seção de snapshot ao final é atualizada pelo GitHub Actions.

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
- **Finalidade:** projeto acadêmico integrador, com possibilidade de evolução após a entrega.
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

O levantamento funcional está consolidado em `docs/ESPECIFICACAO_MVP.md` v0.2. A Fase 3 deverá modelar dados e relacionamentos a partir desses requisitos. A autenticação não está liberada para implementação até a prova de conceito técnica descrita na especificação.

## 4. Estado atual do repositório

**Estado após integração da homepage pública à branch `dev` (PR #2) e consolidação documental em andamento:**

- A branch `dev` contém a homepage pública demonstrativa do Conecta Local, integrada por Pull Request.
- `src/pages/HomePage.jsx` coordena a composição das seções e o estado local da busca e dos filtros.
- `src/components/home/` contém cabeçalho, hero/busca e seções públicas reutilizáveis.
- `src/components/ui/` contém primitivas locais editáveis (Button, Input, Card e Badge) no padrão visual shadcn/ui.
- `components.json` e `jsconfig.json` preparam a estrutura para componentes JavaScript (`tsx: false`) e aliases `@/`; `vite.config.js` resolve o alias no Vite.
- `src/index.css` concentra tokens visuais, estilos globais, responsividade, foco visível e preferência por movimento reduzido.
- A busca e a seleção de categorias filtram somente registros demonstrativos em `src/data/homepage.js`. O campo de cidade é ilustrativo e não executa busca geográfica.
- Os perfis e as fotografias não representam profissionais cadastrados. A natureza demonstrativa é indicada na interface.
- As fotografias são carregadas de URLs externas do Pexels; a disponibilidade visual depende da conexão com esse serviço. Os créditos estão no README.
- A validação de Pull Requests destinados a `dev` foi habilitada no workflow de CI pela correção integrada no PR #3.
- O workflow de sincronização automática do AI Context e o workflow de validação foram executados com sucesso após a integração da homepage, conforme os registros consultados em 2026-11-09.
- `main` permanece fora do escopo desta etapa; `dev` é a linha de integração do trabalho em andamento.
- O arquivo Google Sheets estrutural foi criado pelo responsável pelo projeto com as 12 abas e os 102 cabeçalhos aprovados. A exportação XLSX foi inspecionada e a conferência manual de proteções e compartilhamento restrito foi confirmada pelo responsável.
- A planilha permanece uma estrutura inicial vazia, ainda sem uso como armazenamento operacional integrado.
- Não há backend Apps Script operacional integrado ao frontend, API, cadastro, autenticação, sessão, busca remota, envio de e-mail, upload no Drive ou painel administrativo.
- A homepage não processa pagamentos, agendamentos ou contratação.

A especificação v0.4 e `docs/MODELAGEM_DADOS.md` consolidam requisitos e modelagem lógica/física aprovados. `docs/ARQUITETURA_APPS_SCRIPT.md` registra a proposta inicial de arquitetura, seus limites e as provas de conceito obrigatórias. A criação da planilha estrutural foi concluída, mas isso não significa que Apps Script, API, Drive ou autenticação estejam integrados. Atualize esta seção somente quando funcionalidades reais forem implementadas e validadas.

## 5. Arquitetura e decisões tecnológicas

### 5.1. Frontend

- **React + JavaScript/JSX:** interface e componentes.
- **Vite 8:** servidor de desenvolvimento e build.
- **Node.js 24:** ambiente recomendado para ferramentas de desenvolvimento, scripts e build.
- **Tailwind CSS 4:** utilitários e integração com Vite; estilos específicos da homepage ficam em `src/index.css`.
- **shadcn/ui:** configuração em `components.json` no modo JavaScript (`tsx: false`), com aliases `@/`. As primitivas locais usadas nesta homepage são componentes editáveis no padrão visual shadcn; o CLI não é dependência de runtime.
- **Lucide React:** biblioteca de ícones da interface.

Não foi escolhida uma aplicação Next.js. Não adicionar Express por padrão: para manter o projeto simples, o Google Apps Script é a opção inicial de backend. Reavaliar somente se surgir requisito concreto que justifique uma API Node.js hospedada separadamente.

### 5.2. Backend e dados planejados

- **Google Apps Script:** backend de negócio planejado para autenticação, autorização, regras, integridade e acesso a Sheets/Drive. Ainda não está operacional nem integrado.
- **Vercel Functions:** gateway HTTP server-side aprovado conceitualmente para receber as chamadas same-origin do React e encaminhá-las ao Apps Script. Ainda não existe diretório api/ ou Function implementada na branch dev.
- **Google Sheets:** arquivo estrutural já criado pelo responsável, com 12 abas e 102 cabeçalhos aprovados; ainda não está integrado como armazenamento operacional.
- **Google Drive:** armazenamento futuro das imagens enviadas pelos profissionais; fluxo de upload e permissões ainda não implementado.

Fluxo aprovado para orientar a POC: React/Vite → rota same-origin da Vercel Function → Web App Apps Script → Google Sheets/Drive. A Function será somente gateway técnico: valida formato, tamanho, método, timeout, assinatura servidor-servidor e normalização de resposta. Não será dona das regras de negócio, dados, autenticação final ou autorização. O Apps Script continua sendo a autoridade de domínio e precisa recusar chamadas diretas sem uma assinatura válida do gateway. Não usar CORS do navegador para falar diretamente com Apps Script.

A estratégia de assinatura gateway→Apps Script e o possível cookie HttpOnly emitido pela Vercel continuam sujeitos a provas de conceito. A Function poderá emitir o cookie no domínio da aplicação; o Apps Script continuará validando o token e a sessão. A proposta completa, incluindo riscos, critérios de aceite e limites de TextOutput, está em [docs/ARQUITETURA_APPS_SCRIPT.md](./ARQUITETURA_APPS_SCRIPT.md). Google Sheets é uma solução de armazenamento simplificada para o escopo acadêmico; não é um banco relacional. Considerar concorrência, cotas, limites de execução, latência e integridade. Não prometer capacidade de produção em grande escala.

### 5.3. Modelagem lógica e física de dados aprovada

A modelagem lógica e o esquema físico estão consolidados em [`docs/MODELAGEM_DADOS.md`](./MODELAGEM_DADOS.md): 12 entidades e 102 campos lógicos, com 12 abas e 102 colunas físicas. O documento define UUIDs, PKs/FKs lógicas, cardinalidades, ordem de abas e colunas, tipos de célula, campos opcionais, valores controlados, unicidade, integridade, estados, visibilidade, privacidade e persistência no Sheets/Drive.

Entidades/abas: `USUARIOS`, `PROFISSIONAIS`, `SESSOES`, `CODIGOS_VERIFICACAO`, `CONTROLE_AUTENTICACAO`, `SERVICOS`, `CATEGORIAS`, `CIDADES`, `SERVICO_CIDADES`, `IMAGENS`, `DENUNCIAS` e `AUDITORIA`. A estrutura prevê um único arquivo Google Sheets; linha 1 para cabeçalhos e linha 2 em diante para registros; UUIDs/textos como texto; datas como ISO 8601 UTC; números em células numéricas; células vazias para opcionais; validações do Sheets apenas auxiliares, com Apps Script como autoridade.

Google Sheets não impõe automaticamente FKs, unicidade composta ou integridade relacional; esses controles pertencem ao Apps Script e exigem testes de concorrência. **A planilha estrutural foi criada e conferida; não há registros de negócio nem integração operacional.** A inserção futura deverá usar exclusivamente dados sintéticos e ocorrer após a validação dos fluxos de backend.

### 5.4. Autenticação, e-mail e imagens — decisões e bloqueios

A proposta de arquitetura do backend e o plano das provas de conceito estão em [docs/ARQUITETURA_APPS_SCRIPT.md](./ARQUITETURA_APPS_SCRIPT.md). Esse documento não autoriza a implementação: transporte, KDF de senha e sessão permanecem bloqueados até serem testados e aprovados.

**Decisão funcional para a demonstração**
- Cadastro e login próprios por e-mail e senha, com lógica no Apps Script; não adicionar Firebase ou provedor externo sem reabrir a decisão.
- A demonstração utilizará dados fictícios e não deverá receber senhas ou dados reais.
- Conta nasce em `pending_activation`; confirmação de e-mail simulada por código de 6 dígitos, validade de 10 minutos, máximo 5 tentativas e intervalo de 60 segundos para novo código.
- Recuperação de senha usa as mesmas regras de código; novo código invalida o anterior; uso único.
- O código é exibido somente na demonstração. Envio real por e-mail é uma etapa futura e deverá respeitar quotas e falhas do MailApp.
- Senha: mínimo 15 caracteres, suporte a pelo menos 64, sem exigência de classes de caracteres, rejeição de senhas comuns e sem troca periódica obrigatória.
- Login: 5 falhas dentro de uma janela de contabilização de 15 minutos geram bloqueio de 15 minutos; controle no backend por HMAC do e-mail normalizado; mensagens genéricas; testar abuso de bloqueio contra contas.
- Sessões: 30 minutos de inatividade, máximo 8 horas; logout, alteração/recuperação de senha, suspensão e encerramento revogam sessões.
- Alteração de e-mail só efetiva após confirmação do novo endereço; endereço anterior continua válido até então.
- Primeiro administrador criado manualmente por procedimento controlado; papel administrativo nunca é definido por valor livre do frontend.
- Toda conta `professional` precisa possuir exatamente um perfil válido em `PROFISSIONAIS` antes de ser ativada; conta `admin` não exige perfil. Mudança de papel que gere vínculos inconsistentes fica bloqueada até procedimento seguro e auditado.

**Bloqueios técnicos antes de implementar**
- Não armazenar senhas em texto puro e não usar SHA/digest rápido isolado como armazenamento de senha.
- A referência oficial de Apps Script Utilities documenta operações de digest e HMAC; não presumir que exista um KDF de senha pronto. Avaliar implementação adequada e revisada (por exemplo, PBKDF2-HMAC-SHA-256, se viável), parâmetros, salt individual, comparação e desempenho. Não inventar criptografia caseira.
- Provar como uma sessão será transportada, persistida, expirada e revogada entre React, Vercel Function e Apps Script. A Vercel Function poderá emitir um cookie HttpOnly no domínio da aplicação, mas a estratégia, atributos e controles CSRF ainda exigem POC. O Apps Script permanece a autoridade que valida a sessão; não escolher armazenamento de token no navegador sem evidência.
- Testar concorrência e o risco de um atacante bloquear uma conta provocando tentativas incorretas.
- A prova de conceito deverá usar dados sintéticos e não será considerada pronta para produção.

**Imagens no Drive**
- Decisão funcional: imagens de serviços publicados e contas ativas poderão ser visualizadas por link; serviços pausados, suspensos ou removidos e contas suspensas/encerradas terão acesso restringido.
- O fluxo pretendido usa permissões equivalentes a `ANYONE_WITH_LINK` para visualização e `PRIVATE` para restringir, quando permitido pela conta. Pasta raiz privada; compartilhamento individual por arquivo; limite exato de 5.000.000 bytes; no máximo 1 imagem ativa por perfil e 5 por serviço, com posições exclusivas de 1 a 5. Testar em arquivos individuais e tratar falhas parciais.
- Links públicos podem ser copiados e imagens podem ser baixadas; revogar a permissão não apaga cópias já obtidas. Não tratar esconder a URL na interface como controle de acesso.

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

- Este `AI_CONTEXT.md` descreve o estado atual e as regras de continuidade.
- `ESPECIFICACAO_MVP.md` v0.4 consolida requisitos funcionais e as Fases 3 e 4; `MODELAGEM_DADOS.md` contém a modelagem lógica e o esquema físico aprovado conceitualmente (12 entidades/102 campos e 12 abas/102 colunas). Validações técnicas e implementação continuam pendentes.
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

Quando testes automatizados forem criados, adicioná-los aos scripts e ao workflow. Não criar etapas E2E ou Lighthouse só para imitar outro projeto; introduzi-las quando houver fluxos reais que justifiquem esses testes.

A Vercel hospeda o frontend. O workflow de CI valida o código, mas não substitui a conferência do deployment, do SHA publicado e testes manuais de navegação/responsividade. Não afirmar que o Google Apps Script, Sheets ou Drive estão funcionando antes de validar sua integração real.

## 13. Snapshot automatizado do repositório

<!-- BEGIN AUTO-GENERATED SECTION -->

## Snapshot automatizado do repositório

> Gerado por scripts/update-ai-context.mjs. Não edite manualmente o conteúdo entre os marcadores.

- **Commit de referência:** f470abb79f7b3a3826f7d360e716f9cade020cc1
- **Data do commit:** 2026-11-10T17:33:03-03:00
- **Mensagem do commit:** docs(architecture): adotar Vercel Functions como gateway HTTP
- **Branch desta execução:** docs/arquitetura-gateway-vercel
- **Projeto declarado:** home-service@0.0.0
- **Scripts npm:** 6
- **Dependências de runtime:** 5
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
| lucide-react | ^1.61.0 |
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
- src/components/home/hero-search.jsx
- src/components/home/home-sections.jsx
- src/components/home/site-header.jsx
- src/components/ui/badge.jsx
- src/components/ui/button.jsx
- src/components/ui/card.jsx
- src/components/ui/input.jsx
- src/data/homepage.js
- src/lib/utils.js
- src/main.jsx
- src/pages/HomePage.jsx

### Diretórios principais de src/

- src/components/
- src/data/
- src/lib/
- src/pages/

### Oito commits recentes até o commit de referência

| Commit | Data | Mensagem |
|---|---|---|
| f470abb | 2026-11-10 | docs(architecture): adotar Vercel Functions como gateway HTTP |
| 3f9a084 | 2026-11-10 | docs(ai-context): atualizar snapshot automaticamente |
| ae160fa | 2026-11-10 | Merge pull request #8 from kleber-goncalves/docs/arquitetura-apps-script |
| d56f3cd | 2026-11-10 | docs(ai-context): atualizar snapshot automaticamente |
| 7672767 | 2026-11-10 | docs(modelagem): corrigir estado do esquema físico |
| 5994c1e | 2026-11-10 | docs(ai-context): atualizar snapshot automaticamente |
| 941e770 | 2026-11-10 | docs(spec): alinhar próxima etapa à arquitetura Apps Script |
| 4a275aa | 2026-11-10 | docs(modelagem): atualizar estado da planilha e próximos passos |

<!-- END AUTO-GENERATED SECTION -->
