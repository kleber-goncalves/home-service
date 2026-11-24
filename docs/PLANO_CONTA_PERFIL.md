# Plano de evolução da conta e do perfil — Conecta Local

> **Escopo:** evolução incremental da experiência de conta do profissional na demonstração acadêmica.
> **Ambiente:** somente branch `dev` e Preview; dados sintéticos.
> **Regra:** não habilitar backend em Production nem usar dados pessoais reais.

## Objetivo

Permitir que o profissional tenha uma área de conta coerente, consiga manter seus dados atualizados e reconheça claramente quais alterações exigem validações adicionais.

## Etapas

### Etapa 1 — Sessão compartilhada e navegação da conta

**Status: integrada em `dev` pela PR #30.**

- Restaurar a sessão uma vez no provedor global.
- Compartilhar o estado autenticado com a navegação.
- Mostrar acesso de visitante ou nome/menu da conta autenticada.
- Oferecer os destinos `Minha conta` e `Sair`.

### Etapa 1.1 — Entrar e criar conta em ações separadas

**Status: integrada em `dev` pela PR #31.**

- Separar os botões `Entrar` e `Criar conta` no cabeçalho desktop e no menu móvel.
- Abrir diretamente o modo correto do formulário.

### Etapa 2 — Edição dos dados do perfil

**Status: integrada em `dev` pela PR #32; testes manuais do responsável concluídos com sucesso no Preview em 23/11/2026.**

Campos editáveis:

- Nome completo (privado).
- Nome público (apresentado no catálogo).
- Telefone / WhatsApp.
- Apresentação profissional.
- Cidade principal.

Regras implementadas:

- O identificador do usuário, o identificador do profissional, o papel e o estado da conta são sempre derivados/validados no servidor e nunca aceitos como campos editáveis.
- O gateway Vercel encaminha uma allowlist explícita e deriva o hash da sessão a partir do cookie HttpOnly.
- O Apps Script valida comprimentos, telefone, cidade ativa e papel/sessão; atualiza somente o perfil da sessão e registra `profile.update` na aba `AUDITORIA`.
- A resposta atualizada do backend substitui o usuário no AuthProvider para refletir as mudanças imediatamente no cabeçalho e na área da conta.
- O e-mail é exibido como somente leitura nesta etapa. Sua alteração exige reautenticação, unicidade e confirmação do novo endereço; não deve ser tratada como simples edição do perfil.

### Etapa 3 — Foto de perfil

**Status: integrada em `dev` pela PR #33, merge commit `782d8ede22ffcf8f1b3193c70e956715ca701af0`; CI pós-merge #45255089911 concluída com SUCCESS e testes manuais do responsável confirmados com sucesso no Preview em 23/11/2026, após sincronização/publicação do Apps Script.**

Escopo implementado na branch:

- Selecionar uma foto JPG, PNG ou WebP, com até 5.000.000 bytes.
- Exibir prévia local antes de enviar.
- Reaproveitar o transporte retomável existente em blocos de 1 MiB, sem enviar o arquivo inteiro em Base64.
- Armazenar metadados na aba `IMAGENS`, com `id_profissional` preenchido, `id_servico` vazio e `ordem_exibicao = 1`.
- Permitir somente uma foto ativa por profissional. A substituição restringe a imagem anterior e a marca como `removed`; a remoção também restringe o arquivo antes de alterar o status.
- Manter o arquivo privado no Google Drive. A leitura passa pelo gateway same-origin `/api/public-images?id=<imageId>`, que consulta o Apps Script e revalida o estado ativo da imagem e da conta. O token OAuth permanece no servidor.
- Mostrar a foto no avatar do cabeçalho e na área autenticada, atualizando o AuthProvider após upload ou remoção.
- Derivar o proprietário pela sessão autenticada; o navegador não escolhe `id_profissional`, pasta ou URI de upload.

**Fora do escopo desta etapa:**

- Cortar, girar ou editar a foto no navegador.
- Redimensionar/comprimir imagens no servidor.
- Upload de fotos em massa ou galeria de fotos de perfil.
- Alteração de e-mail.

**Cuidados de integração:**

- O código de `apps-script/conecta-local/Code.gs` não sincroniza automaticamente com o Web App publicado. Após o merge em `dev`, é necessário sincronizar o arquivo e publicar nova versão na implantação existente.
- As variáveis secretas do Preview continuam restritas a `gitBranch: dev`; não duplicar segredos para branches de feature.
- Para esta etapa, o responsável já sincronizou/publicou o Apps Script e confirmou os testes manuais no Preview. Nas próximas alterações do backend, repetir o procedimento na implantação existente.

### Etapa 4 — Alteração de e-mail

**Status: implementação em andamento na branch `feat/alteracao-email-profissional`; ainda não integrada em `dev` nem validada manualmente.**

Implementação preparada:

- Solicitar a senha atual e validar novamente com Argon2id no gateway; o Apps Script devolve os dados de verificação somente ao servidor, nunca ao navegador.
- Normalizar o novo endereço, validar formato/tamanho e verificar unicidade dentro do bloqueio de concorrência do Apps Script.
- Reservar temporariamente o destino em `CODIGOS_VERIFICACAO`, com finalidade `change_email`; o e-mail atual permanece intacto até a confirmação.
- Armazenar HMAC vinculado ao usuário, ao novo endereço e ao código; validade de 10 minutos, cinco tentativas e intervalo mínimo de 60 segundos entre solicitações.
- No sucesso, consumir o código, atualizar `USUARIOS.email` e `email_verificado_em`, invalidar outros códigos pendentes, revogar todas as sessões e exigir novo login.
- Registrar solicitações e confirmações na aba `AUDITORIA`, sem gravar código, senha ou endereço de destino nos detalhes do evento.
- Exibir o código somente como recurso demonstrativo na interface. Nenhum e-mail é enviado e a interface informa essa limitação.

**Integração e validação pendentes:**

- Concluir os testes automatizados de Apps Script e gateway, lint e build pela CI.
- Integrar por PR em `dev`, sincronizar o `Code.gs` no projeto Apps Script existente e publicar nova versão da implantação Web App atual.
- Executar validação manual no Preview fixo de `dev`, usando somente contas e endereços sintéticos.

## Critérios de conclusão da Etapa 2

- [x] Edição e cancelamento funcionam na interface em desktop e mobile.
- [x] Campos válidos são salvos no perfil correto.
- [x] Cabeçalho e cartão de perfil refletem os dados salvos sem novo login.
- [x] Dados de outra conta não podem ser alterados.
- [x] E-mail, papel, estado e identificadores não podem ser alterados pelo payload.
- [x] Auditoria registra o ator derivado da sessão.
- [x] CI aprovada e responsável confirmou a operação no Preview com o Apps Script atualizado.

## Critérios de conclusão da Etapa 3

- [x] Upload e cancelamento funcionam no Preview com Apps Script, Sheets e Drive atualizados.
- [x] Só JPG/PNG/WebP até 5 MB são aceitos; o backend confere assinatura binária e metadados reais do Drive.
- [x] O perfil autenticado só consegue enviar, substituir ou remover sua própria foto.
- [x] A substituição mantém no máximo uma foto ativa e restringe a anterior.
- [x] O arquivo permanece privado no Drive e o gateway só entrega registros elegíveis.
- [x] A foto aparece no cabeçalho e na área da conta após upload e após restauração da sessão.
- [x] A remoção restringe o arquivo, marca o registro como removido e retira a foto da sessão.
- [x] CI pós-merge aprovada e validação manual confirmada pelo responsável.


## Critérios de conclusão da Etapa 4

- [ ] A senha atual é revalidada no servidor; uma senha incorreta não gera solicitação.
- [ ] Dados de identidade e destino são derivados/validados no backend; o navegador não define o proprietário.
- [ ] E-mail é normalizado, validado e protegido contra duplicidade e reserva concorrente.
- [ ] O endereço atual permanece ativo até a confirmação do código.
- [ ] Código de uso único tem HMAC vinculado a usuário e destino, validade de 10 minutos e limite de cinco tentativas.
- [ ] Nova emissão respeita intervalo mínimo de 60 segundos.
- [ ] Confirmação atualiza e verifica o e-mail somente uma vez.
- [ ] Todas as sessões anteriores são revogadas e a interface exige novo login.
- [ ] Eventos são auditados sem segredos, credenciais, códigos ou dados desnecessários.
- [ ] CI aprovada e validação manual concluída no Preview com Apps Script atualizado.

## Limites

- Dados fictícios exclusivamente.
- Não adicionar telefone alternativo ou novos campos à planilha sem requisito explícito.
- Não confundir a foto de perfil com as imagens dos serviços.
- Não afirmar que a alteração de e-mail envia mensagens enquanto não houver provedor de e-mail configurado.
