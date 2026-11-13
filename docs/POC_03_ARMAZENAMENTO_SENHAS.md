# POC-03 — viabilidade de derivação e armazenamento de senhas

> **Status:** PBKDF2 sobre `Utilities` reprovado como candidato para implementação. Argon2id com `hash-wasm` 4.13.0/WASM passou em dois vetores independentes no Apps Script real em 2026-11-12; o perfil `m=19456 KiB,t=2,p=1` concluiu em 142 ms numa execução medida. Isso comprova viabilidade funcional inicial e desempenho pontual, não aprovação para autenticação ou produção. Permanecem pendentes medições repetidas, concorrência/abuso, fonte segura de salt, verificação/comparação e revisão de segurança.
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
6. Tempo de execução de um ensaio de 600.000 iterações, com interrupção controlada após três minutos.\n7. Disponibilidade de WebAssembly no runtime e alocação de 19 MiB de memória linear, sem executar ainda um KDF Argon2id.

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
- A solução será revisada antes de qualquer integração. Se não atender ao nível de segurança e operação exigido, interromper a autenticação própria no Apps Script e reabrir a arquitetura.\n- A sonda WebAssembly deve confirmar apenas capacidades básicas do runtime: módulo mínimo executável e reserva de 19 MiB. Mesmo que passe, ainda será necessário avaliar uma implementação Argon2id WASM mantida/revisada, integridade da distribuição do binário, limites reais de memória, concorrência e tempo de execução.

## 7. Bloqueios que continuam fora desta POC

- Geração criptograficamente segura e origem do salt.
- Armazenamento/versionamento na aba `USUARIOS`.
- Comparação de hash e comportamento de tempo.
- Lista de senhas comuns/comprometidas.
- Proteção contra abuso e negação de serviço por KDF caro.
- Cadastro, login, confirmação de e-mail e recuperação.
- Cookies, CSRF, sessão, expiração e revogação.
- Integração com Vercel, Apps Script de negócio ou Google Sheets.

## 8. Resultados manuais no Apps Script — 2026-11-12

O responsável executou as três funções no projeto Apps Script isolado, sem Web App ou planilha de negócio.

### 8.1. Vetores rápidos

Função: `poc03RunKnownAnswerTests`

| Caso | Resultado |
|---|---|
| RFC 7914 — uma iteração, chave derivada de 64 bytes | PASS |
| UTF-8 com acentos e emoji — duas iterações, 32 bytes | PASS |
| Senha ASCII de 80 bytes — duas iterações, 32 bytes | PASS |

O Execution Log registrou início às 13:56:44 e conclusão às 13:56:49. A função informou que todos os vetores passaram.

### 8.2. Vetor RFC de 80.000 iterações

Função: `poc03RunRfc80000Vector`

- Resultado: `PASS`.
- Iterações: 80.000.
- Chave derivada: 64 bytes.
- Tempo interno medido: **84.443 ms** (aproximadamente 84,4 segundos).

Como SHA-256 produz blocos de 32 bytes, uma chave derivada de 64 bytes requer dois blocos PBKDF2; portanto, esse ensaio executou duas sequências de 80.000 iterações HMAC.

### 8.3. Benchmark de 600.000 iterações

Função: `poc03Benchmark600k`

- Alvo: 600.000 iterações, chave derivada de 32 bytes (um bloco).
- Iterações concluídas: **149.247**.
- Tempo interno medido: **180.229 ms**.
- Resultado: `STOPPED`, por interrupção preventiva aos três minutos.

A mensagem de erro ao final do Execution Log é esperada: o próprio harness interrompe o ensaio ao atingir o limite preventivo. Ela não representa falha de vetor ou divergência criptográfica.

### 8.4. Leitura de desempenho e limite da plataforma

Os dois ensaios de desempenho apresentaram taxas diferentes:

- Benchmark interrompido: cerca de **828 iterações/segundo**. Extrapolação linear para 600.000: aproximadamente **12,08 minutos**.
- Vetor RFC: 160.000 chamadas HMAC estimadas (80.000 por bloco, dois blocos) em 84,443 segundos. Extrapolação equivalente para 600.000 iterações de um bloco: aproximadamente **5,28 minutos**.

A diferença entre as projeções é de aproximadamente 2,29 vezes. Os ensaios não devem ser tratados como benchmark perfeitamente controlado: entradas, tamanho derivado e condições de execução diferem. Não é correto afirmar um tempo exato de conclusão para 600.000 iterações sem medições repetidas e comparáveis.

A documentação oficial do Apps Script estabelece limite de **seis minutos por execução** para contas de consumidor e Google Workspace. Assim, a projeção mais lenta supera o limite; a mais rápida deixaria cerca de 43 segundos de margem para toda a requisição, incluindo validação de entrada, acesso à planilha, lock, leitura/gravação e resposta. O KDF sozinho não pode consumir quase todo o tempo da execução de autenticação.

**Conclusão técnica:** os vetores demonstram compatibilidade para os casos testados, mas o benchmark não demonstra que 600.000 iterações concluam com margem operacional segura no Apps Script. PBKDF2-HMAC-SHA-256 sobre `Utilities` fica **reprovado como candidato para implementação no Apps Script neste momento**. Não reduzir o custo de forma arbitrária para tentar fazê-lo caber no limite.

### 8.5. Sonda WebAssembly — resultado manual

Função: `poc03ProbeWebAssembly`

O responsável executou a sonda no projeto Apps Script isolado em 2026-11-12. Resultado: `PASS`.

| Verificação | Resultado |
|---|---:|
| Execução do módulo WebAssembly mínimo | PASS |
| Valor retornado pelo módulo | 42 |
| Compilação e execução do módulo mínimo | 1 ms |
| Memória WebAssembly reservada | 19.922.944 bytes (19 MiB) |
| Tempo registrado para criar o objeto Memory | 0 ms |

**Interpretação:** o runtime conseguiu compilar/executar um módulo WASM simples e criar um objeto `WebAssembly.Memory` de 19 MiB. Isso comprova a disponibilidade básica da API WebAssembly e a reserva isolada dessa memória.

**Limite:** essa memória foi criada diretamente pela sonda, fora de um módulo Argon2id. A sonda não carregou o WASM de uma biblioteca criptográfica, não exercitou `memory.grow` dentro de um módulo Argon2id e não mediu o consumo total de memória do processo. Portanto, ainda não comprova que o heap interno, a memória adicional e a execução completa do Argon2id funcionarão no Apps Script.

### 8.6. Biblioteca Argon2id testada: hash-wasm 4.13.0

Foi feita análise do pacote `hash-wasm` e, em seguida, a execução real do seu bundle Argon2id no runtime do Apps Script:

- Versão observada: `4.13.0`, publicada em 7 de novembro de 2026.
- Licença declarada: MIT.
- O pacote declara zero dependências, módulos WebAssembly incorporados como Base64 e suporte a Argon2id v1.3.
- A API recebe senha e salt como `Uint8Array`, aceita parâmetros `iterations`, `parallelism`, `memorySize` (KiB) e `hashLength`, e pode gerar uma string codificada no formato PHC.
- A implementação usa `WebAssembly.compile`/`WebAssembly.instantiate` e cresce a memória linear do módulo para reservar o espaço de Argon2.
- A implementação consultada tem origem no código Argon2 mantido pelo projeto e declara ser baseada na implementação Go de Argon2.

Referências:
- [Repositório e API hash-wasm](https://github.com/Daninet/hash-wasm/tree/v4.13.0).
- [Pacote hash-wasm 4.13.0 no npm](https://www.npmjs.com/package/hash-wasm).
- [Implementação Argon2 usada pelo pacote](https://github.com/Daninet/hash-wasm/blob/v4.13.0/lib/argon2.ts).
- [Interface WebAssembly usada pelo pacote](https://github.com/Daninet/hash-wasm/blob/v4.13.0/lib/WASMInterface.ts).

**Compatibilidade preliminar com Apps Script:**
- O runtime não possui `TextEncoder`, que a biblioteca usa quando recebe strings.
- O código-fonte da biblioteca aceita `Uint8Array`; portanto, a POC poderá converter senha/salt para bytes UTF-8 por meio de `Utilities.newBlob(...).getBytes()` e passar arrays tipados, sem depender de `TextEncoder`.
- O pacote usa Promises e compilação/instanciação WebAssembly assíncrona. A função assíncrona foi executada com sucesso no editor do Apps Script; os dois vetores e os tempos estão registrados na seção 8.9.
- O arquivo enviado pelo responsável foi validado: `hash-wasm-4.13.0.tgz`, SHA-256 `237a2735a3bb8725603a797fea1ba3e455d70e11f338518a65d42dab60182b68`. A listagem real do tarball confirma `package/dist/argon2.umd.min.js` (30.094 bytes) e `package/LICENSE`. SHA-256 do bundle UMD: `acfe11b015852f593aaddc51116f71dc7850e4551e6b34d42c1f88cf39635f03`. A dependência `hash-wasm` foi adicionada somente em `devDependencies`, fixada em `4.13.0` no `package.json` e `package-lock.json` para que a CI teste exatamente o mesmo bundle. O código do produto não importa essa dependência. O bundle contém o módulo WebAssembly incorporado como Base64; não é necessário arquivo `.wasm` externo. Não carregar CDN ou versão flutuante durante autenticação.
- O helper `argon2Verify` do código consultado compara strings com `===`. Não adotá-lo automaticamente para autenticação. A etapa seguinte precisa revisar a comparação do resultado derivado e a forma como o hash codificado é validado.
- A documentação do pacote apresenta benchmarks do navegador/Node, não do Apps Script. Esses números não serão usados para estimar desempenho no Google.

### 8.7. Validações complementares — Argon2id

A execução manual comprovou que a biblioteca e o algoritmo funcionam no runtime real com os parâmetros testados. Antes de considerar o KDF apto a participar de autenticação, permanecem estas verificações:

1. Repetir a medição do perfil `m=19456 KiB,t=2,p=1` em pelo menos cinco execuções separadas, registrando cada duração e variação.
2. Avaliar o comportamento com execuções concorrentes controladas, observando falhas, consumo de recursos e limites/quota do Apps Script. Não iniciar carga agressiva nem usar a conta de produção.
3. Validar no Apps Script a estrutura e conversão de `Utilities.getUuid()` para um salt de 16 bytes. A base documental candidata é a equivalência oficial com `java.util.UUID.randomUUID()`, cuja especificação Java descreve PRNG criptograficamente forte; a execução manual deve confirmar formato v4 e conversão, sem alegar que uma amostra estatística prova CSPRNG.
4. Revisar o formato de armazenamento/versionamento (algoritmo, versão, parâmetros, salt e hash), os limites de entrada e a política de atualização dos parâmetros.
5. Criar e revisar o procedimento de verificação: não usar automaticamente `argon2Verify` do pacote, que compara strings com `===`; avaliar comparação de tamanho fixo e limitações de garantias de tempo constante em JavaScript.
6. Definir controles de abuso/rate limit no servidor antes de expor qualquer endpoint que execute um KDF memory-hard.
7. Registrar revisão da biblioteca, licença, versão e hashes dos artefatos distribuídos. Manter o bundle fixado e sem CDN/runtime download.

A configuração `m=19456 KiB,t=2,p=1` corresponde ao perfil mínimo de referência usado nesta POC. Não reduzir parâmetros para acomodar uma limitação operacional. Nenhum login ou armazenamento de senha está liberado por esta seção.

### 8.8. Teste local do bundle original — Node.js

O bundle UMD extraído do tarball enviado foi carregado em um contexto JavaScript de teste sem `TextEncoder`. Foi necessário passar `secret: new Uint8Array(0)`, pois a biblioteca converte o valor padrão `secret=""` com `TextEncoder`, mesmo quando senha e salt já são bytes. O wrapper da POC converte a senha para UTF-8 com `Utilities.newBlob(...).getBytes()` e fornece o segredo vazio como array tipado.

Resultados locais em Node.js 24, usando o bundle original 4.13.0 e os dois vetores independentes:

| Caso | Resultado | Tempo local |
|---|---|---:|
| Vetor pequeno (m=32 KiB,t=3,p=4) | PASS | 11,6 ms |
| Perfil OWASP (m=19.456 KiB,t=2,p=1) | PASS | 49,6 ms |

Esses tempos são apenas referências do teste Node local, não estimativas nem resultados do Apps Script. A geração independente dos dois vetores foi reproduzida com `argon2-cffi==25.1.0`/libargon2, e o bundle UMD gerou as mesmas 32 bytes nos dois casos.

### 8.9. Execução manual no Apps Script — concluída

A função `poc03RunArgon2idTests` foi executada no projeto Apps Script isolado em 2026-11-12, com o bundle original `hash-wasm@4.13.0` no arquivo `HashWasmArgon2.gs`. A função compara os resultados binários byte a byte e registra somente PASS/FAIL, parâmetros e tempos — não registra senha, salt de conta ou hash de usuário.

Resultado informado pelo Execution Log em cinco baterias manuais independentes:

| Execução | KAT pequeno (m=32 KiB,t=3,p=4) | Perfil de referência (m=19456 KiB,t=2,p=1) | Total da bateria | Resultado |
|---|---:|---:|---:|---|
| Inicial | 10 ms | 142 ms | 161 ms | PASS 2/2 |
| Repetição 1 | 24 ms | 130 ms | 162 ms | PASS 2/2 |
| Repetição 2 | 8 ms | 86 ms | 100 ms | PASS 2/2 |
| Repetição 3 | 9 ms | 280 ms | 294 ms | PASS 2/2 |
| Repetição 4 | 9 ms | 61 ms | 94 ms | PASS 2/2 |

**Resumo das cinco medições do perfil de referência:**

- Média aritmética: **139,8 ms**.
- Mediana: **130 ms**.
- Mínimo: **61 ms**.
- Máximo: **280 ms**.
- Todas as cinco execuções produziram exatamente os 32 bytes esperados e retornaram PASS.

O perfil de referência derivou 32 bytes e correspondeu exatamente ao vetor independente. O teste executou Argon2id real da biblioteca com seu módulo WebAssembly incorporado; não foi apenas a sonda anterior de memória independente.

**Interpretação:** há evidência funcional repetida e desempenho pontual promissor no runtime real do Apps Script. O maior tempo observado, 280 ms, permanece muito abaixo do limite global de seis minutos por execução. Isso não significa que exista garantia de latência máxima: a variação de 61 a 280 ms (aproximadamente 4,6 vezes entre menor e maior amostra) mostra que o tempo oscila entre execuções. A média e a mediana descrevem somente estas cinco amostras, não uma distribuição estável ou um SLA.

**Limites da evidência:** cinco baterias manuais independentes não constituem teste de carga ou garantia para outras contas, horários, quotas ou condições de concorrência. A duração do Execution Log (início/conclusão) não deve ser confundida com os tempos internos medidos pelo harness. O teste não mede pico total de memória do processo, concorrência simultânea, rate limit, disponibilidade de CSPRNG para salt, comparação segura, armazenamento, recuperação, sessão ou resistência a abuso.

O projeto Apps Script continuou isolado, sem publicação como Web App, sem planilha de negócio e sem credenciais reais. A execução não autoriza copiar o harness para autenticação.

### 8.11. Fonte candidata para salt — Utilities.getUuid()

A documentação oficial do Google declara que `Utilities.getUuid()` é equivalente ao método `java.util.UUID.randomUUID()` ([Google Apps Script Utilities](https://developers.google.com/apps-script/reference/utilities/utilities#getUuid)). A especificação Java declara que `UUID.randomUUID()` gera um UUID versão 4 usando um gerador pseudoaleatório criptograficamente forte ([Java SE — UUID.randomUUID](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/UUID.html#randomUUID())). Essa cadeia documental oferece uma base técnica para utilizar `Utilities.getUuid()` como fonte candidata de salt aleatório no Apps Script.

A ressalva do Google sobre não garantir unicidade absoluta em todo o tempo/espaço permanece aplicável: UUID é uma fonte aleatória probabilística, não um mecanismo de unicidade global garantida. Para salts, a exigência é um valor aleatório individual por senha; a OWASP descreve o salt como uma string única e aleatoriamente gerada ([OWASP Password Storage Cheat Sheet — Salting](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#salting)).

O harness recebeu dois helpers:
- `poc03GenerateSaltHex_()`: obtém um UUID pelo serviço oficial do Apps Script, exige formato UUID v4/RFC, remove os hífens e retorna 32 caracteres hexadecimais (16 bytes).
- `poc03RunSaltGenerationTests()`: gera 256 amostras, verifica formato v4/variante, tamanho de 16 bytes e ausência de repetição dentro da amostra. Os valores nunca são impressos no log.

**Resultado manual no Apps Script — 2026-11-12:**

| Verificação | Resultado |
|---|---:|
| Amostras geradas | 256 |
| UUIDs v4/variante válidos | 256 |
| Conversão para salt de 16 bytes | 256 |
| Valores distintos na amostra | 256 |
| Colisões observadas | 0 |
| Salt exposto no log | Não |

O Execution Log registrou `status=PASS`, `samples=256`, `validUuidV4=256`, `saltBytes=16`, `uniqueSamples=256`, `duplicateCount=0` e `statisticalProofOfCSPRNG=false`.

**Interpretação:** a execução confirma que o helper funcionou no Apps Script real, gerou 256 UUIDs v4 válidos e os converteu para 16 bytes sem colisão na amostra. Conforme a RFC 9562, UUIDv4 contém 122 bits destinados a dados aleatórios; os demais 6 bits codificam versão e variante. A cadeia documental Google → Java declara que `Utilities.getUuid()` é equivalente a `UUID.randomUUID()`, e a documentação Java especifica um PRNG criptograficamente forte. Portanto, a fonte é aceita como candidata de salt aleatório para continuar a POC. O Google alerta que UUID não garante unicidade absoluta em todos os tempos e espaços; a ausência de colisões nas 256 amostras também não prova aleatoriedade. O requisito aqui é obter um salt aleatório por senha, não um identificador matematicamente único global.

Formato de armazenamento candidato, ainda não aprovado para uso:
- `senha_algoritmo`: `argon2id$v=19$m=19456,t=2,p=1`.
- `senha_salt`: 32 caracteres hex minúsculos (16 bytes).
- `senha_hash`: 64 caracteres hex minúsculos (32 bytes).

A separação corresponde aos três campos já modelados na entidade `USUARIOS`. A aprovação desse formato depende da revisão da rotina de verificação, codificação de senha e limites de entrada. Nenhum dado deve ser escrito na planilha nesta POC.


### 8.12. Prova de criação/verificação do registro — execução manual concluída

Foi adicionada ao harness uma prova de ciclo completo sem persistência:

- `poc03CreatePasswordRecordForPoc_`: gera salt novo por meio do helper UUIDv4 e deriva 32 bytes com o perfil fixo Argon2id.
- `poc03VerifyPasswordForPoc_`: exige metadados estritamente allowlisted, salta de 16 bytes e hash de 32 bytes; deriva novamente a senha candidata e compara todos os 32 bytes com acumulador XOR.
- `poc03RunPasswordRecordVerificationTests`: cria um registro fictício apenas em memória e executa oito casos: estrutura válida, senha correta, senha errada, salt alterado, hash alterado, algoritmo/parâmetros desconhecidos, salt malformado e hash malformado.

Formato candidato utilizado na prova:
- `senha_algoritmo = argon2id$v=19$m=19456,t=2,p=1`
- `senha_salt`: 16 bytes, 32 caracteres hexadecimais minúsculos.
- `senha_hash`: 32 bytes, 64 caracteres hexadecimais minúsculos.

A função não grava em Sheets, Drive ou Properties e não registra senha, salt ou hash. O metadata allowlist mantém os parâmetros de custo fixos; não aceita memória/iterações/paralelismo arbitrários vindos do registro, evitando que metadados adulterados solicitem custo excessivo.

**Limite importante da comparação:** a rotina percorre todos os bytes com acumulador XOR e só decide ao final, mas JavaScript/V8 não fornece garantia formal de tempo constante. Portanto, este teste avalia comportamento funcional e rejeição de adulteração; não certifica resistência a side-channel e não aprova a rotina para autenticação.

**Resultado manual no Apps Script — 2026-11-12: PASS 8/8.** O responsável executou a função no projeto isolado. O Execution Log registrou:

| Caso | Resultado | Tempo interno |
|---|---:|---:|
| Registro no formato esperado | PASS | 0 ms |
| Senha correta | PASS | 202 ms |
| Senha incorreta | PASS | 285 ms |
| Salt adulterado | PASS (rejeitado) | 149 ms |
| Hash adulterado | PASS (rejeitado) | 183 ms |
| Algoritmo/parâmetros não permitidos | PASS (rejeitado) | 0 ms |
| Salt malformado | PASS (rejeitado) | 3 ms |
| Hash malformado | PASS (rejeitado) | 0 ms |

Resumo: `testsPassed=8`, `testsTotal=8`, `totalElapsedMs=1031`, `saltBytes=16`, `hashBytes=32`, `storage=MEMORY_ONLY_NOT_SAVED` e `comparison=FIXED_LENGTH_XOR_ACCUMULATOR_NOT_PROVEN_CONSTANT_TIME`.

**Interpretação:** o registro sintético foi criado em memória; a senha correta foi aceita; senha incorreta, salt/hash adulterados, algoritmo desconhecido e campos malformados foram rejeitados. O teste confirma o comportamento funcional esperado para esses oito cenários. O tempo de 1.031 ms é a soma medida internamente para a bateria inteira; não deve ser confundido com os cinco segundos aproximados entre os avisos de início/conclusão do editor.

**Limites:** esta é uma execução manual de teste, não um ensaio de carga, auditoria criptográfica ou certificação de comparação em tempo constante. Os tempos individuais não constituem medição controlada de side-channel. O registro não foi persistido em Sheets, Drive ou Properties e os logs não exibiram senha, salt ou hash. A implementação de comparação continua experimental.

A execução automatizada em Node/VM é complementar e não substitui o resultado manual no Apps Script real. O projeto permaneceu isolado, sem publicação como Web App, sem planilha de negócio e usando apenas uma senha sintética.

### 8.10. Decisão após a execução real

- **PBKDF2 sobre `Utilities`: reprovado** por desempenho operacional inconclusivo e margem insuficiente.
- **Argon2id via `hash-wasm@4.13.0`: aprovado somente como candidato tecnicamente viável para continuar a POC.** Os dois vetores passaram em cinco baterias manuais; o perfil de referência apresentou média de 139,8 ms, mediana de 130 ms e intervalo observado de 61–280 ms. O resultado é promissor, mas a amostra ainda é pequena e não avalia concorrência ou carga.
- **Fonte candidata de salt:** execução manual concluída com PASS em 256/256 UUIDs v4, 16 bytes cada e zero colisões observadas. A documentação Google → Java oferece a base criptográfica; a amostra não prova CSPRNG.
- **Ciclo de criação/verificação:** PASS 8/8 no Apps Script real, em 1.031 ms; registro apenas em memória. Senha correta aceita e senha incorreta/adulterações/metadados malformados rejeitados.
- **Política de entrada:** PASS 14/14 no Apps Script real; regras candidatas de comprimento, NFC, bytes UTF-8 e Unicode passaram. A blocklist continua pendente.
- **Modelo de throttling:** PASS 6/6 no Apps Script real; confirma as transições 5 falhas/15 minutos e bloqueio de 15 minutos. Estado apenas em memória; concorrência não testada.
- **Autenticação/login: continua bloqueado.** Ainda faltam aprovação formal do formato de armazenamento, revisão independente da comparação/rotina de verificação, blocklist, mecanismo real e atômico de rate limit, ensaio de concorrência e revisão de segurança da dependência e da integração.

O próximo passo da POC é fechar a blocklist, decidir o comparador de hash e desenhar a implementação persistente/atômica do controle de tentativas; depois executar testes controlados de concorrência. Os dois testes manuais acima validam somente a política e o modelo lógico, sem cadastro, login, sessão ou operações de negócio.


### 8.13. Política de entrada de senha — execução manual concluída

A função `poc03RunPasswordInputPolicyTests` testa a política de entrada antes de chamar Argon2id. Critérios candidatos:

- Mínimo: **15 pontos de código Unicode** (não unidades UTF-16).
- Máximo: **128 pontos de código Unicode**, portanto aceita pelo menos os 64 caracteres recomendados pelo NIST.
- Teto absoluto: **512 bytes UTF-8** após normalização NFC; isso permite 128 pontos de código que ocupem até quatro bytes cada e limita entradas excessivas.
- Unicode é normalizado para **NFC antes de derivar o hash**, tanto na criação quanto na verificação.
- Espaços iniciais/finais e diferenças entre maiúsculas/minúsculas são preservados; não aplicar `trim`, lowercase ou remoção de espaços.
- Caracteres imprimíveis ASCII, espaços e Unicode são aceitos; controles C0/C1 e sequências UTF-16 malformadas são rejeitados.
- Senhas não são truncadas.

A função cobre 14 casos: 14/15 caracteres, comprimentos de 64/128/129, emoji contado como ponto de código, 128 emojis/512 bytes, 129 emojis, NFC composto/decomposto, preservação de espaços, controles, surrogate isolado e tipo de entrada inválido. Também deriva as duas formas NFC com o mesmo salt sintético para conferir a igualdade binária das saídas. Não registra a senha ou os bytes derivados.

**Referência:** NIST SP 800-63B-4 (2025), seção 3.1.1.2 recomenda mínimo de 15 caracteres para senha como fator único, permitir pelo menos 64, contar code points Unicode, não truncar e aplicar NFC antes do hash quando Unicode for aceito. Também exige blocklist de senhas comuns/esperadas/comprometidas. [NIST SP 800-63B-4 — Password Verifiers](https://pages.nist.gov/800-63-4/sp800-63b.html#passwordver).

**Resultado manual no Apps Script — 2026-11-12: PASS 14/14.** O responsável executou `poc03RunPasswordInputPolicyTests` no projeto isolado. Passaram os 14 cenários listados acima, incluindo a derivação Argon2id idêntica para formas compostas/decompostas após NFC com o mesmo salt. O resumo confirmou `minimumCodePoints=15`, `maximumCodePoints=128`, `maximumUtf8Bytes=512`, `unicodeNormalization=NFC`, `spacesTrimmed=false` e `failedTests=[]`. Nenhuma senha, salt ou saída derivada foi exposta nos logs.

**Limites:** o máximo de 128 code points/512 bytes é uma decisão de engenharia candidata desta POC, não um número determinado pelo NIST. A blocklist de senhas comuns/esperadas/comprometidas ainda não foi integrada; não declarar a política completa até escolher e validar a fonte/lista. A passagem dos casos de entrada não substitui a revisão da comparação segura nem aprova a autenticação.

### 8.14. Throttling de login — modelo lógico executado manualmente

A função `poc03RunLoginThrottlePolicyTests` simula em memória a regra já aprovada na especificação:

- 5 falhas dentro de uma janela de 15 minutos;
- após a quinta falha, bloqueio por 15 minutos;
- tentativas durante o bloqueio não avançam o contador;
- ao expirar, o contador reinicia;
- uma autenticação bem-sucedida limpa o estado.

São seis cenários determinísticos com relógio simulado. Nenhuma planilha, Properties Service, LockService, e-mail, IP ou conta real é acessada.

**Limite importante:** o modelo apenas testa a lógica de transição. Não é um rate limiter operacional, não persiste estado, não comprova atomicidade concorrente e não protege endpoint algum. A implementação real precisará consultar/atualizar `CONTROLE_AUTENTICACAO` sob LockService antes de executar o KDF e testar concorrência com chamadas reais.

**Resultado manual no Apps Script — 2026-11-12: PASS 6/6.** O responsável executou `poc03RunLoginThrottlePolicyTests` e os seis cenários passaram: quinta falha aciona bloqueio; novas tentativas durante o bloqueio são recusadas; a expiração libera e zera o contador; falhas fora da janela anterior iniciam nova janela; sucesso limpa o controle; tentativa bloqueada não incrementa o contador. O resumo confirmou `threshold=5`, `observationWindowMs=900000`, `lockDurationMs=900000`, `storage=MEMORY_ONLY_NOT_PERSISTED` e `concurrency=NOT_TESTED`.

A OWASP observa que contadores por conta evitam a evasão por troca de IP, mas alerta que bloqueios de conta podem ser abusados para causar negação de serviço. É necessário combinar a regra aprovada com proteção de frequência na borda e resposta genérica, sem confiar em um `Map` em memória numa Function serverless como controle durável. [OWASP Authentication Cheat Sheet — Login Throttling](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#login-throttling).

### 8.15. Comparação segura do hash — bloqueio arquitetural aberto

O harness ainda usa comparação byte a byte com acumulador XOR em JavaScript. O loop percorre todos os 32 bytes e não termina no primeiro byte divergente, mas **não há garantia formal de tempo constante no JavaScript/V8**. A OWASP recomenda comparação por função segura/constante quando possível e exige limitar o tamanho, definir tipos e evitar diferenças de tempo. [OWASP Authentication Cheat Sheet — Compare Password Hashes Using Safe Functions](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#compare-password-hashes-using-safe-functions).

A documentação do Apps Script V8 lista `crypto` e `SubtleCrypto` entre as APIs indisponíveis. O runtime Node.js da Vercel expõe APIs Node completas; Node fornece `crypto.timingSafeEqual`, documentada como comparação de tempo constante para buffers de mesmo tamanho. Fontes: [Apps Script V8](https://developers.google.com/apps-script/guides/v8-runtime) · [Vercel Node.js Runtime](https://vercel.com/docs/functions/runtimes/node-js) · [Node.js crypto.timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b).

**Opção arquitetural a avaliar:** executar somente a comparação constante de dois buffers de 32 bytes na Function Node da Vercel, mantendo no Apps Script a leitura do registro, derivação Argon2id, regras da conta e emissão/validação da sessão. Isso exige que os valores derivados trafeguem apenas entre Apps Script e Function, nunca para o navegador/logs, e que a Function devolva o resultado de comparação por chamada assinada. Essa opção amplia a responsabilidade da Function além do gateway de transporte e **não está aprovada**. Alternativa: avaliar um comparador WASM pequeno e revisado, executado dentro do Apps Script. Não implementar login até essa decisão ser resolvida.



### 8.16. Throttling persistente com PropertiesService + ScriptLock

Foi preparada uma segunda etapa para ir além do modelo in-memory da seção 8.14. A função `poc03RunPersistentThrottlePolicyTests` usa o serviço real `PropertiesService.getScriptProperties()` e o lock real `LockService.getScriptLock()` no projeto isolado do Apps Script.

**Comportamento implementado:**
- O identificador de teste é fixo e sintético, no domínio reservado `.invalid.example`; nunca é um e-mail real.
- Uma chave HMAC-SHA-256 do identificador normalizado compõe a chave de armazenamento. A chave HMAC é exclusiva da POC, gerada e guardada nas Script Properties e nunca registrada nos logs.
- A leitura, validação, transição e gravação do estado acontecem dentro de um `ScriptLock`; o lock é liberado no bloco `finally`.
- O estado contém versão de esquema, contador, início da janela, instante de bloqueio e última atualização.
- Erro de aquisição do lock, indisponibilidade do Properties Service ou estado inválido/corrompido falha fechado. O estado corrompido não é zerado silenciosamente.
- A tentativa durante bloqueio não incrementa nem sobrescreve o estado.
- Login bem-sucedido remove o registro sintético de controle.
- O prefixo `POC03_THROTTLE_TEST_` isola as propriedades. A limpeza nunca usa `deleteAllProperties()` e não toca nas propriedades da POC-02.

**Resultado automatizado:** CI de push #231 — SUCCESS. Foram adicionados testes do harness Node/VM para estado persistido simulado, falha fechada quando o lock não pode ser adquirido ou o serviço de propriedades está indisponível, e dez workers sequenciais. Essa bateria automatizada não simula contenção real entre execuções independentes do Google.

**Execução manual no Apps Script — concluída em 2026-11-13:**

- **poc03RunPersistentThrottlePolicyTests(): PASS 6/6** no runtime real. O resumo confirmou threshold=5, observationWindowMs=900000, lockDurationMs=900000, persistence=SCRIPT_PROPERTIES_TEST_ONLY e synchronization=SCRIPT_LOCK. Também confirmou falha fechada para estado corrompido e ausência de contas reais. A limpeza automática removeu duas propriedades exclusivas do prefixo POC-03.
- **poc03ResetPersistentThrottleConcurrencyProbe(): READY**, com dez workers esperados e espera artificial de 150 ms dentro da seção crítica.
- **poc03RunPersistentThrottleConcurrencyWorker():** foram iniciadas dez execuções separadas do projeto Apps Script. O consolidado registrou os dez resultados.
- **poc03RunPersistentThrottleConcurrencySummary(): PASS**, com observedWorkers=10, countedBeforeLimit=4, lockedAtLimit=1, rejectedWhileLocked=5, lockUnavailable=0, finalFailureCount=5 e finalStateBlocked=true.
- **poc03CleanupPersistentThrottleTestData(): PASS**, removeu quatro propriedades da sonda; o escopo informado foi somente POC03_THROTTLE_TEST_.

**Interpretação e limite da evidência:** o histórico do Apps Script apresenta os horários de início somente com precisão de segundos, enquanto as durações são fracionárias. A maioria dos intervalos aparenta ser sequencial. O par mais próximo foi o worker exibido às 14:26:16, com duração de 1,419 s, seguido pelo próximo início exibido às 14:26:18. Como o histórico não informa a fração de segundo dos inícios, esse par não permite concluir se houve ou não uma pequena sobreposição. Portanto, os dados disponíveis **não comprovam contenção simultânea pelo ScriptLock**, mas também não permitem afirmar categoricamente que nenhuma sobreposição ocorreu. O resumo PASS comprova que dez execuções independentes compartilharam o estado persistido e produziram a distribuição esperada. Registrar separadamente: persistência e transições entre execuções independentes validadas; contenção concorrente ainda inconclusiva. A próxima sonda deve registrar timestamps em milissegundos para início da chamada, aquisição do lock, liberação do lock e conclusão, além do tempo gasto aguardando o lock.

**Nova sonda coordenada — implementação preparada; execução manual pendente:**

A tentativa anterior usou dez execuções iniciadas manualmente, sem evidência suficiente de sobreposição. Para eliminar essa dependência de cliques, foi adicionada uma segunda sonda:

- `poc03LaunchPersistentThrottleCoordinatedConcurrencyProbe()` cria dez gatilhos de relógio de execução única, cada um associado a um handler exclusivo.
- O horário real de disparo pode variar; por isso, os workers registram a chegada em Script Properties e aguardam uma barreira comum de dez participantes, com timeout de 180 segundos. Cada worker aguarda a configuração inicial por até 30 segundos; depois, só libera a fase crítica quando os dez chegaram à barreira. Cada handler recebe o objeto de evento instalável; o `triggerUid` recebido é convertido para string e comparado ao ID único registrado na criação. Isso impede que um gatilho antigo/atrasado seja aceito como worker de uma nova execução da sonda.
- Cada worker chama a mesma atualização persistente sob `ScriptLock`, mantendo o lock por 350 ms artificialmente para tornar a contenção mensurável.
- Os dados de cada worker registram timestamps em milissegundos para início da execução, passagem pela barreira, solicitação/aquisição/liberação do lock e conclusão; também registram tempo de espera e tempo segurando o lock.
- `poc03RunPersistentThrottleCoordinatedConcurrencySummary()` calcula intervalos de execução, máximo de workers simultaneamente ativos, sobreposição entre intervalos e quantidade de workers que esperaram pelo lock. Só retorna PASS se os dez intervalos se sobrepuserem em algum instante, houver contenção mensurável e a distribuição persistida continuar 4 COUNTED, 1 LOCKED_AFTER_FAILURE e 5 BLOCKED.
- `poc03CleanupPersistentThrottleCoordinatedConcurrencyProbe()` remove somente os gatilhos dos dez handlers exclusivos e propriedades sob o prefixo de teste POC-03.

**Procedimento manual:**
1. Atualizar o `Code.gs` do projeto isolado com a versão desta branch.
2. Executar uma única vez `poc03LaunchPersistentThrottleCoordinatedConcurrencyProbe()`. Na primeira execução, autorizar o gerenciamento de gatilhos solicitado pelo Google. A função verifica a cota disponível, cria dez gatilhos e associa cada `triggerUid` ao respectivo handler.
3. Não abrir dez abas nem executar os workers manualmente. A função cria os dez gatilhos.
4. Acompanhar em **Execuções** os dez handlers `poc03RunPersistentThrottleCoordinatedWorker00_` até `poc03RunPersistentThrottleCoordinatedWorker09_` e aguardar todos terminarem.
5. Executar `poc03RunPersistentThrottleCoordinatedConcurrencySummary()` e guardar o log completo.
6. Executar `poc03CleanupPersistentThrottleCoordinatedConcurrencyProbe()` após guardar o resumo.

O builder `after(1000)` define uma duração mínima, não um horário exato; a barreira é que sincroniza a fase crítica. O lançador verifica a cota documentada de até 20 gatilhos por usuário por projeto e recusa a preparação se não houver espaço para dez, sem apagar gatilhos de outras funções. A execução coordenada permanece pendente no Apps Script real; o harness Node/VM valida apenas o cálculo dos intervalos e a instrumentação opcional do lock, não substitui essa execução manual.

Referências oficiais: [ClockTriggerBuilder.after](https://developers.google.com/apps-script/reference/script/clock-trigger-builder#after(Integer)) · [Gatilhos instaláveis](https://developers.google.com/apps-script/guides/triggers/installable) · [Objeto de evento para gatilhos](https://developers.google.com/apps-script/guides/triggers/events) · [Cotas e limite de 20 gatilhos por usuário/projeto](https://developers.google.com/apps-script/guides/services/quotas).

**Limite arquitetural:** este passo persiste estado em Script Properties para testar a primitiva key-value, não na aba `CONTROLE_AUTENTICACAO` da modelagem. Script Properties são compartilhadas por todos os usuários do mesmo projeto; `getScriptLock()` também serializa a seção crítica para todas as execuções desse projeto, não apenas para uma conta. Isso favorece consistência simples, mas cria um ponto global de contenção.

O serviço de propriedades tem limites documentados: 9 KB por valor, 500 KB por armazenamento e cotas diárias de leitura/escrita de 50.000 para contas de consumidor ou 500.000 para Google Workspace. Portanto, **não é a decisão de armazenamento final para o cadastro real**. A implementação vinculada à modelagem ainda precisa ser validada com a aba `CONTROLE_AUTENTICACAO`, operações na planilha sob lock e concorrência entre execuções independentes. Fontes: [Properties Service](https://developers.google.com/apps-script/guides/properties) · [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas) · [LockService](https://developers.google.com/apps-script/reference/lock/lock-service).

