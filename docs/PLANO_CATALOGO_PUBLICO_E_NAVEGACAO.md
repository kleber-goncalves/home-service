# Plano — catálogo público, navegação e apresentação de imagens

> **Atualizado em:** 21/11/2026  
> **Status:** escopo funcional aprovado para desenvolvimento; ainda não implementado.  
> **Branch documental:** `docs/catalogo-publico-e-navegacao` (derivada de `dev`).  
> **Ambiente-alvo:** Preview de `dev`, com dados fictícios. `main` e Production permanecem fora deste trabalho.

## 1. Objetivo

Evoluir a vitrine pública do Conecta Local para que a pessoa consiga entender a proposta rapidamente, descobrir serviços por pesquisa e filtros e visualizar as imagens cadastradas por cada profissional.

O foco desta frente é a experiência pública: organização da homepage, catálogo, categorias, cartões e detalhes dos serviços. O cadastro/autenticação do profissional, o upload no Drive e as regras de segurança existentes devem ser preservados.

Este documento registra o que foi aprovado para implementação. **Não significa que as páginas, rotas ou componentes descritos já existam.**

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

Seções redundantes ou estáticas — como listas de serviços populares que não filtram o catálogo e blocos extensos que repetem a mesma explicação — deverão ser removidas ou condensadas após revisar seus conteúdos e links. Não eliminar conteúdo útil sem verificar se ele cumpre uma função de navegação ou apresentação.

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
- Quando não houver quantidade suficiente de serviços cadastrados para demonstrar a interface, os exemplos locais poderão aparecer em uma área separada e identificada como **Exemplos ilustrativos** ou **Demonstração**.
- Exemplos ilustrativos nunca contarão como resultados da pesquisa, filtros ou quantidade total de serviços cadastrados.
- Não associar imagens de banco a profissionais fictícios como se fossem fotografias enviadas por eles.

## 5. Dados e integração

O primeiro ciclo deverá aproveitar a estrutura já existente:

- `public.services` como fonte dos serviços públicos.
- `CATEGORIAS` e `CIDADES` como fonte dos filtros.
- `SERVICO_CIDADES` para cobertura de municípios.
- `IMAGENS` e URLs públicas elegíveis do Drive para imagens.

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

## 7. Ordem de implementação

1. **Diagnosticar a primeira imagem:** conferir resposta pública, URL do Drive, permissões, resposta HTTP e decodificação no navegador. Corrigir somente a causa reproduzível.
2. **Preparar o modelo de apresentação:** preservar `images[]`, `categoryId`, IDs e cidades no mapeamento frontend; criar o cartão reutilizável com fallback neutro.
3. **Adicionar navegação por rotas:** implementar as rotas públicas e manter compatibilidade com `?auth=demo` e `?poc=01`.
4. **Construir `/servicos` e `/categorias`:** pesquisa, filtros, parâmetros de URL e estados de interface.
5. **Construir a página de detalhes:** galeria, descrição, cobertura por cidade e contato.
6. **Enxugar a homepage:** três categorias, quatro ou cinco serviços em destaque, pesquisa e links para as páginas completas.
7. **Validar navegação e apresentação:** telas pequenas/grandes, URLs diretas, voltar/avançar, dados vazios, imagens ausentes/quebradas e preservação dos fluxos existentes.

Trabalhar em uma branch de funcionalidade derivada de `dev`; este branch atual contém somente as atualizações documentais. Não implementar diretamente em `dev`.

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
- [ ] O problema da primeira imagem foi diagnosticado e a correção, se necessária, foi reproduzida e validada.
- [ ] Serviços ilustrativos estão claramente separados e não entram nos resultados reais nem nos totais.
- [ ] Os fluxos `?auth=demo` e `?poc=01` continuam funcionando.
- [ ] Cadastro, edição, pausa/publicação, remoção e upload de imagens continuam funcionando.
- [ ] Lint, testes pertinentes e build passam; as validações manuais do Preview são registradas separadamente.
- [ ] Nenhuma alteração é promovida a `main`/Production neste ciclo.

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
