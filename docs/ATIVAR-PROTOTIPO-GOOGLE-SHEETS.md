# Ativar o protótipo funcional com Google Sheets

> **Branch:** `feat/prototipo-demo-profissional`
> **Rota de acesso:** `/?auth=demo`
> **Finalidade:** protótipo acadêmico com dados fictícios.
> **Estado do código:** frontend, Vercel Function e Apps Script versionados. O armazenamento só passa a funcionar depois de vincular o Apps Script à planilha e configurar as variáveis Preview da Vercel.

## O que o protótipo faz quando configurado

- Cadastro grava uma linha em `USUARIOS` e outra em `PROFISSIONAIS`.
- A confirmação grava e consome o registro em `CODIGOS_VERIFICACAO`.
- A senha é derivada com Argon2id na Function Node da Vercel. A planilha recebe somente hash, salt e identificador do algoritmo, nunca a senha original.
- Login consulta o registro de senha, verifica a senha no servidor e cria sessão em `SESSOES`; apenas o hash do token é salvo.
- Inclusão de serviço grava em `SERVICOS`.
- Pausar/publicar serviço atualiza `SERVICOS`.
- Eventos principais são registrados em `AUDITORIA`.
- A homepage lê serviços publicados e exibe o contato público do profissional por WhatsApp.

## 1. Criar o Apps Script do backend

Use um projeto Apps Script **separado** das POCs-01/02/04. Esse projeto será responsável pelas operações do Conecta Local.

1. Acesse https://script.google.com e crie um projeto independente.
2. Abra `Code.gs`.
3. No repositório, abra `apps-script/conecta-local/Code.gs`, copie todo o conteúdo e cole no `Code.gs` do novo projeto.
4. Salve.

## 2. Configurar as propriedades do Apps Script

No projeto Apps Script, abra **Configurações do projeto → Propriedades do script** e cadastre:

| Propriedade | Valor |
|---|---|
| `CONECTA_LOCAL_SPREADSHEET_ID` | ID do Google Sheets estrutural existente |
| `CONECTA_LOCAL_HMAC_SECRET` | segredo aleatório de 64 caracteres hexadecimais |

O ID da planilha é o trecho entre `/d/` e `/edit` na URL do Google Sheets.

Gere o segredo no PowerShell do Windows, usando o Node.js instalado no computador:

```powershell
$secret = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
$secret
```

Copie o resultado e use **o mesmo valor** na propriedade do Apps Script e na variável da Vercel. Não envie o segredo pelo chat, não coloque no GitHub e não use o segredo de outra POC.

## 3. Implantar o Web App

No Apps Script:

1. Clique em **Implantar → Nova implantação**.
2. Tipo: **Aplicativo da Web**.
3. Executar como: **Eu** (a conta proprietária/autorizada da planilha).
4. Quem pode acessar: **Qualquer pessoa**.
5. Clique em Implantar e conclua a autorização.
6. Copie a URL que termina em `/exec`.

O acesso anônimo é necessário porque a chamada vem da Function server-side da Vercel, não do navegador. O código exige assinatura HMAC, timestamp, nonce de uso único e lista fechada de ações. Mesmo assim, mantenha esta implantação apenas para o protótipo e use dados fictícios.

Se alterar o código Apps Script depois, crie uma nova versão da implantação ou atualize a implantação existente para apontar para a nova versão.

## 4. Configurar a Vercel Preview

No projeto Vercel `home-service`, vá a **Settings → Environment Variables**. Crie as três variáveis abaixo com alvo **Preview** e, quando disponível, limite o escopo de branch a `feat/prototipo-demo-profissional`.

| Variável | Valor |
|---|---|
| `CONECTA_LOCAL_APPS_SCRIPT_URL` | URL do Web App terminada em `/exec` |
| `CONECTA_LOCAL_HMAC_SECRET` | o mesmo segredo gerado na etapa 2 |
| `CONECTA_LOCAL_ALLOWED_ORIGIN` | origem HTTPS exata do Preview desta branch, sem barra final nem caminho |

A origem deve ser somente o protocolo e host, por exemplo:

```text
https://nome-do-preview.vercel.app
```

Não coloque essas variáveis no frontend, não use prefixo `VITE_` e não configure esses valores em Production.

Depois de salvar as variáveis, faça um redeploy do Preview da branch `feat/prototipo-demo-profissional`.

## 5. Fluxo de demonstração

Abra a URL Preview com:

```text
/?auth=demo&mode=register
```

1. Cadastre nome, nome público, e-mail fictício, WhatsApp, apresentação, cidade e senha fictícia.
2. A interface mostra o código de confirmação gerado para o protótipo.
3. Confirme o código.
4. Entre com o e-mail e a senha cadastrados.
5. Inclua um serviço, depois pause e publique esse serviço.
6. Abra a homepage em outra aba ou atualize-a. O serviço publicado deverá aparecer na vitrine; use o contato para abrir o WhatsApp informado.
7. Saia da área profissional. A sessão deve ser revogada no Apps Script.

## Abas utilizadas

- `USUARIOS`: conta, estado, hash, salt e algoritmo.
- `PROFISSIONAIS`: perfil.
- `SESSOES`: hash do token, atividade, expiração e revogação.
- `CODIGOS_VERIFICACAO`: HMAC do código, prazo, tentativas e uso.
- `CATEGORIAS` e `CIDADES`: catálogo; se estiverem vazias, o Apps Script inicializa categorias demonstrativas e Capelinha/MG.
- `SERVICOS`: serviços publicados ou pausados.
- `AUDITORIA`: eventos principais do fluxo.

As demais abas permanecem disponíveis para etapas posteriores do MVP. A implementação atual não grava imagens no Drive, não envia e-mail e ainda não oferece recuperação de senha nem painel administrativo.

## Limites desta entrega

- Use somente dados fictícios e a planilha privada do projeto.
- A verificação por e-mail é simulada: o código é mostrado na interface, não enviado por e-mail.
- A autenticação é adequada para demonstrar o fluxo acadêmico, mas não equivale a uma auditoria de segurança ou aprovação para produção.
- O projeto não foi dimensionado para escala comercial. Ajustes poderão ser feitos conforme surgirem problemas reais no uso demonstrativo.
- Não conecte nem reutilize a implantação da POC-04 como autenticação de usuários; a POC-04 continua separada.
