# Design System — Conecta Local

> **Status:** fotografia da identidade visual atualmente implementada  
> **Levantamento:** 26/11/2026  
> **Branch de referência:** `dev`  
> **Commit de referência:** `eaa3bd2fc3c95663aea9b135f8f9b34f0710c044`

## 1. Objetivo e escopo

Este documento registra a linguagem visual que o Conecta Local apresenta neste estágio do desenvolvimento. Ele reúne padrões já perceptíveis na interface, valores encontrados nos estilos e características dos principais componentes públicos.

**Este é um registro do estado atual (as-is), não uma especificação definitiva.** Os valores abaixo descrevem o que está implementado no código de referência. Eles não significam que todos os componentes já seguem uma escala única, que todos os breakpoints estejam padronizados ou que a interface tenha passado por uma validação visual completa em todos os dispositivos.

O documento foi criado para dar continuidade às próximas decisões visuais sem perder a direção que já surgiu no projeto. Inconsistências conhecidas permanecem registradas como parte do estado atual; a inclusão deste arquivo não executa correções, refatorações ou alterações de interface.

## 2. Direção visual

A linguagem visual atual pode ser descrita como:

**Minimalismo editorial com tipografia expressiva, grandes superfícies arredondadas, fotografias em destaque e contraste entre áreas claras e escuras.**

Características observadas:

- **Composição editorial:** títulos grandes, hierarquia tipográfica evidente e blocos de conteúdo organizados em áreas bem definidas.
- **Geometria arredondada:** Hero, cartões de destaque, cartões de serviço, FAQ e painel do rodapé usam raios de borda visualmente expressivos.
- **Superfícies suaves:** fundos brancos e cinza muito claro convivem com gradientes azul-claro e amarelo-pálido.
- **Contraste:** o rodapé cria um encerramento escuro e destacado em relação às seções claras.
- **Fotografia como conteúdo:** imagens de serviços são usadas em cartões, destaques e composições sobrepostas.
- **Ícones lineares:** a interface utiliza ícones da biblioteca `lucide-react`, geralmente com traço simples e sem preenchimento pesado.

A proposta atual não corresponde a um uso sistemático de glassmorphism ou neumorphism. O resultado é mais próximo de uma interface editorial contemporânea com cartões arredondados e superfícies limpas.

## 3. Cores

### 3.1. Tema Tailwind

O bloco `@theme` de `src/index.css` declara as seguintes cores:

| Token | Valor |
|---|---|
| `--color-brand-50` | `#EFF6FF` |
| `--color-brand-100` | `#DBEAFE` |
| `--color-brand-500` | `#2563EB` |
| `--color-brand-600` | `#1D4ED8` |
| `--color-brand-700` | `#1E40AF` |
| `--color-navy-900` | `#102849` |

### 3.2. Variáveis globais em `:root`

O mesmo arquivo declara variáveis globais adicionais:

| Variável | Valor | Uso observado |
|---|---|---|
| `--brand` | `#1558D6` | Cor de ação e destaque em componentes |
| `--brand500` | `#EFF6FF` | Fundo claro de estado selecionado |
| `--brand-dark` | `#0E3474` | Variação escura da cor de marca |
| `--navy` | `#102849` | Texto principal do Hero |
| `--ink` | `#172B49` | Cor base do texto |
| `--muted` | `#64748B` | Texto secundário |

### 3.3. Cores locais das seções

Além das variáveis globais e do tema Tailwind, existem valores definidos diretamente nos estilos dos componentes:

| Cor | Valor | Onde aparece |
|---|---|---|
| Branco | `#FFFFFF` | Fundo geral e cartões |
| Preto quase absoluto | `#050505` | Painel do SiteFooter |
| Preto de texto | `#111111` / `#171717` | Títulos e perguntas da FAQ |
| Cinza de superfície | `#F6F7F7` | LocalServiceOverview e vitrine de serviços |
| Cinza de acordeão | `#F4F4F4` | Itens fechados da FAQ |
| Cinza de hover | `#F0F0F0` | Hover dos itens da FAQ |
| Azul-claro | `#97DCFF` com transparência | Início dos gradientes do Hero e destaque por categoria |
| Amarelo-pálido | `#FAFDEA` / `#F9FFD3` | Final dos gradientes |
| Turquesa | `#42D4C4` | Indicador no Footer |
| Turquesa | `#33C9BF` | Detalhe decorativo da FAQ |

Gradientes encontrados:

- Hero e painel de informações por categoria: `linear-gradient(180deg, #97dcffc8 0%, #fafdea 100%)`.
- Resumo do serviço em destaque: `linear-gradient(180deg, #97dcffc8 0%, #f9ffd3 100%)`.

**Observação do estado atual:** os valores do `@theme`, as variáveis de `:root` e as cores locais coexistem. Este documento os registra separadamente, sem declarar equivalência entre tokens que possuem valores diferentes.

## 4. Tipografia

### Família principal

A tipografia principal é **Plus Jakarta Sans**, carregada pelo Google Fonts em `src/index.css`, com pesos variáveis de 200 a 800 e suporte a itálico.

### Características observadas

- Títulos de seção usam pesos fortes, geralmente entre 800 e 900.
- Títulos de destaque usam tamanho responsivo com `clamp()`.
- O espaçamento entre letras costuma ser negativo nos títulos, reforçando a composição editorial.
- Textos de apoio usam cinzas e line-height mais aberto.
- Labels, categorias e pequenos identificadores costumam utilizar peso forte, caixa alta e letter-spacing positivo.

### Exemplos encontrados

| Elemento | Estilo observado |
|---|---|
| Hero | Peso 800; tamanho fluido; line-height próximo de 1.025 |
| Títulos da vitrine por categoria | Peso 900; letter-spacing negativo |
| Título da FAQ | Peso 850; letter-spacing `-0.075em` |
| Título dos cartões de serviço | Peso 800 |
| Headline do Footer | Peso 850; line-height 1.02 |
| Labels de categoria | Peso 800; caixa alta e espaçamento positivo |

Os tamanhos variam entre componentes e breakpoints; os exemplos acima descrevem a implementação atual, não uma escala tipográfica global.

## 5. Curvas e formas

O arredondamento é uma das características mais visíveis da identidade atual. Os valores abaixo foram encontrados nos estilos dos componentes.

### 5.1. Raios observados

| Elemento | Desktop / base | Ajuste responsivo observado |
|---|---:|---:|
| Hero content | 46 px pela classe utilitária | Mantém a classe nos estilos consultados |
| Cartão de destaque por categoria | 46 px | 14 px em telas até 640 px |
| Cartão público de serviço (homepage e catálogo) | 46 px | 19 px em telas até 640 px |
| Imagem do cartão de serviço | 26 px | 14 px em telas até 640 px |
| Foto da composição LocalServiceOverview | 25 px | 21 px até 900 px; 18 px até 380 px |
| Item da FAQ | 31 px | 23 px até 620 px |
| Painel do Footer | `clamp(26px, 3vw, 40px)` | 29 px até 760 px; 24 px até 420 px |
| Botão de contato por categoria | 15 px | Valor base observado |
| Botão de ação do Footer | 9 px | Valor base observado |
| Tag de exemplo/fotos | 999 px | Formato pill |

### 5.2. Linguagem das formas

- Grandes cartões e painéis usam curvas amplas.
- Imagens internas usam curvas menores que o cartão que as contém.
- Botões e controles possuem arredondamento intermediário.
- Tags e indicadores curtos podem usar formato totalmente arredondado (`999px`).
- A galeria do LocalServiceOverview usa cartões fotográficos sobrepostos, com pequenas rotações e sombras.

Os valores não estão centralizados em tokens de raio compartilhados. A tabela é um inventário dos valores atuais.

## 6. Superfícies, profundidade e bordas

### Superfícies

- Fundo geral predominantemente branco.
- Seções de conteúdo podem usar cinza muito claro (`#F6F7F7`).
- Cartões de serviço usam fundo branco e borda cinza discreta.
- FAQ usa blocos cinza-claro com alteração sutil de fundo no hover e borda quando abertos.
- Footer usa um painel preto dentro de uma área externa branca.

### Sombras e bordas

- Cartões de serviço recebem sombra suave, com aumento de profundidade no hover.
- Imagens sobrepostas da seção de indicadores usam borda branca e sombra para separação visual.
- Formulário do Hero possui borda azulada discreta e sombra mais ampla.
- O painel escuro do Footer usa linhas divisórias brancas com baixa opacidade para separar os grupos e o rodapé legal.

A profundidade é usada de forma localizada; a interface não depende de sombras fortes em todos os componentes.

## 7. Layout e composição

### Containers e largura

A implementação atual combina diferentes estratégias:

- Containers com largura total e espaçamentos laterais por breakpoint.
- Trechos que utilizam `max-w-7xl` e centralização.
- Classes utilitárias aplicadas diretamente no JSX.
- Espaçamentos e larguras definidos com valores fixos ou `clamp()` no CSS.

Algumas seções recentes usam a composição `w-full px-4 sm:px-6 lg:px-29`. O Footer utiliza um painel interno com largura total. Ainda não existe uma única regra de container aplicada uniformemente a todas as seções.

### Espaçamento

O CSS combina:

- Valores em pixels.
- Unidades rem.
- Espaçamentos responsivos com `clamp()`.
- Padding e gap definidos no próprio componente.
- Classes utilitárias do Tailwind no JSX.

O uso de `clamp()` é recorrente em títulos, espaçamentos e dimensões de áreas de destaque.

## 8. Componentes e padrões visuais atuais

### 8.1. SiteHeader

Arquivo: `src/components/home/site-header.jsx`

- Cabeçalho branco, sticky, com superfície limpa, borda inferior discreta e sombra muito suave.
- Marca Conecta Local posicionada à esquerda.
- Navegação desktop enxuta com menu suspenso “Serviços” (todos os serviços e categorias) e acesso “Seja um profissional”.
- Campo de busca horizontal e expansível à direita da navegação; envia a palavra-chave ao catálogo por meio do parâmetro `q`.
- Os botões “Entrar” e “Criar conta” permanecem imediatamente à direita da busca; quando há sessão, essa área é substituída pelo menu da conta.
- Em telas de até 960 px, a navegação, a busca e as ações de acesso são agrupadas em um menu móvel expansível, que mantém a busca e os links de autenticação.
- A busca do header preserva categoria e cidade quando submetida a partir de `/servicos`; a busca completa do Hero continua oferecendo os campos de serviço e localidade.

### 8.2. HeroSearch

Arquivo: `src/components/home/hero-search.jsx`

- Área principal com fundo em gradiente azul-claro e amarelo-pálido.
- Conteúdo centralizado.
- Título grande e expressivo.
- Formulário de busca em superfície branca, com campos de serviço e localidade.
- Imagens decorativas nas extremidades do Hero.
- Campo de busca em grade no desktop e empilhado em telas menores.

### 8.3. CategoryFeaturedServices

Arquivo: `src/components/home/category-featured-services.jsx`

- Título de seção grande e escuro.
- Abas de categoria com ícones Lucide.
- Categoria selecionada destacada com fundo azul.
- Painel principal dividido em informações, fotografia e resumo do serviço.
- Cartões de destaque com gradientes azul-claro e amarelo-pálido.
- Composição em três áreas no desktop, reorganizada em telas menores.

### 8.4. LocalServiceOverview

Arquivo: `src/components/home/local-service-overview.jsx`

- Fundo cinza muito claro.
- Texto editorial com tipografia grande.
- Composição de até três fotografias sobrepostas.
- Fotos com borda branca, sombra e leve rotação.
- Quatro indicadores dinâmicos em grade.
- Os indicadores podem usar traço de ausência (`—`) durante carregamento ou quando há erro, conforme os dados recebidos.

### 8.5. Cartões públicos de serviços

Arquivos:
- `src/components/home/featured-service-card.jsx`
- `src/pages/HomePage.jsx`
- `src/pages/ServicesPage.jsx`

O componente `HomeFeaturedServiceCard` é compartilhado pela vitrine de serviços da homepage (`public-home-services`) e pelo catálogo completo (`/servicos`). As duas páginas usam o mesmo cartão e os mesmos estilos, evitando implementações visuais paralelas.

- Cartões brancos, com fotografia no topo, cantos amplos e superfícies discretas.
- Categoria, título, descrição e ícone ilustrativo.
- Metadados de atendimento/localidade e profissional responsável, com ícones lineares e valores que podem quebrar linha em nomes longos.
- Identificação visual para exemplos fictícios e contador de fotos adicionais.
- Ação contextual: “Ver catálogo” para exemplos fictícios e “Ver detalhes” para serviços publicados.
- Rodapé organizado em coluna: os metadados ocupam a largura disponível e a ação fica alinhada à direita abaixo deles, mantendo a leitura em cartões estreitos.
- Hover com pequeno deslocamento vertical e ampliação discreta da imagem.
- Grade de três cartões em telas maiores, duas colunas em telas intermediárias e uma coluna em telas menores.
- No catálogo, os links de exemplos fictícios preservam os filtros atuais na URL.

### 8.6. FAQSection

Arquivo: `src/components/home/home-sections.jsx`

- A homepage não exibe mais a seção “Como funciona”; a navegação principal não inclui esse atalho.
- A FAQ apresenta layout editorial dividido em duas colunas no desktop.
- Coluna de introdução com ilustração decorativa, título e texto de apoio.
- Coluna de perguntas com blocos cinza-claro e grandes curvas.
- Acordeão nativo com `details/summary`.
- Indicador visual de mais/menos para representar estado fechado/aberto.
- Em telas menores, a introdução fica acima da lista.

### 8.7. SiteFooter

Arquivo: `src/components/public/site-footer.jsx`

- Painel preto destacado do fundo branco.
- Cantos amplos.
- Área superior com marca, headline, descrição e chamadas para ação.
- Navegação organizada em cinco grupos no desktop.
- Linhas divisórias sutis.
- Informações finais de copyright e identificação do projeto.
- Em telas menores, a área superior é empilhada e as colunas são reorganizadas.

## 9. Imagens e iconografia

### Imagens

- Fotografias são utilizadas como parte importante da comunicação dos serviços.
- Imagens de cartões normalmente usam `object-fit: cover`.
- A composição de indicadores usa fotografias sobrepostas, com rotações leves.
- O estado sem imagem pode utilizar placeholders próprios.
- Imagens de exemplos são identificadas como ilustrativas quando aplicável; não representam cadastros reais.

### Ícones

- Biblioteca principal: `lucide-react`.
- Linguagem predominante: ícones lineares, com traço simples.
- Ícones são usados em navegação, categorias, localização, contato e ações.
- O tamanho varia conforme o papel visual: ícones maiores em destaque de categoria e menores em labels e ações.

## 10. Responsividade — breakpoints encontrados

O projeto utiliza breakpoints definidos por componente. Os valores observados no CSS incluem:

| Largura máxima | Exemplos de uso atual |
|---:|---|
| 1050 px | Reorganização das colunas do Footer |
| 960 px | Header troca a navegação horizontal por menu móvel; destaque por categoria reorganiza suas colunas |
| 920 px | FAQ em uma coluna |
| 900 px | Grade de cartões e composição de indicadores |
| 860 px | Ajustes adicionais do Hero e demais seções |
| 760 px | Footer empilhado e diretório em duas colunas |
| 680 px | LocalServiceOverview em uma coluna |
| 640 px | Cards de serviço e destaque por categoria em uma coluna |
| 620 px | FAQ e cabeçalho em telas menores |
| 560 px | Regras adicionais de layout existentes |
| 420 px | Ajustes finais do Footer |
| 380 px | Ajustes para larguras muito estreitas |

Esses valores são os pontos de quebra encontrados na implementação consultada. **Não representam uma escala oficial unificada.** Diferentes componentes respondem em larguras diferentes.

## 11. Movimento e estados interativos

Padrões encontrados:

- Transições curtas, frequentemente entre 150 ms e 240 ms.
- Cartões de serviço podem subir alguns pixels no hover.
- Imagens de serviço podem ampliar discretamente no hover.
- Links e botões alteram cor ou superfície no hover.
- Itens da FAQ mudam a aparência conforme o estado aberto/fechado.
- Há regras `prefers-reduced-motion: reduce` em componentes que possuem transições ou transformações.

O movimento atual é funcional e sutil; não é utilizado como elemento dominante da composição.

## 12. Acessibilidade e semântica visual

Existem práticas já presentes na interface:

- Uso de elementos semânticos como `header`, `main`, `section`, `nav`, `footer`, `article`, `figure` e listas.
- Rótulos e nomes acessíveis em controles e áreas de navegação.
- Ícones decorativos marcados para serem ignorados por leitores de tela quando apropriado.
- Estados de foco visível em controles específicos.
- Uso de `details/summary` na FAQ.
- Respeito a `prefers-reduced-motion` nos componentes que possuem movimento.

Este inventário não equivale a uma auditoria de acessibilidade completa.

## 13. Estado de padronização e evolução

A identidade visual já apresenta características reconhecíveis, mas ainda está em consolidação.

Aspectos que permanecem como estão nesta fotografia:

- O tema Tailwind, as variáveis globais e as cores locais coexistem.
- Os raios de borda variam de componente para componente.
- Os breakpoints são definidos em diferentes blocos e não formam uma escala única.
- Os containers e espaçamentos usam uma combinação de classes utilitárias e CSS específico.
- Algumas regras responsivas e visuais foram adicionadas em etapas diferentes.
- Alguns textos da interface ainda aparecem em português e inglês.
- O uso de cores e tamanhos de fonte ainda não foi centralizado em tokens compartilhados.

Esses pontos ficam registrados para uma etapa futura de melhoria e refatoração. **Não são alterações incluídas neste documento.**

## 14. Arquivos de referência

| Área | Arquivo |
|---|---|
| Fonte global, tema e estilos | `src/index.css` |
| Cabeçalho | `src/components/home/site-header.jsx` |
| Hero e busca | `src/components/home/hero-search.jsx` |
| Destaque por categoria | `src/components/home/category-featured-services.jsx` |
| Resumo do catálogo | `src/components/home/local-service-overview.jsx` |
| Cartão público de serviço (homepage e catálogo) | `src/components/home/featured-service-card.jsx` |
| Seções Como funciona e FAQ | `src/components/home/home-sections.jsx` |
| Rodapé | `src/components/public/site-footer.jsx` |
| Composição da homepage | `src/pages/HomePage.jsx` |

## 15. Como usar este documento nas próximas alterações

Até que uma etapa específica de padronização seja realizada:

1. Use este documento para compreender a linguagem visual que já existe.
2. Ao criar uma nova seção, procure manter a hierarquia tipográfica, o contraste, as superfícies e o tratamento de imagens compatíveis com as seções atuais.
3. Reaproveite componentes e estilos existentes quando fizer sentido, sem presumir que todos os valores atuais já sejam tokens definitivos.
4. Não trate os valores deste inventário como uma escala obrigatória ou como prova de que todos os breakpoints estão validados.
5. Quando ocorrer uma refatoração visual ou estrutural relevante, atualize este documento para refletir o novo estado implementado.

---

**Resumo:** o Conecta Local está adotando uma linguagem de minimalismo editorial, grandes títulos, curvas evidentes, fotografias em destaque, superfícies claras e um Footer escuro de alto contraste. Este arquivo registra essa direção no estado atual da branch `dev`, sem antecipar a futura padronização.
