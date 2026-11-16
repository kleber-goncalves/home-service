# Protótipo demonstrativo local — Área do profissional

> **Status:** implementação isolada na branch `feat/prototipo-demo-profissional`.
> **Finalidade:** apresentação acadêmica com dados fictícios.
> **Acesso:** `/?auth=demo` ou `/?auth=demo&mode=register`.

## Fluxo disponível

1. **Acesso rápido:** na tela de login, usar “Entrar sem digitar” para abrir o perfil sintético de Alex Silva.
2. **Cadastro fictício:** informar nome completo, nome público, e-mail de domínio reservado para exemplos e senha fictícia com pelo menos 15 caracteres.
3. **Confirmação:** a interface gera um código de seis dígitos e o exibe na própria tela; digitá-lo conclui a simulação.
4. **Login:** a conta cadastrada pode ser acessada novamente enquanto a página permanecer aberta. Também existe uma conta sintética de acesso rápido.
5. **Área profissional:** visualizar dados do perfil, consultar serviços de exemplo, adicionar serviço e alternar o estado entre publicado e em pausa.
6. **Recuperação:** para a conta criada nessa mesma sessão da página, gerar código fictício, validá-lo e definir nova senha fictícia.
7. **Logout:** encerra o estado visual de acesso e retorna ao formulário.

## Limites explícitos

- O fluxo roda somente no frontend e no estado React em memória.
- Não chama Vercel Functions, Apps Script, Google Sheets ou Google Drive.
- Não usa a POC-04 e não emite cookie de sessão.
- Não existe autenticação, autorização, conta ou armazenamento persistente.
- O código de confirmação/recuperação é exibido na interface; nenhum e-mail é enviado.
- Ao recarregar ou fechar a página, cadastros e alterações simuladas são perdidos.
- Usar exclusivamente dados fictícios. Não inserir senhas, e-mails ou dados pessoais reais.

## Roteiro sugerido para apresentação

1. Na homepage, clicar em **Abrir cadastro demonstrativo**.
2. Criar uma conta com dados fictícios e confirmar usando o código mostrado na página.
3. Na área profissional, adicionar um serviço e pausar/publicar um dos exemplos.
4. Sair e entrar novamente com a conta criada enquanto a mesma página estiver aberta.
5. Mostrar também o botão de acesso rápido para explicar o perfil sintético de demonstração.

## Separação das provas de conceito

A POC-04 de sessão sintética permanece na branch `feat/poc-04-session-cookie`, PR #14 em Draft. Ela valida um ciclo de sessão técnica para uma conta sintética fixa, mas não autentica o e-mail e a senha informados no formulário. Não conectar uma coisa à outra sem concluir a revisão técnica e implementar o backend de autenticação real.
