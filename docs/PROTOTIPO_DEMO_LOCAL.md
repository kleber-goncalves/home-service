# Área pública e área do profissional — protótipo funcional

> **Estado de referência:** 24/11/2026.
> **Branch de integração:** `dev`, commit `d16278c5b6df6df370645b18a05dfb5ea0effe08`.
> **Preview:** https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app/ (deployment `dpl_AfNaMm1WqRFJa3jhhwXhfkgwPUTv`, READY).
> **Persistência:** Google Sheets e Google Drive por Vercel Functions + Google Apps Script, no Preview restrito à branch `dev`.

## Fluxos disponíveis

### Área pública

1. Homepage com pesquisa, categorias em destaque, serviços cadastrados e exemplos ilustrativos em seção separada.
2. Catálogo público em `/servicos`, com pesquisa textual e filtros por categoria e cidade.
3. Página `/categorias` com categorias ativas.
4. Detalhes em `/servicos/:serviceId`, com descrição, profissional, cidades atendidas, contato por WhatsApp e galeria de até cinco imagens.
5. Imagens servidas por gateway same-origin; o token OAuth do Drive permanece no servidor e o backend revalida a elegibilidade.
6. Os acessos `?auth=demo` e `?poc=01` permanecem reservados para as experiências demonstrativas correspondentes.

### Área do profissional

1. Cadastro com nome, nome público, e-mail, WhatsApp, apresentação, cidade e senha.
2. Confirmação da conta por código demonstrativo exibido na interface.
3. Login, restauração de sessão e logout com cookie HttpOnly; a planilha armazena somente o hash do token de sessão.
4. Consulta e edição dos próprios dados de perfil: nome completo, nome público, WhatsApp, apresentação e cidade principal.
5. Upload, substituição e remoção da foto de perfil, com arquivo privado no Drive e entrega pelo gateway de imagens.
6. Criação e edição dos próprios serviços; pausa, publicação e remoção lógica.
7. Associação de um ou mais municípios por serviço.
8. Upload, substituição e remoção de até cinco imagens por serviço, conforme as regras de elegibilidade.
9. Solicitação de alteração de e-mail com reautenticação e confirmação demonstrativa; após a confirmação, as sessões anteriores são revogadas e é necessário entrar novamente.

## Onde estão as partes

- `src/pages/HomePage.jsx`: homepage.
- `src/pages/ServicesPage.jsx`, `src/pages/CategoriesPage.jsx` e `src/pages/ServiceDetailPage.jsx`: catálogo, categorias e detalhes.
- `src/pages/AuthDemoPage.jsx`: cadastro, confirmação, login e área do profissional.
- `src/components/home/`: cabeçalho, pesquisa e seções da homepage.
- `src/components/public/`: cartão, apresentação de imagem, links e rodapé.
- `src/components/professional/`: gerenciadores de foto de perfil e imagens de serviços.
- `src/services/app-api.js` e `src/services/image-api.js`: comunicação do frontend com as Functions.
- `api/app.js`, `server/app-gateway.js` e gateways de imagem: camada server-side.
- `apps-script/conecta-local/Code.gs`: regras, validações e persistência nas abas do Sheets.

## Limites e decisões vigentes

- Usar somente dados fictícios; não cadastrar credenciais ou dados pessoais reais.
- Os códigos de confirmação de cadastro e alteração de e-mail são demonstrativos; não há envio real de mensagens.
- Não há recuperação de senha, painel administrativo funcional, moderação de denúncias ou gestão administrativa de categorias/cidades.
- A pesquisa com a comunidade ainda não foi aplicada; depende da orientação do professor/orientador.
- O protótipo não foi aprovado para produção ou escala comercial.
- A POC-04 continua independente do login principal e desabilitada.
- A interface está funcional, mas o responsável considera o design visual genérico. O próximo trabalho será o redesign, conforme `docs/PLANO_REDESIGN_INTERFACE.md`; ainda não há direção visual aprovada.

## Roteiro de apresentação

1. Mostrar a homepage e a pesquisa pública.
2. Abrir o catálogo, aplicar filtros por categoria/cidade e entrar em um detalhe de serviço.
3. Demonstrar a galeria e o contato pelo WhatsApp de um serviço fictício.
4. Entrar na área do profissional, editar o perfil e mostrar a foto de perfil.
5. Criar ou editar um serviço, alterar seu estado e mostrar a cobertura por cidades.
6. Mostrar o gerenciamento de imagens de um serviço.
7. Demonstrar a solicitação de alteração de e-mail, deixando claro que nenhum e-mail real é enviado.
8. Sair e entrar novamente para demonstrar persistência e sessão.

## Ativação e publicação

O ambiente integrado já está configurado para o Preview da branch `dev`. O código de `apps-script/conecta-local/Code.gs` não se sincroniza automaticamente com o Web App publicado: quando uma alteração futura modificar esse arquivo, sincronizar o código no projeto Apps Script existente e publicar uma nova versão da implantação Web App existente antes da validação integrada. Não criar uma implantação nova nem alterar o endpoint utilizado.

As variáveis Vercel que conectam o Apps Script/Sheets/Drive permanecem restritas a `gitBranch: dev`. Não duplicar nem ampliar o escopo dos segredos para branches de feature. Production permanece sem backend habilitado.
