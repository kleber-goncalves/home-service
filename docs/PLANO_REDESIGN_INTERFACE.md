# Plano de redesign visual e de experiência — Conecta Local

> **Atualizado em:** 24/11/2026
> **Status:** próxima etapa aprovada pelo responsável; diagnóstico visual e direção de arte ainda não iniciados.
> **Branch de referência:** `dev`, commit `d16278c5b6df6df370645b18a05dfb5ea0effe08`.
> **Ambiente de referência:** Vercel Preview de `dev`, deployment `dpl_AfNaMm1WqRFJa3jhhwXhfkgwPUTv` (`READY`).
> **Limites:** dados fictícios; mudanças em branches derivadas de `dev`; sem alterações em `main`/Production.

## 1. Contexto e problema identificado

As principais jornadas do Conecta Local já estão implementadas em `dev`: homepage, catálogo público, categorias, detalhes e galeria de serviços, cadastro/login demonstrativos e área autenticada do profissional.

Em 24/11/2026, o responsável avaliou que a interface está funcional, mas possui aparência genérica. Esse feedback passa a ser o motivo desta etapa. O problema é de identidade e qualidade visual/experiência, não uma justificativa automática para adicionar funcionalidades.

**Diagnóstico inicial registrado:** ainda não foi realizada uma auditoria página por página nem foi aprovada uma nova direção visual. Portanto, este documento não escolhe antecipadamente paleta, fontes, estilo de ilustração, fotografia, linguagem de ícones ou layout final.

## 2. Objetivo

Construir uma identidade visual própria, consistente e memorável para o Conecta Local, reforçando a percepção de uma plataforma regional confiável e fácil de usar.

O redesign deverá melhorar:
- Hierarquia de informação e clareza da proposta.
- Composição da homepage, do hero e da pesquisa.
- Personalidade visual dos cartões e apresentação dos serviços.
- Tipografia, escala, contraste e ritmo de espaçamento.
- Tratamento de fotografia, galeria, ícones e elementos de navegação.
- Consistência entre as páginas públicas e a área autenticada.
- Qualidade de uso em dispositivos móveis e telas maiores.

**O que não basta:** trocar apenas as cores, arredondamentos e sombras ou instalar uma biblioteca de componentes. A mudança precisa criar uma linguagem visual coerente, com decisões justificadas e aplicadas ao conjunto da experiência.

## 3. Páginas e jornadas abrangidas

### Área pública
- Homepage: cabeçalho, hero, busca, categorias, destaques, exemplos ilustrativos, seções institucionais e rodapé.
- Catálogo `/servicos`: título, filtros, resultado/contador, cartões, carregamento, vazio e erro.
- Categorias `/categorias`: organização e apresentação da taxonomia.
- Detalhes `/servicos/:serviceId`: galeria, conteúdo, informações do profissional, cobertura por cidades e CTA de contato.

### Área do profissional
- Cabeçalho e navegação autenticada.
- Cadastro, confirmação demonstrativa e login.
- Visão principal/área da conta.
- Edição dos dados do perfil e foto de perfil.
- Alteração demonstrativa de e-mail.
- Listagem e formulários de criação/edição de serviços.
- Estados de publicação, pausa, remoção, upload e gerenciamento de imagens.

O redesign deverá manter a separação visual entre serviços cadastrados e exemplos ilustrativos. Não apresentar exemplos como profissionais reais.

## 4. Princípios da direção visual

A direção final será definida depois de observar o produto atual e discutir referências. Os seguintes princípios orientam a avaliação das propostas:

1. **Identidade própria:** evitar aparência de template SaaS genérico ou clone direto de marketplace conhecido.
2. **Clareza antes de decoração:** o visitante deve entender rapidamente o que pode pesquisar, como explorar e como entrar em contato.
3. **Personalidade com propósito:** cores, tipografia, fotografia, ícones e grafismos devem reforçar a proposta local sem competir com os serviços.
4. **Hierarquia consistente:** títulos, subtítulos, filtros, cartões, CTAs, formulários e estados precisam ter níveis visuais claros.
5. **Composição deliberada:** usar alinhamento, proporções, largura de conteúdo e espaços em branco de forma intencional, evitando uma sequência repetitiva de caixas iguais.
6. **Fotografia responsável:** preservar imagens reais de teste e exemplos devidamente identificados; não usar imagens ilustrativas como se fossem trabalhos de profissionais cadastrados.
7. **Acessibilidade e legibilidade:** manter contraste, foco visível, navegação por teclado, rótulos, alvos de toque e movimento reduzido.
8. **Coerência entre jornadas:** páginas públicas e área autenticada devem parecer partes do mesmo produto, sem sacrificar a clareza dos formulários.

## 5. Sequência de trabalho

### Etapa 5.1 — Auditoria visual e funcional

- Capturar o estado atual das páginas no Preview de `dev`, em desktop e mobile.
- Avaliar as jornadas públicas e autenticadas listadas na seção 3.
- Registrar inconsistências de tipografia, espaçamento, alinhamento, largura, contraste, ícones, cartões, estados e responsividade.
- Separar problemas puramente visuais de bugs funcionais.
- Criar uma lista priorizada por impacto, não uma reescrita geral do frontend.

**Entregável:** diagnóstico visual com exemplos concretos e prioridades.

### Etapa 5.2 — Exploração de identidade e direção de arte

- Reunir referências visuais que conversem com o objetivo do Conecta Local.
- Preparar duas ou três propostas visuais realmente distintas, mostrando como se aplicam à homepage e aos cartões/detalhes.
- Explicar o raciocínio de tipografia, paleta, imagens, ícones, composição e personalidade de cada proposta.
- Submeter a direção para escolha do responsável antes de aplicar mudanças amplas no código.

**Entregável:** direção visual escolhida e documentada. Nenhuma paleta, fonte ou referência será considerada aprovada antes dessa decisão.

### Etapa 5.3 — Sistema visual

Depois da aprovação da direção:
- Definir tokens de cores e papéis semânticos (texto, fundo, superfície, borda, ação, foco e estados).
- Definir famílias tipográficas, escala, pesos e line-height.
- Definir container, grid, breakpoints, espaçamentos, raios, bordas e elevação.
- Definir estilos de botões, campos, filtros, cartões, navegação, menus, avisos, skeletons, estados vazios e mensagens.
- Documentar estados hover, focus, active, disabled, loading, success e error.

**Entregável:** linguagem visual consistente e tokens reutilizáveis, sem criar abstrações desnecessárias.

### Etapa 5.4 — Implementação progressiva

Ordem inicial sugerida:
1. Fundação visual, tipografia, cores, containers e componentes compartilhados.
2. Cabeçalho, navegação e rodapé.
3. Homepage e hero/pesquisa.
4. Cartões e catálogo de serviços.
5. Categorias e página de detalhes/galeria.
6. Cadastro, login e área do profissional.
7. Perfil, serviços, formulários e gerenciadores de imagens.

Cada bloco deverá ser revisto no Preview antes de avançar para o seguinte. Componentes compartilhados devem ser ajustados de forma centralizada, sem duplicar variantes semelhantes.

### Etapa 5.5 — Validação e refinamento

- Comparar as páginas com a direção visual aprovada.
- Verificar telas pequenas, intermediárias e desktop.
- Testar navegação por teclado, foco, contraste, leitura e alvos de toque.
- Conferir estados de carregamento, vazio, erro, sucesso e imagens ausentes.
- Revalidar filtros, parâmetros de URL, galeria, navegação do browser e fluxos de conta/serviços.
- Executar lint, testes pertinentes e build; registrar separadamente validação automatizada e manual.
- Corrigir regressões antes de encerrar a etapa.

**Entregável:** interface redesenhada e homologada no Preview de `dev`, com documentação e evidências atualizadas.

## 6. Restrições técnicas e preservação de comportamento

- Manter React, JavaScript/JSX, Vite e Tailwind CSS existentes.
- Não migrar para TypeScript nem trocar a arquitetura de roteamento sem requisito demonstrado.
- Não adicionar bibliotecas de UI, animação ou ícones sem justificativa concreta.
- Não alterar contratos do Apps Script, nomes de ações, schemas do Sheets, gateway de imagens ou regras de autorização por causa de uma preferência visual.
- Preservar rotas `/`, `/servicos`, `/categorias`, `/servicos/:serviceId`, `?auth=demo` e `?poc=01`.
- Preservar sessão, CSRF, autorização, edição de perfil, foto, alteração de e-mail, ciclo de vida dos serviços e uploads.
- Não inventar avaliações, estrelas, depoimentos, reputação, selo de verificação, preço ou disponibilidade.
- Não substituir imagens que falharam por fotografias de outro serviço.
- Não criar dados reais ou incluir informações pessoais.

## 7. Ambiente, branches e integração

- Criar uma branch de trabalho derivada do HEAD atual de `dev`, com nome coerente, por exemplo `feat/redesign-interface`.
- Abrir Pull Request direcionada exclusivamente a `dev`.
- Não implementar diretamente em `dev` nem alterar `main`.
- O Preview de branches de feature não recebe as variáveis de Apps Script/Sheets/Drive, pois permanecem restritas a `gitBranch: dev`. Não copiar nem ampliar o escopo desses segredos.
- Para avaliação visual, usar dados e capturas sintéticas quando necessário. Após integração em `dev`, conferir a experiência conectada no Preview fixo.
- Como o redesign é visual, evitar mudanças em `apps-script/conecta-local/Code.gs`. Se alguma mudança futura alterar esse arquivo por necessidade comprovada, sincronizar o código no projeto Apps Script existente e publicar nova versão da implantação Web App existente.
- Não alterar configurações de billing ou fazer upgrade do plano Vercel.

## 8. Critérios de conclusão

- [ ] Direção visual aprovada e registrada antes da implementação ampla.
- [ ] Existe identidade visual própria, coerente e reconhecível em páginas públicas e autenticadas.
- [ ] Tipografia, cores, espaçamento, largura e componentes seguem um sistema consistente.
- [ ] Homepage comunica a proposta e direciona a pesquisa com hierarquia clara.
- [ ] Catálogo, categorias, cartões e detalhes apresentam dados com leitura e composição consistentes.
- [ ] Login, cadastro e área do profissional compartilham a mesma linguagem visual.
- [ ] Estados de carregamento, vazio, erro, sucesso e ausência de imagem foram desenhados.
- [ ] Layout funciona sem rolagem horizontal indevida em mobile e mantém composição equilibrada em desktop.
- [ ] Contraste, foco, teclado, rótulos, alvos de toque e movimento reduzido foram revisados.
- [ ] Rotas, filtros, galeria e jornadas de conta/serviços continuam funcionando.
- [ ] Lint, testes pertinentes e build concluídos com sucesso.
- [ ] Validação manual no Preview foi registrada sem confundir READY de deploy com aprovação funcional.
- [ ] Documentação técnica, README e roadmap refletem o resultado; `main`/Production permanecem inalteradas.

## 9. Fora do escopo

- Criar novas funcionalidades de negócio.
- Painel administrativo, moderação, pagamentos, avaliações, chat, agendamento ou contratação.
- Reescrever backend, Apps Script ou modelo de dados.
- Migração de banco, framework ou arquitetura.
- Rebranding sem validação do responsável.
- Copiar integralmente a interface de outro produto.
- Habilitar backend em Production ou usar dados pessoais reais.

## 10. Documentos relacionados

- `README.md`
- `docs/AI_CONTEXT.md`
- `docs/ROADMAP_ESTUDOS.md`
- `docs/PLANO_CATALOGO_PUBLICO_E_NAVEGACAO.md`
- `docs/PLANO_CONTA_PERFIL.md`
- `docs/PROTOTIPO_DEMO_LOCAL.md`
- `docs/PROJETO_INTEGRADOR_CONECTA_LOCAL.md`
