# Área do profissional — protótipo funcional

> **Branch:** `feat/prototipo-demo-profissional`.
> **Acesso:** `/?auth=demo` ou `/?auth=demo&mode=register`.
> **Persistência:** Google Sheets, depois de ativar o Apps Script conforme `docs/ATIVAR-PROTOTIPO-GOOGLE-SHEETS.md`.

## Fluxo disponível

1. Cadastro profissional com nome, nome público, e-mail, WhatsApp, apresentação, cidade e senha.
2. O cadastro cria registros em `USUARIOS`, `PROFISSIONAIS` e `CODIGOS_VERIFICACAO`.
3. A interface mostra o código demonstrativo de confirmação; ao confirmar, o status da conta muda para `active`.
4. Login verifica a senha no servidor e cria uma sessão com token HttpOnly; a planilha armazena somente o hash do token.
5. O profissional consulta seus dados e os serviços associados à conta.
6. É possível criar e editar serviços próprios, alternar entre `published` e `paused` e solicitar remoção lógica. A edição altera nome, categoria e descrição; a remoção muda o estado para `removed`, preserva a linha na aba `SERVICOS` e registra a ação em `AUDITORIA`.
7. A homepage consulta serviços publicados e apresenta nome do profissional, categoria, cidade e contato de WhatsApp.
8. Logout revoga a sessão no Apps Script e limpa o cookie.

## Onde estão as partes

- `src/pages/AuthDemoPage.jsx`: telas de cadastro, confirmação, login e área profissional.
- `src/services/app-api.js`: cliente HTTP de mesma origem.
- `api/app.js` e `server/app-gateway.js`: Vercel Function, Argon2id, cookie, CSRF e assinatura HMAC server-to-server.
- `apps-script/conecta-local/Code.gs`: regras, validações e persistência nas abas da planilha.
- `src/pages/HomePage.jsx`: consulta e filtro dos serviços publicados.

## Limites desta rodada

- Usar somente dados fictícios; não cadastrar credenciais ou dados pessoais reais.
- O código de confirmação é mostrado na interface, sem envio de e-mail.
- Não há recuperação de senha nesta rodada.
- Upload de imagens no Drive, edição completa do perfil e painel administrativo ficam para etapas futuras. A edição de nome/categoria/descrição e a remoção lógica de serviços foram integradas em `dev` pela PR #23 e validadas pelo responsável no Preview atualizado em 20/11/2026.
- A cobertura por múltiplas cidades está em desenvolvimento na branch `feat/service-city-coverage`; ainda não está disponível no Preview integrado de `dev`. Após o merge, será necessário atualizar o Apps Script e validar a funcionalidade no alias fixo de `dev`.
- O protótipo é acadêmico e não foi dimensionado para produção ou escala comercial.
- A POC-04 continua separada. A sessão da aplicação usa a implementação nova desta branch, não a conta sintética da POC-04.

## Roteiro de apresentação

1. Abrir `/?auth=demo&mode=register`.
2. Criar uma conta fictícia e confirmar usando o código exibido.
3. Entrar com as credenciais recém-criadas.
4. Adicionar um serviço e alterar seu estado para pausa/publicado.
5. Sair, entrar novamente e mostrar que perfil e serviços continuam salvos.
6. Abrir a homepage e mostrar o serviço publicado e o contato público.

## Ativação necessária

Antes do primeiro uso, implantar `apps-script/conecta-local/Code.gs`, vincular o ID da planilha e o segredo HMAC nas Propriedades do Script, publicar o Web App e configurar as três variáveis Preview da Vercel. Seguir o passo a passo em `docs/ATIVAR-PROTOTIPO-GOOGLE-SHEETS.md`.
