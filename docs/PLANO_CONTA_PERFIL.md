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

**Status: em implementação na branch `feat/edicao-perfil-usuario`.**

Campos editáveis nesta etapa:

- Nome completo (privado).
- Nome público (apresentado no catálogo).
- Telefone / WhatsApp.
- Apresentação profissional.
- Cidade principal.

Regras:

- O identificador do usuário, o identificador do profissional, o papel e o estado da conta são sempre derivados/validados no servidor e nunca aceitos como campos editáveis.
- O gateway Vercel encaminha uma allowlist explícita e deriva o hash da sessão a partir do cookie HttpOnly.
- O Apps Script valida comprimentos, telefone, cidade ativa e papel/sessão; atualiza somente o perfil da sessão e registra `profile.update` na aba `AUDITORIA`.
- A resposta atualizada do backend substitui o usuário no AuthProvider para refletir as mudanças imediatamente no cabeçalho e na área da conta.
- O e-mail é exibido como somente leitura nesta etapa. Sua alteração exige reautenticação, unicidade e confirmação do novo endereço; não deve ser tratada como simples edição do perfil.

### Etapa 3 — Foto de perfil

**Status: planejada.**

- Criar fluxo de upload próprio para foto de perfil, separado do fluxo de imagens de serviços.
- Usar a aba `IMAGENS` e o Drive com relação ao profissional, sem exigir `id_servico`.
- Definir limite, tipos MIME, validação de conteúdo, substituição e remoção lógica.
- Garantir que a foto só seja exibida em superfícies autorizadas e que o gateway não exponha credenciais do Drive.

### Etapa 4 — Alteração de e-mail

**Status: planejada.**

- Exigir reautenticação com a senha atual.
- Normalizar e verificar a unicidade do novo e-mail.
- Emitir código de uso único com finalidade `change_email`.
- Só substituir `USUARIOS.email` após confirmação válida.
- Invalidar sessões ou exigir novo login conforme política definida e auditada.
- O código demonstrativo atual é exibido na tela e não envia e-mail; a etapa não deve simular entrega real.

## Critérios de conclusão da Etapa 2

- [ ] Edição e cancelamento funcionam na interface em desktop e mobile.
- [ ] Campos válidos são salvos no perfil correto.
- [ ] Cabeçalho e cartão de perfil refletem os dados salvos sem novo login.
- [ ] Dados de outra conta não podem ser alterados.
- [ ] E-mail, papel, estado e identificadores não podem ser alterados pelo payload.
- [ ] Auditoria registra o ator derivado da sessão.
- [ ] CI passa e o responsável valida a operação no Preview com o Apps Script atualizado.

## Limites

- Dados fictícios exclusivamente.
- Não adicionar telefone alternativo ou novos campos à planilha sem requisito explícito.
- Não confundir a foto de perfil com as imagens dos serviços.
- Não afirmar que a alteração de e-mail envia mensagens enquanto não houver provedor de e-mail configurado.
