# POC-03 — viabilidade de derivação e armazenamento de senhas

> **Status:** experimento isolado em preparação. Nenhum algoritmo foi aprovado para autenticação e nenhuma conta/login está implementado.
> **Escopo:** comprovar primitivas, compatibilidade, vetores de referência e custo de execução no runtime real do Google Apps Script.
> **Ambiente:** projeto Apps Script separado, sem implantação como Web App, sem planilha de negócio e sem credenciais reais.

## 1. Objetivo

A POC-03 investiga se o Apps Script consegue executar uma função de derivação de senha adequada, com custo configurável, salt individual, tratamento correto de UTF-8 e parâmetros versionados.

Esta POC **não** cria cadastro, login, endpoint HTTP, sessão, armazenamento de hashes ou integração com a aba `USUARIOS`. O código em `apps-script/poc-03/Code.gs` é exclusivamente um harness experimental para executar manualmente pelo editor Apps Script.

Não copiar a implementação experimental para autenticação. Um vetor de teste correto demonstra compatibilidade matemática nos casos testados; não equivale a auditoria criptográfica, revisão independente ou aprovação para produção.

## 2. Evidências técnicas e decisão em aberto

### 2.1. Recomendações de armazenamento

A OWASP recomenda preferencialmente Argon2id, com parâmetros mínimos publicados na Cheat Sheet, e apresenta scrypt como alternativa quando Argon2id não está disponível. PBKDF2-HMAC-SHA-256 aparece na recomendação da OWASP para cenários que exigem conformidade FIPS, com work factor de 600.000 ou mais.

Portanto, **600.000 iterações não devem ser interpretadas como um padrão universal que automaticamente torna PBKDF2 a melhor escolha**. O contexto e o trade-off entre resistência a ataques offline, disponibilidade no runtime e custo operacional precisam ser documentados. PBKDF2 não é memory-hard como Argon2id/scrypt.

Referência: [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### 2.2. Limitações do Apps Script

A documentação do Google informa que o runtime V8 do Apps Script não disponibiliza as APIs padrão `crypto` e `SubtleCrypto`, nem o conjunto completo de APIs do Node.js ou do navegador. A classe `Utilities` oferece `computeHmacSha256Signature`, mas isso é uma primitiva HMAC, não uma API PBKDF2, Argon2id ou scrypt.

Referências:
- [Apps Script V8 runtime — limitações](https://developers.google.com/apps-script/guides/v8-runtime).
- [Apps Script Utilities](https://developers.google.com/apps-script/reference/utilities/utilities).

O harness testa PBKDF2-HMAC-SHA-256 como **candidato de viabilidade**, construído sobre a primitiva HMAC documentada. O algoritmo não fica aprovado apenas porque os vetores passam. A implementação precisa de revisão e avaliação de desempenho; se não houver solução adequada no Apps Script, a decisão de arquitetura deverá ser reaberta em vez de reduzir arbitrariamente o custo ou criar criptografia própria.

### 2.3. Limites de execução

A documentação oficial atualmente lista seis minutos por execução de script, além de limites de armazenamento do Properties Service. O harness limita o ensaio de 600.000 iterações a três minutos para não consumir todo o limite de execução. Quotas podem mudar e precisam ser reconferidas antes de qualquer integração.

Referência: [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas).

## 3. Escopo do experimento

O harness cobre somente:

1. Uso de `Utilities.computeHmacSha256Signature(valueBytes, keyBytes)`.
2. Vetores publicados de PBKDF2-HMAC-SHA-256.
3. Entrada UTF-8, inclusive caracteres acentuados e emoji.
4. Senha de teste maior que 64 bytes, verificando o comportamento do HMAC com chave longa.
5. Tempo de execução do vetor RFC de 80.000 iterações.
6. Tempo de execução de um ensaio de 600.000 iterações, com interrupção controlada após três minutos.

As strings e salts do código são dados de teste públicos/fictícios. Não inserir senha pessoal, senha reaproveitada, e-mail, token ou segredo no código, no editor ou nos logs.

## 4. Como executar no Apps Script isolado

1. Crie um projeto Apps Script separado, sem vínculo com a planilha de negócio e sem implantação como Web App.
2. Copie o conteúdo de `apps-script/poc-03/Code.gs` para um arquivo `Code.gs`.
3. Execute `poc03RunKnownAnswerTests`. Autorize somente o que o editor solicitar para executar o próprio projeto.
4. Depois que os vetores rápidos passarem, execute `poc03RunRfc80000Vector`. Registre sucesso/falha e duração.
5. Por último, execute `poc03Benchmark600k`. Registre o número de iterações completadas, a duração e se o limite de três minutos foi atingido.
6. Copie para o registro técnico somente os resultados e tempos. Nunca registre senhas, salts reais, hashes de usuários ou segredos.

As funções não são acionáveis por HTTP: o arquivo não define `doGet` nem `doPost`. Não implante este projeto como Web App.

## 5. Vetores de referência

- **RFC 7914, seção 11:** PBKDF2-HMAC-SHA-256 com `P="passwd"`, `S="salt"`, `c=1`, `dkLen=64`.
- **RFC 7914, seção 11:** PBKDF2-HMAC-SHA-256 com `P="Password"`, `S="NaCl"`, `c=80.000`, `dkLen=64`.
- **Teste UTF-8 adicional:** valor esperado calculado independentemente com uma implementação PBKDF2-HMAC-SHA-256 de referência; serve para detectar divergência na conversão de strings UTF-8.
- **Teste de chave longa:** senha de teste ASCII de 80 bytes, com duas iterações; verifica a entrada acima do bloco de 64 bytes do SHA-256.

Referência normativa dos vetores RFC: [RFC 7914 — seção 11](https://www.rfc-editor.org/rfc/rfc7914.html#section-11).

## 6. Critérios para considerar a POC tecnicamente promissora

Todos os itens abaixo precisam ser verificados; nenhum resultado isolado é suficiente:

- Vetores RFC e UTF-8 passam com comparação exata do resultado derivado.
- A senha de 80 bytes passa sem truncamento ou normalização silenciosa.
- O salt usado em uma futura conta terá ao menos 16 bytes, será exclusivo por conta e será gerado por fonte criptograficamente segura. A documentação de `Utilities.getUuid()` como identificador único, por si só, não será tratada como prova de CSPRNG; a origem do salt ainda precisa ser definida.
- O resultado e os parâmetros serão versionados. Uma representação futura pode seguir formato explícito, por exemplo `pbkdf2-sha256$v1$600000$...`, mas não está aprovada nesta etapa.
- O tempo do KDF será medido no runtime real, incluindo concorrência e carga prevista. Não baixar o work factor somente para fazer a demonstração parecer rápida.
- A comparação de hashes, o limite de bytes da senha, a política de senha comum/comprometida, os segredos auxiliares e o controle de abuso permanecerão sob revisão própria.
- A solução será revisada antes de qualquer integração. Se não atender ao nível de segurança e operação exigido, interromper a autenticação própria no Apps Script e reabrir a arquitetura.

## 7. Bloqueios que continuam fora desta POC

- Geração criptograficamente segura e origem do salt.
- Armazenamento/versionamento na aba `USUARIOS`.
- Comparação de hash e comportamento de tempo.
- Lista de senhas comuns/comprometidas.
- Proteção contra abuso e negação de serviço por KDF caro.
- Cadastro, login, confirmação de e-mail e recuperação.
- Cookies, CSRF, sessão, expiração e revogação.
- Integração com Vercel, Apps Script de negócio ou Google Sheets.

## 8. Resultado atual

**Ainda não executado no Google Apps Script.** O commit da POC apenas disponibiliza o harness e o protocolo. O resultado real depende da execução manual pelo responsável no runtime Google e deve ser registrado antes de qualquer decisão de implementação.

A POC usa exclusivamente strings de teste públicas e não altera a modelagem aprovada de 12 abas/102 colunas.
