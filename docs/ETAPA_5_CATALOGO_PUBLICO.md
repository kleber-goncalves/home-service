# Etapa 5 — Experiência pública e catálogo de serviços

> **Status:** planejamento aprovado em 21/11/2026; implementação ainda não iniciada.
>
> **Branch de trabalho:** `feat/public-discovery-experience`, criada a partir de `dev`.
>
> **Destino de integração:** `dev`, somente após implementação, validação e revisão. `main` e Production permanecem fora do escopo.
>
> **Ambiente de validação:** Vercel Preview da branch, com dados fictícios e serviços/imagens autorizados para demonstração.

## 1. Objetivo

Reorganizar a experiência pública do Conecta Local para que o visitante consiga entender a proposta rapidamente, encontrar serviços e conhecer o profissional responsável sem enfrentar uma homepage longa e repetitiva.

A etapa reúne quatro entregas relacionadas:

1. Simplificar a homepage, mantendo apenas uma apresentação curta, três categorias em destaque e quatro ou cinco serviços em evidência.
2. Criar uma página completa de catálogo com busca textual e filtros por categoria e cidade.
3. Criar uma página com todas as categorias ativas.
4. Criar a página individual de cada serviço, incluindo galeria com até cinco imagens e formas de contato.

A referência de mercado indicada pelo responsável é a organização de descoberta e navegação da página GetNinjas Preço Fechado. A inspiração é estrutural; não copiar identidade visual, textos, imagens, componentes proprietários ou funcionalidades que não façam parte do escopo acadêmico.

## 2. Princípios de UX e conteúdo

- **Homepage objetiva:** apresentar o que a plataforma faz e conduzir o visitante à busca ou ao catálogo.
- **Descoberta progressiva:** mostrar uma amostra pequena na página inicial e oferecer páginas próprias para explorar tudo.
- **Informação verdadeira:** não misturar exemplos fictícios e registros reais como se fossem equivalentes.
- **Contato claro:** o visitante deve entender quem oferece o serviço e como entrar em contato.
- **Mobile-first:** busca, filtros, cards, galeria e navegação precisam funcionar em telas pequenas.
- **Acessibilidade:** HTML semântico, foco visível, teclado, nomes acessíveis, contraste, textos alternativos e respeito a `prefers-reduced-motion`.
- **Escopo acadêmico:** não replicar um marketplace comercial completo nem criar infraestrutura sem necessidade demonstrada.

## 3. Estrutura planejada das páginas

### 3.1. Homepage — `/`

A homepage deverá ter, nesta ordem, apenas as seções necessárias à descoberta:

1. **Cabeçalho:** marca, navegação principal e acesso à área do profissional já existente.
2. **Hero de busca:** título curto, campo para procurar um serviço e seleção/entrada de cidade. A busca deve encaminhar para o catálogo com os filtros preenchidos.
3. **Categorias em destaque:** apresentar somente três categorias ativas, com um botão/link **Ver todas as categorias** para `/categorias`.
4. **Serviços em destaque:** mostrar quatro ou cinco cards reais e elegíveis. Incluir **Ver todos os serviços** para `/servicos`.
5. **Como funciona:** explicação compacta em até três passos, sem repetir conteúdo já apresentado no hero.
6. **Chamada para profissionais e rodapé:** uma chamada objetiva para divulgar serviços e os links institucionais necessários.

Revisar as seções atuais e remover, fundir ou reduzir blocos repetitivos/estáticos que aumentem a rolagem sem melhorar a descoberta. Não manter várias seções diferentes apenas para repetir categorias, serviços populares, benefícios, explicações e perguntas frequentes.

**Regra de demonstração:** quando existirem serviços publicados reais da base de Preview, priorizá-los na vitrine. Se não houver registros elegíveis, os exemplos estáticos poderão aparecer apenas com identificação visível de **exemplo de demonstração**. Eles não podem parecer serviços cadastrados por pessoas reais nem oferecer contato funcional fictício.

### 3.2. Catálogo — `/servicos`

Criar uma página dedicada para listar os serviços públicos elegíveis.

**Elementos principais:**
- título e descrição curta;
- campo de busca por nome do serviço, descrição e nome público do profissional;
- filtro de categoria;
- filtro de cidade;
- contador de resultados;
- ação para limpar filtros;
- cards de serviços;
- estados de carregamento, erro, lista vazia e nenhum resultado para os filtros;
- opção de ordenar por publicação mais recente, se os campos retornados já permitirem isso de forma consistente.

**Comportamento:**
- aceitar filtros na URL, por exemplo `/servicos?q=eletricista&categoria=<id>&cidade=<id>`;
- atualizar o catálogo ao alterar os filtros;
- preservar filtros ao recarregar a página e permitir compartilhar o endereço;
- combinar os filtros com lógica AND;
- não mostrar serviços em rascunho, pausados, suspensos, removidos ou pertencentes a contas inelegíveis;
- não criar avaliações, preços, reputação ou disponibilidade que não sejam dados reais retornados pelo backend.

**Limite conhecido:** a consulta pública atual entrega até 100 serviços publicados. A primeira versão deverá trabalhar dentro do contrato existente e deixar esse limite explícito na avaliação técnica. Não criar paginação fictícia nem afirmar que o catálogo é ilimitado. Caso a demonstração precise superar esse limite, avaliar uma alteração específica e segura na consulta pública antes de implementá-la.

### 3.3. Todas as categorias — `/categorias`

Criar uma página que apresente todas as categorias ativas retornadas pelo catálogo.

- Na homepage aparecem apenas três categorias em destaque.
- O botão **Ver todas as categorias** abre `/categorias`.
- Cada categoria deve levar ao catálogo filtrado, por exemplo `/servicos?categoria=<id>`.
- Usar os dados ativos de `CATEGORIAS` como fonte de verdade; não oferecer categorias inativas para novas pesquisas.
- Não adicionar uma tela administrativa de categorias nesta etapa.
- A regra de escolha/ordem das três categorias em destaque deve ser simples e documentada; não criar configuração dinâmica complexa sem necessidade.

### 3.4. Detalhes do serviço — `/servicos/:id`

Criar uma página pública por serviço, acessível tanto pelo card quanto por URL direta.

**Conteúdo:**
- galeria com as imagens ativas do serviço, até o limite de cinco;
- imagem principal, navegação anterior/próxima e indicação de posição, como `2 de 5`;
- miniaturas acessíveis quando houver espaço e benefício;
- categoria, nome e descrição completa do serviço;
- cidade principal e demais cidades de atendimento;
- nome público do profissional e informações públicas já permitidas;
- ação clara para contato pelo WhatsApp, usando somente o número público retornado pelo backend;
- navegação de retorno ao catálogo, preservando os filtros quando possível.

**Estados obrigatórios:**
- serviço inexistente ou que deixou de ser público;
- serviço sem imagens;
- imagem individual que falha ao carregar;
- falha de rede ou consulta pública indisponível.

Não revelar IDs internos desnecessários, e-mail, telefone privado, endereço residencial ou dados de sessão. A rota de detalhes nunca pode transformar um serviço privado em público.

## 4. Padrão dos cards de serviço

O card deve ser um resumo, não uma galeria completa.

**Imagem do card:**
- exibir uma única imagem principal (primeira imagem ativa válida);
- quando houver mais imagens, mostrar um indicador discreto, por exemplo **+4 fotos**;
- não tentar renderizar cinco imagens simultaneamente no card;
- ao selecionar o card, abrir a página de detalhes, onde a galeria completa estará disponível;
- sem imagem válida, mostrar um placeholder neutro e consistente;
- não substituir silenciosamente a imagem ausente de um registro real por uma fotografia aleatória de outra categoria.

**Informações do card:**
- categoria;
- nome do serviço;
- descrição resumida, limitada visualmente a aproximadamente duas linhas;
- cidade principal e indicação de outras cidades, quando aplicável;
- nome público do profissional;
- ação principal **Ver detalhes**;
- contato direto apenas quando o número público estiver presente e a regra de UX definida não competir com a ação principal.

Não acrescentar avaliação, estrelas, quantidade de clientes, selo de verificação, preço ou prazo se esses dados não existirem e não forem confiáveis.

## 5. Diagnóstico e apresentação das imagens

A integração da Etapa 4 já permite até cinco imagens ativas por serviço e devolve uma coleção de imagens no fluxo público. A interface atual da homepage transforma essa coleção em uma única propriedade de imagem e o card renderiza somente uma imagem. Isso explica por que a vitrine não apresenta uma galeria, mas **não prova, por si só, a causa de uma primeira imagem que aparece totalmente em branco**.

A implementação deverá separar esses dois problemas.

### 5.1. Diagnóstico da imagem principal

Antes de alterar o componente visual, conferir no Preview:

1. se a resposta de `public.services` inclui `images` para o serviço testado;
2. se a primeira imagem possui uma URL não vazia e corresponde ao arquivo esperado;
3. se a requisição da URL da imagem conclui sem erro no painel Network;
4. se o elemento `img` termina com `naturalWidth > 0` e `naturalHeight > 0`;
5. se o navegador reporta bloqueio, redirecionamento, resposta inválida ou falha de carregamento.

Registrar a causa observada antes de alterar permissões do Drive ou o backend. Não presumir que o limite de cinco imagens, por si só, causa a falha da primeira.

### 5.2. Modelo no frontend

Preservar todas as imagens do serviço no modelo de apresentação, em vez de descartar as posições posteriores à primeira.

A estrutura visual deverá consumir os campos existentes, equivalentes a:
- `images[]`: coleção de imagens ativas e ordenadas;
- `image`/capa: primeira imagem utilizável, derivada da coleção;
- `imageCount`: quantidade real de imagens utilizáveis, derivada da coleção.

Esses nomes são uma orientação de apresentação, não uma alteração obrigatória do contrato do Apps Script. Evitar duplicar dados no backend apenas para facilitar o card.

### 5.3. Falhas e permissões

- Imagens de serviços publicados e contas elegíveis continuam sujeitas às regras de compartilhamento implementadas na Etapa 4.
- Serviços pausados, suspensos, removidos ou inelegíveis não devem ser mostrados no catálogo público, mesmo que seus arquivos existam no Drive.
- Falha de carregamento de uma imagem não deve derrubar o card ou a página inteira.
- Não tornar a pasta raiz do Drive pública.
- Não expor URI de sessão de upload, token OAuth ou qualquer segredo no navegador.
- Não contornar a política de permissões com links públicos criados manualmente.

## 6. Dados e integração

A primeira versão deverá reutilizar os contratos públicos e as entidades atuais:

- `public.services` para serviços elegíveis;
- categorias ativas retornadas pela consulta pública;
- cidades e cobertura do serviço já existentes;
- coleção de imagens ativas associadas a cada serviço.

Não criar novas abas no Google Sheets, banco de dados, serviço de busca externo, geolocalização, indexador ou endpoint sem demonstrar uma necessidade que a consulta existente não consiga atender.

Preservar o filtro de propriedade e elegibilidade no Apps Script. Filtros executados no React melhoram a experiência, mas não constituem controle de acesso.

**Dados fictícios:** separar visualmente os exemplos estáticos da informação persistida. O catálogo não deve misturar profissionais de demonstração e registros reais de forma indistinguível. Exemplos não podem simular depoimentos, reputação ou contatos reais.

## 7. Navegação e compatibilidade

A aplicação usa atualmente parâmetros de consulta para abrir fluxos especiais, como `?auth=demo` e `?poc=01`. A navegação pública por páginas exige URLs próprias, suporte a acesso direto, recarregamento e histórico do navegador.

Planejar roteamento declarativo (React Router, após confirmar a compatibilidade da versão com o projeto) para:
- `/` — homepage;
- `/servicos` — catálogo;
- `/categorias` — todas as categorias;
- `/servicos/:id` — detalhes de um serviço.

Preservar os fluxos atuais `?auth=demo` e `?poc=01` durante a migração. Não quebrar login, área do profissional, testes POC ou o fallback de URLs do Vercel. Verificar configuração de fallback para rotas SPA e acesso direto a cada rota no Preview.

## 8. Critérios de aceitação

### Homepage
- [ ] A página inicial tem hierarquia mais curta e não repete blocos de conteúdo.
- [ ] Exibe até três categorias em destaque e link para todas.
- [ ] Exibe quatro ou cinco serviços elegíveis e link para o catálogo completo.
- [ ] Busca inicial abre o catálogo com os termos/localidade preservados.
- [ ] Exemplos demonstrativos são claramente identificados e não fingem ser contatos reais.

### Catálogo e categorias
- [ ] `/servicos` abre por navegação interna e acesso direto.
- [ ] Busca textual, categoria e cidade podem ser combinadas.
- [ ] Filtros ficam representados na URL e continuam aplicados após recarregar.
- [ ] Limpar filtros restaura o conjunto inicial.
- [ ] Contador, estado vazio, erro e carregamento são compreensíveis.
- [ ] `/categorias` lista as categorias ativas e direciona para o filtro correto.

### Cards e detalhes
- [ ] O card usa somente uma imagem principal e informa a quantidade de imagens adicionais.
- [ ] Cards de serviços sem imagens exibem placeholder neutro.
- [ ] Um erro de imagem não quebra a listagem.
- [ ] A página `/servicos/:id` mostra de uma a cinco imagens disponíveis e sua navegação.
- [ ] Um serviço privado, pausado, suspenso, removido ou inexistente não é exposto por URL direta.
- [ ] Descrição, categoria, cidades e nome público correspondem aos dados do serviço.
- [ ] O WhatsApp usa somente o contato público validado retornado pela API.

### Regressão
- [ ] `?auth=demo` continua abrindo o fluxo profissional atual.
- [ ] `?poc=01` continua abrindo a POC-01 de acordo com o estado atual.
- [ ] A navegação por voltar/avançar funciona.
- [ ] Layout e filtros funcionam em desktop e mobile.
- [ ] A suíte automatizada aplicável, ESLint e build passam.
- [ ] O Preview da branch é validado com dados fictícios sem alterar Production.

## 9. Fora do escopo

- Cadastro de avaliações, comentários ou estrelas.
- Pagamentos, orçamento, contratação, agendamento ou chat.
- Favoritos, recomendações por IA ou ranking comercial.
- Geolocalização/GPS e mapas.
- Painel administrativo ou gestão de categorias.
- Alteração do modelo de permissões do Drive sem evidência de falha.
- Novas abas/tabelas ou migração de banco.
- Operação com dados pessoais reais ou ativação do backend em Production.

## 10. Ordem de implementação recomendada

1. Inspecionar os componentes atuais e reproduzir/diagnosticar a falha de imagem principal.
2. Definir o modelo compartilhado de apresentação do serviço, preservando a coleção de imagens.
3. Criar o padrão de card com capa única, indicador de quantidade e fallback neutro.
4. Adicionar roteamento e páginas de catálogo, categorias e detalhes, preservando os fluxos atuais.
5. Integrar busca/filtros e persistência dos filtros na URL.
6. Reorganizar a homepage para três categorias e quatro/cinco serviços em destaque.
7. Revisar responsividade, acessibilidade, estados de erro/vazio e regressões.
8. Atualizar documentação com o estado realmente entregue, abrir PR para `dev` e validar CI/Preview antes de qualquer integração.

A implementação deve avançar por incrementos funcionais pequenos. Não declarar a etapa concluída até que os critérios de aceitação e a validação no Preview tenham sido registrados.

## 11. Decisões de segurança e publicação

- Continuar usando dados fictícios e arquivos sintéticos/licenciados.
- Manter o backend operacional somente no Vercel Preview.
- Não adicionar variáveis de backend ao ambiente Production.
- Não promover a branch para `main` nem alterar o alias de Production.
- Não alterar segredos, Script Properties ou permissões do Drive sem necessidade e autorização.
- O Apps Script continua sendo autoridade para identidade, propriedade, estado e elegibilidade.
- A rota pública deve retornar somente os campos destinados à visualização pública.

## 12. Estado desta etapa

Em 21/11/2026, o responsável aprovou o escopo descrito neste documento. A branch `feat/public-discovery-experience` foi criada a partir de `dev` para organizar o trabalho.

**Nenhuma funcionalidade desta Etapa 5 está implementada neste momento.** A documentação registra o trabalho aprovado, não um resultado entregue. A etapa só poderá ser marcada como concluída após implementação, testes, validação manual no Preview e integração em `dev`.

