# Plano — catálogo público, navegação e apresentação de imagens

> **Atualizado em:** 21/11/2026  
> **Status:** PR #28 e PR #29 integradas em `dev`; Apps Script sincronizado/atualizado e validação manual integrada do gateway de imagens aprovada no Preview em 21/11/2026.
> **Branch de referência:** `dev` (documentação consolidada após a PR #29).
> **Preview integrado da planilha:** https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app — deployment verificado `dpl_3me1dDL9tjaeQveKPFx8YXYfrDm3` (`READY`, commit `cf0e932`).
> **Segurança:** dados fictícios; não duplicar nem ampliar escopo de segredos Vercel. Production permanece fora deste trabalho.

## 1. Objetivo

Evoluir a vitrine pública do Conecta Local para que a pessoa consiga entender a proposta rapidamente, descobrir serviços por pesquisa e filtros e visualizar as imagens cadastradas por cada profissional.

O foco desta frente é a experiência pública: organização da homepage, catálogo, categorias, cartões e detalhes dos serviços. O cadastro/autenticação do profissional, o upload no Drive e as regras de segurança existentes devem ser preservados.

Este documento registra o escopo e o estado de implementação. As rotas públicas foram integradas em `dev` pela PR #28 e corrigidas pela PR #29. A validação integrada com Apps Script/Sheets/Drive foi executada no Preview fixo da branch `dev`; os Preview de outras branches não recebem as variáveis restritas a `gitBranch: dev`.

## 2. Diagnóstico do comportamento atual

A análise do código de `dev` identificou estes pontos:

- A homepage está concentrada em `src/pages/HomePage.jsx` e reúne diversas seções, incluindo categorias, profissionais/serviços, serviços populares estáticos, apresentação, etapas de funcionamento, FAQ e CTA.
- A pesquisa atual filtra os itens carregados na própria homepage e conduz o usuário até a seção de profissionais; ainda não existe uma página dedicada ao catálogo completo.
- A seção de serviços populares é conteúdo ilustrativo estático, não um filtro aplicado aos serviços cadastrados.
- A homepage combina registros públicos retornados por `public.services` com dados ilustrativos locais. Isso exige separar visualmente exemplos de demonstração dos serviços realmente cadastrados, evitando que exemplos sejam interpretados como ofertas reais.
- O backend público já retorna os metadados das imagens ativas do serviço em `images`. O mapeamento da homepage, porém, conserva apenas a primeira URL como `image`; as demais imagens não chegam ao cartão como uma coleção.
- O cartão atual renderiza uma única imagem. Não existe indicação visual de que o serviço possui outras fotos nem uma galeria pública com navegação entre elas.
- O gerenciador permite até cinco imagens ativas por serviço. Portanto, a capacidade já aceita pelo cadastro não está refletida na experiência pública.

### 2.1. Atenção: galeria ausente e falha de carregamento são problemas diferentes

A ausência de uma galeria explica por que o visitante não consegue visualizar as cinco imagens. **Ela não comprova, sozinha, por que a primeira imagem pode aparecer em branco.**

A primeira etapa de implementação deverá verificar separadamente:

1. Se `public.services` entrega a lista `images` e a URL da primeira imagem esperada.
2. Se o navegador solicita essa URL e qual resposta recebe (status, redirecionamentos e tipo de conteúdo).
3. Se o arquivo continua elegível para visualização por link no Drive, conforme o estado do serviço e da conta.
4. Se a imagem realmente decodifica no navegador (por exemplo, largura natural maior que zero) e se há erro de carregamento/CORS/conteúdo.
5. Se o problema ocorre com todas as imagens, apenas com a primeira, ou somente em determinados serviços/navegadores.

Não alterar permissões do Drive, não tornar a pasta pública e não introduzir URLs alternativas sem identificar a causa. Se a URL falhar, o cartão deverá apresentar um placeholder neutro e uma mensagem visual consistente, nunca uma fotografia de outra categoria apresentada como se fosse daquele profissional.

### 2.2. Estado da implementação inicial

- O backend Apps Script já retorna todas as imagens ativas em `images[]`, ordenadas por `ordem_exibicao`; o fluxo de upload limita a cinco imagens por serviço.
- O código frontend anterior reduzia a coleção a `images[0]?.url` e o cartão não tinha fallback `onError`. Assim, as imagens adicionais eram descartadas e uma falha da primeira imagem deixava o elemento quebrado.
- A nova camada de catálogo preserva `images[]`, valida o contrato da URL pública do Drive e ordena as imagens; o cartão mostra uma imagem principal e `+N fotos`; a página de detalhes apresenta a galeria e controles. Imagem ausente/quebrada recebe placeholder neutro.
- **Resultado do diagnóstico:** a rota pública direta do Drive foi substituída por um gateway same-origin Vercel + Apps Script HMAC. A entrega real foi validada com arquivos do Drive no Preview fixo de `dev`: HTTP 200 para imagens elegíveis, HTTP 404 para imagens bloqueadas/removidas e recuperação após republicação. O gateway não expõe token OAuth ao navegador.

## 3. Estrutura pública planejada

A navegação terá quatro destinos principais:

| Rota | Finalidade |
|---|---|
| `/` | Homepage compacta de apresentação e destaque |
| `/servicos` | Catálogo completo com pesquisa e filtros |
| `/categorias` | Relação de todas as categorias ativas |
| `/servicos/:serviceId` | Detalhes do serviço e galeria de imagens |

A implementação deverá usar navegação por rotas com suporte a URL direta, voltar/avançar do navegador e atualização da página. A escolha da biblioteca e a configuração de fallback da Vercel serão verificadas antes de implementar. Os acessos já existentes `?auth=demo` e `?poc=01` precisam continuar funcionando exatamente como hoje; não devem ser capturados pelas novas rotas públicas.

### 3.1. Homepage — apresentação enxuta

A homepage deixará de tentar apresentar todo o catálogo e passará a conduzir o visitante às páginas especializadas.

Ordem proposta:

1. **Cabeçalho:** marca e links principais para Início, Serviços e Categorias.
2. **Hero com pesquisa:** campo para o que a pessoa procura e campo/filtro de cidade, com ação para ver resultados.
3. **Categorias em destaque:** apresentar somente três categorias ativas, com ação **Ver todas as categorias** apontando para `/categorias`.
4. **Serviços em destaque:** mostrar quatro ou cinco cartões, com ação **Ver todos os serviços** apontando para `/servicos`.
5. **Como funciona:** versão curta em três passos, sem repetir explicações longas.
6. **Chamada para profissionais e rodapé:** manter somente o conteúdo que ajude a entender a proposta ou acessar a área correspondente.

Seções estáticas ou institucionais podem ser mantidas quando acrescentam orientação e contexto (incluindo `PopularServices`, `AboutSection` e `FAQSection`, restauradas pela PR #29); devem permanecer distintas do catálogo e não aparentar ser resultados de busca.

A homepage é uma amostra, não o catálogo completo. O limite de quatro ou cinco serviços será apenas de apresentação; não deve limitar a quantidade de registros cadastrados ou retornados no catálogo.

### 3.2. Página `/servicos` — catálogo completo

A página terá:

- Campo de pesquisa textual.
- Filtro por categoria.
- Filtro por cidade atendida.
- Ação para limpar filtros.
- Quantidade de resultados encontrados.
- Cartões reutilizáveis de serviço.
- Estado de carregamento, estado vazio e mensagem de erro.
- Paginação local ou ação **Carregar mais** se a quantidade de resultados justificar; evitar rolagem infinita no primeiro ciclo.

A pesquisa deverá considerar somente campos realmente retornados pela API pública, como título, descrição e nome público do profissional. O filtro de cidade precisa considerar todos os municípios associados ao serviço, não apenas a cidade principal.

Os filtros devem ser refletidos nos parâmetros da URL, por exemplo:

- `/servicos?q=eletrica`
- `/servicos?categoria=<categoryId>`
- `/servicos?cidade=<cityId>`

Os nomes e IDs válidos devem vir dos dados do catálogo; não codificar categorias ou cidades específicas como se fossem universais.

**Estratégia inicial:** reutilizar `public.services` e filtrar no cliente os serviços públicos carregados, respeitando o limite atual de retorno (até 100 registros). Não criar um mecanismo de busca externo ou uma nova infraestrutura. Se o limite, o tamanho da resposta ou a necessidade de paginação real se tornar uma restrição comprovada, avaliar uma operação pública específica e paginada em trabalho separado.

### 3.3. Página `/categorias` — catálogo de categorias

- Exibir todas as categorias ativas retornadas pelo catálogo.
- Cada categoria deve encaminhar para `/servicos?categoria=<categoryId>`.
- A homepage exibirá somente três categorias em destaque e o link **Ver todas as categorias**.
- Não duplicar a lista de categorias no frontend quando o catálogo ativo já for a fonte de dados.

A regra de seleção/ordenação dos três destaques deverá respeitar a ordem do catálogo retornado. Uma curadoria manual só será adicionada se houver um campo/regra de ordenação real e documentado.

### 3.4. Página `/servicos/:serviceId` — detalhes e galeria

A página de detalhes será a principal área de apresentação de todas as imagens do serviço.

Conteúdo previsto:

- Galeria com até cinco imagens ativas.
- Imagem principal em destaque, controles para avançar/voltar e miniaturas quando houver mais de uma imagem.
- Indicador de posição, por exemplo, `2 de 5`.
- Categoria, nome do serviço e descrição completa.
- Cidades atendidas, incluindo todas as associações disponíveis.
- Nome público do profissional.
- Ação **Entrar em contato** pelo WhatsApp público cadastrado.

O acesso direto à URL deverá funcionar após recarregar a página. Na primeira versão, reutilizar o contrato de dados públicos existente sempre que ele atender à consulta. Só criar uma operação `public.service` por ID se a leitura do catálogo atual não for suficiente ou se o limite de 100 registros impedir localizar um serviço válido. A operação, se necessária, deverá retornar somente campos públicos e respeitar as mesmas regras de publicação e elegibilidade já aplicadas pelo backend.

Não exibir endereço residencial, e-mail privado, telefone alternativo ou qualquer dado que não faça parte do contrato público.

## 4. Padrão dos cartões de serviço

Será criado ou consolidado um componente reutilizável de cartão para a homepage e a página `/servicos`.

### 4.1. Conteúdo do cartão

- Uma imagem principal.
- Indicador `+N fotos` quando existirem outras imagens ativas.
- Categoria.
- Nome do serviço.
- Descrição curta, limitada visualmente a aproximadamente duas linhas.
- Cidade principal e indicação de outras cidades atendidas quando existirem.
- Nome público do profissional.
- Ação principal **Ver detalhes**, abrindo `/servicos/:serviceId`.

O contato pelo WhatsApp ficará disponível na página de detalhes, evitando sobrecarregar cada cartão com várias ações. Não criar avaliações, estrelas, depoimentos, selo de verificação, preço ou disponibilidade fictícios. Só apresentar preço se o contrato público realmente disponibilizar o campo e a regra de exibição estiver confirmada na implementação.

### 4.2. Tratamento das imagens no cartão

- O cartão apresenta somente uma imagem para manter altura, leitura e alinhamento consistentes.
- Se o serviço tiver mais imagens, um indicador informa a quantidade restante; as outras fotos ficam na galeria de detalhes.
- Se não houver imagem, usar placeholder neutro e acessível.
- Se a imagem principal falhar, mostrar o mesmo placeholder e registrar/permitir diagnosticar a falha; não substituir silenciosamente por imagem de outro serviço ou categoria.
- Usar texto alternativo coerente com o serviço, sem repetir conteúdo excessivo.
- Preservar proporção e recorte consistentes, com imagem responsiva e sem distorção.

### 4.3. Dados reais e dados ilustrativos

Serviços cadastrados e exemplos estáticos não podem ser misturados sem identificação.

- A página `/servicos` mostrará somente serviços públicos elegíveis retornados pelo backend.
- Os destaques da homepage priorizarão serviços publicados reais do catálogo.
- A homepage mantém os exemplos locais sempre em uma área separada, identificada como **Exemplos ilustrativos**, inclusive quando há serviços publicados reais.
- Exemplos ilustrativos nunca contarão como resultados da pesquisa, filtros ou quantidade total de serviços cadastrados.
- Não associar imagens de banco a profissionais fictícios como se fossem fotografias enviadas por eles.

## 5. Dados e integração

O primeiro ciclo deverá aproveitar a estrutura já existente:

- `public.services` como fonte dos serviços públicos.
- `CATEGORIAS` e `CIDADES` como fonte dos filtros.
- `SERVICO_CIDADES` para cobertura de municípios.
- `IMAGENS` e o gateway same-origin `/api/public-images?id=<imageId>` para entregar conteúdo do Drive após validação server-side de elegibilidade.

O frontend precisa preservar os metadados de `images` como uma lista, em vez de reduzir o conteúdo à primeira URL. Também deverá preservar `categoryId`, IDs do serviço e listas de cidades ao mapear a resposta da API.

Não alterar o esquema do Google Sheets nem a estrutura da aba `IMAGENS` apenas para viabilizar a galeria: a integração atual já armazena até cinco imagens por serviço. Qualquer mudança no contrato público deverá ser justificada, testada no gateway e no Apps Script e documentada.

## 6. Responsividade, acessibilidade e desempenho

- Projetar primeiro para telas pequenas e testar larguras maiores.
- Manter cartões consistentes em grade responsiva, evitando que descrição, nome ou botão causem desalinhamento.
- Permitir navegação por teclado na pesquisa, filtros, galeria e links.
- Dar rótulos acessíveis aos controles de próxima/anterior imagem.
- Não depender apenas de cor ou de um ícone para comunicar estado.
- Respeitar `prefers-reduced-motion`.
- Carregar imagens fora da área inicial sob demanda e definir dimensões/aspect ratio para reduzir deslocamento do layout.
- Evitar carregar todas as imagens de todos os serviços na grade: o catálogo usa apenas a imagem principal; a galeria carrega/mostra as demais no detalhe.
- Manter mensagens explícitas para carregamento, ausência de resultados, falha de API e falha de imagem.

## 7. Ordem de implementação e estado atual

1. **Diagnosticar a primeira imagem:** conferir resposta pública, URL do Drive, permissões, resposta HTTP e decodificação no navegador. Corrigir somente a causa reproduzível.
2. **Preparar o modelo de apresentação:** preservar `images[]`, `categoryId`, IDs e cidades no mapeamento frontend; criar o cartão reutilizável com fallback neutro.
3. **Adicionar navegação por rotas:** implementar as rotas públicas e manter compatibilidade com `?auth=demo` e `?poc=01`.
4. **Construir `/servicos` e `/categorias`:** pesquisa, filtros, parâmetros de URL e estados de interface.
5. **Construir a página de detalhes:** galeria, descrição, cobertura por cidade e contato.
6. **Enxugar a homepage:** três categorias, quatro ou cinco serviços em destaque, pesquisa e links para as páginas completas.
7. **Validar navegação e apresentação:** telas pequenas/grandes, URLs diretas, voltar/avançar, dados vazios, imagens ausentes/quebradas e preservação dos fluxos existentes.

### 7.1. Implementação e validação no branch

**Implementado em `feat/catalogo-publico-navegacao`:**
- Homepage enxuta com pesquisa, três categorias e até cinco serviços em destaque.
- Catálogo `/servicos` com busca textual, filtros de categoria/cidade, contador, limpar filtros e estado vazio/erro/loading.
- Página `/categorias` com as categorias ativas.
- Detalhe `/servicos/:serviceId` com galeria de até cinco imagens, miniaturas, setas, contador, cidades atendidas e WhatsApp.
- Modelo de apresentação que preserva `images[]`, `categoryId` e vínculos de cidades; cartão com imagem principal e indicador de fotos adicionais.
- Placeholder neutro para imagens ausentes ou que não carregam; exemplos ilustrativos identificados e separados dos resultados reais.
- Rewrite SPA em `vercel.json` para URLs diretas; as rotas `/api/app` e `/api/images` permanecem funcionais.

**Validação automatizada — concluída:** GitHub Actions [#44933049890](https://github.com/kleber-goncalves/home-service/actions/runs/44933049890) SUCCESS, incluindo auditoria, POC-01/02/03/04, autorização/ownership, testes de imagem, LOO, testes do catálogo, registro de ocorrências, ESLint e build. A sincronização de contexto [#44933049803](https://github.com/kleber-goncalves/home-service/actions/runs/44933049803) também passou.

**Preview isolado da feature READY:** [abrir aplicação](https://home-service-6mgrjabmj-kleber-goncalves-s-projects.vercel.app). As rotas `/`, `/servicos`, `/categorias` e `/servicos/example-id` responderam HTTP 200; GET em `/api/app` e `/api/images` respondeu 405. Esses testes verificam shell/rotas e preservação das Functions, não integração com Sheets porque as variáveis de backend não estão disponíveis nesta branch.

**Checklist de validação integrada após o merge em `dev`:** a integração é necessária para executar o código novo no único Preview que possui as variáveis de ambiente do Apps Script/Sheets, restritas à branch `dev`.
1. Após o merge e o novo deployment, abrir o Preview fixo `https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app` em desktop e celular; revisar alinhamento, texto, menus e responsividade.
2. Localizar um serviço de teste publicado com cinco imagens ativas e confirmar que o cartão mostra a primeira imagem e o indicador `+4 fotos`.
3. Abrir os detalhes desse serviço; selecionar todas as miniaturas, usar anterior/próxima e conferir o contador e a descrição/cidades.
4. Testar pesquisa textual, categoria, cidade no formato `Cidade - UF`, limpar filtros e recarregar a URL com filtros ativos.
5. Abrir diretamente uma URL `/servicos/:serviceId` e usar voltar/avançar do navegador.
6. Abrir `/?auth=demo` e `/?poc=01`; confirmar que continuam levando às telas demonstrativas correspondentes.
7. Na área do profissional, confirmar listagem/edição/pausa/publicação de serviços e gerenciamento/upload de imagens.
8. Observar se a primeira imagem real carrega. Se não carregar, anotar URL/serviço, status no Network e mensagem do Console; placeholder é fallback visual, não prova que a origem do problema foi resolvida.

Histórico: a PR #28 foi integrada em `dev` no merge commit `22ba720c6fdd22f3bef4cc5b29963279c5119ff9`. As correções desta rodada estão isoladas em `fix/homepage-images-and-sections`. O Preview fixo de `dev` continua sendo o único ambiente conectado a Sheets/Drive; não ampliar o escopo das variáveis para branches de feature. Manter `main` e Production inalteradas.

Trabalhar em `fix/homepage-images-and-sections`, derivada de `dev`. Não implementar diretamente em `dev`.

## 8. Critérios de aceitação

- [ ] A homepage apresenta a proposta com menos seções e sem listas estáticas que aparentem ser resultados de busca.
- [ ] A homepage mostra três categorias e permite abrir a página com todas as categorias.
- [ ] A homepage mostra no máximo quatro ou cinco serviços de destaque e oferece acesso ao catálogo completo.
- [ ] `/servicos` lista os serviços públicos e permite pesquisar, filtrar por categoria e cidade e limpar os filtros.
- [ ] Filtros e pesquisa podem ser compartilhados pela URL e continuam aplicados após recarregar a página.
- [ ] `/categorias` lista as categorias ativas e direciona para os serviços filtrados.
- [ ] Cada cartão mostra a imagem principal e informa quando existem outras fotos.
- [ ] A página de detalhes apresenta todas as imagens ativas (até cinco) com navegação acessível.
- [ ] Uma imagem ausente ou quebrada apresenta placeholder neutro, sem imagem de outro serviço.
- [x] A entrega de imagem usa rota same-origin autenticada no backend; a integração real foi testada no Preview de `dev`, incluindo pausa, republicação e remoção.
- [x] Serviços ilustrativos aparecem em seção própria da homepage, mesmo quando existem serviços publicados, e não entram nos resultados reais nem nos totais.
- [ ] Os fluxos `?auth=demo` e `?poc=01` continuam funcionando.
- [ ] Cadastro, edição, pausa/publicação, remoção e upload de imagens continuam funcionando.
- [ ] Lint, testes pertinentes e build passam; as validações manuais do Preview são registradas separadamente.
- [x] Nenhuma alteração foi promovida a `main`/Production neste ciclo; `main` permanece em `49354a46863d5a5eb36ce32e450b975d4087fe3b`.

## 9. Fora do escopo

- Novo banco de dados, serviço externo de busca ou geolocalização.
- Paginação backend e busca avançada sem necessidade medida.
- Avaliações, estrelas, comentários, reputação ou selos de verificação.
- Pagamentos, agendamento, contratação ou chat interno.
- Foto de perfil e gestão de mídia administrativa.
- Compressão/otimização de imagens no servidor.
- Habilitação do backend em Production ou uso de dados pessoais reais.

## 10. Referências internas

- `src/pages/HomePage.jsx`
- `src/components/home/home-sections.jsx`
- `src/data/homepage.js`
- `src/services/app-api.js`
- `apps-script/conecta-local/Code.gs`
- `docs/ETAPA_4_IMAGENS_DRIVE.md`
- `docs/ROADMAP_ESTUDOS.md`

## 11. Correções pós-integração da PR #28 — 21/11/2026

Após a integração da PR #28 em `dev` e o teste do responsável, três ajustes foram solicitados: imagens reais ainda não apareciam; os serviços fictícios deveriam continuar visíveis junto dos cadastros reais; e as seções `FAQSection`, `PopularServices` e `AboutSection` deveriam permanecer na homepage.

### 11.1. Entrega segura das imagens

- O frontend passa a gerar a URL same-origin `/api/public-images?id=<imageId>` em `src/lib/public-catalog.js`; deixa de depender da URL direta `drive.google.com/uc?export=view`.
- A Function `api/public-images.js` (ID na query string) usa `server/public-image-gateway.js`.
- O gateway chama a ação interna HMAC `public.image.resolve`, aguarda confirmação de elegibilidade e recebe o token OAuth somente no servidor.
- O Apps Script verifica que a imagem está ativa, pertence a um serviço publicado, o usuário está ativo e o MIME/tamanho do arquivo Drive correspondem aos metadados de `IMAGENS`.
- O gateway baixa `files.get?alt=media` com o token OAuth e transmite o stream binário ao navegador; não devolve o token ou o identificador do arquivo Drive ao cliente. Respostas não são armazenadas em cache.
- A rota só funciona em Preview e recusa requisições cross-site. A elegibilidade é revalidada a cada pedido de imagem, inclusive após pausa ou remoção lógica.
- A ação `public.image.resolve` foi adicionada a `APP_ALLOWED_ACTIONS` e `appDispatch_` em `apps-script/conecta-local/Code.gs`.
- **Sincronização operacional concluída:** após o merge da PR #29 em `dev`, o responsável sincronizou o `Code.gs` atualizado com o projeto Apps Script existente e atualizou a implantação Web App usada pelo Preview. O código no GitHub não atualiza automaticamente a implantação remota.
- **Validação manual integrada — PASS:** a entrega com OAuth real server-side, arquivo real do Drive, Apps Script e dados de `IMAGENS` foi confirmada pelo responsável no Preview fixo de `dev`; ver a seção 11.5 para os resultados detalhados.

### 11.2. Serviços reais e exemplos

- A homepage mostra até cinco serviços publicados na seção `Serviços em destaque`.
- Os cinco cartões fictícios de `src/data/homepage.js` aparecem sempre em seção separada `Conheça outros exemplos de serviços`, inclusive quando existem cadastros reais.
- Os exemplos estão marcados como fictícios/ilustrativos e não entram na página `/servicos`, na busca, nos filtros ou na contagem de cadastros reais.
- Os exemplos não têm contato WhatsApp nem página individual de serviço publicada.

### 11.3. Seções institucionais restauradas

- `PopularServices`, `AboutSection` e `FAQSection` voltaram a ser renderizadas em `HomePage.jsx`.
- O id de `PopularServices` foi alterado para `servicos-populares` para não duplicar o id da seção de serviços cadastrados.
- O FAQ foi atualizado para não afirmar incorretamente que busca pública, detalhes e contato ainda não existem; também explica que os cartões de exemplo não representam profissionais reais e que a aplicação permanece demonstrativa.

### 11.4. Testes adicionados

- `tests/images/public-image-gateway.test.js`: valida resolução HMAC, token exclusivamente server-side, transmissão do conteúdo, bloqueio cross-site, rejeição de imagem não elegível, MIME e tamanho.
- `tests/public-catalog/public-catalog.test.js`: valida conversão para URL interna e rejeição de imagem removida/ID inválido.
- `npm run test:images` inclui a nova suíte.
- **CI pós-merge — PASS:** Validate Home Service [#44937440114](https://github.com/kleber-goncalves/home-service/actions/runs/44937440114) e AI Context — Synchronize [#44937440122](https://github.com/kleber-goncalves/home-service/actions/runs/44937440122) concluíram SUCCESS após a integração da PR #29.

### 11.5. Validação manual integrada no Preview de `dev` — PASS (21/11/2026)

Ambiente: Preview fixo da branch `dev`, deployment `dpl_3me1dDL9tjaeQveKPFx8YXYfrDm3` (`READY`, commit `cf0e932b854a48e67c0d69e84136bbae1e40f189`), com integração real ao Apps Script, Google Sheets e Google Drive de teste. O responsável confirmou a atualização do `Code.gs` e da implantação Web App existente.

| Cenário executado | Resultado observado | Estado |
|---|---|---|
| Catálogo `public.services` | Cinco imagens retornadas para `Aparar grama`: 3 JPEG e 2 PNG | PASS |
| Entrega das cinco imagens elegíveis | HTTP 200, Content-Type de imagem e corpo não vazio para 5/5 | PASS |
| Serviço pausado | HTTP 404 para 5/5 imagens | PASS |
| Serviço republicado | HTTP 200, MIME correto e bytes recebidos para 5/5 | PASS |
| Uma imagem removida pela interface | ID antigo retorna HTTP 404 e a imagem não aparece mais no catálogo público | PASS |
| Demais imagens após a remoção | As outras 4 imagens continuam entregues com HTTP 200 | PASS |

Os testes exercitaram o gateway com IDs reais de metadados do catálogo e conteúdo real do Drive; o teste de remoção confirmou a revogação no servidor, não apenas o desaparecimento visual da miniatura. A validação foi executada pelo responsável e documentada como teste funcional manual. Não equivale a auditoria de segurança independente, teste de carga, ensaio de falhas distribuídas ou autorização para uso em produção.
