# POC-03 — viabilidade de derivação e armazenamento de senhas

> **Status:** PBKDF2 sobre `Utilities` reprovado como candidato para implementação. A sonda básica de WebAssembly passou no Apps Script real em 2026-11-12. `hash-wasm` 4.13.0 foi identificado como candidato para uma nova prova de execução Argon2id, ainda não integrado nem aprovado. Nenhum KDF ou login foi aprovado.
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

### 8.6. Biblioteca candidata para a próxima etapa: hash-wasm 4.13.0

Foi feita uma análise preliminar da biblioteca `hash-wasm`:

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
- O pacote usa Promises e compilação/instanciação WebAssembly assíncrona. Isso precisa ser testado no fluxo real do editor Apps Script, sem presumir compatibilidade apenas porque a sonda simples passou.
- O arquivo enviado pelo responsável foi validado: `hash-wasm-4.13.0.tgz`, SHA-256 `237a2735a3bb8725603a797fea1ba3e455d70e11f338518a65d42dab60182b68`. A listagem real do tarball confirma `package/dist/argon2.umd.min.js` (30.094 bytes) e `package/LICENSE`. SHA-256 do bundle UMD: `acfe11b015852f593aaddc51116f71dc7850e4551e6b34d42c1f88cf39635f03`. A dependência `hash-wasm` foi adicionada somente em `devDependencies`, fixada em `4.13.0` no `package.json` e `package-lock.json` para que a CI teste exatamente o mesmo bundle. O código do produto não importa essa dependência. O bundle contém o módulo WebAssembly incorporado como Base64; não é necessário arquivo `.wasm` externo. Não carregar CDN ou versão flutuante durante autenticação.
- O helper `argon2Verify` do código consultado compara strings com `===`. Não adotá-lo automaticamente para autenticação. A etapa seguinte precisa revisar a comparação do resultado derivado e a forma como o hash codificado é validado.
- A documentação do pacote apresenta benchmarks do navegador/Node, não do Apps Script. Esses números não serão usados para estimar desempenho no Google.

### 8.7. Plano da próxima prova — Argon2id WASM real

A próxima etapa deve ser uma prova de execução do algoritmo, ainda sem cadastro/login ou conexão com Sheets:

1. Fixar e obter o pacote `hash-wasm@4.13.0` e sua distribuição Argon2 WASM; guardar licença e SHA-256 dos artefatos.
2. Verificar se o bundle UMD funciona no Apps Script com senha/salt como `Uint8Array`, sem `TextEncoder`, `Buffer`, `atob`, `fetch`, timers ou APIs Node/browser ausentes.
3. Comparar contra vetores independentes gerados com `argon2-cffi` 25.1.0, que usa o código C de Argon2, sem secret nem associated data. A biblioteca `hash-wasm` consultada não expõe associated data e fixa seu tamanho em zero; portanto, não pode reproduzir diretamente o vetor completo da RFC 9106 (que usa associated data não vazio). Não rotular os vetores abaixo como vetores oficiais RFC.

Vetores de referência calculados fora do pacote sob teste, Argon2id v1.3, saída raw de 32 bytes:

| Caso | Senha (hex) | Salt (hex) | m (KiB) | t | p | Saída esperada (hex) |
|---|---|---|---:|---:|---:|---|
| KAT independente pequeno | `01` repetido 32 vezes | `02` repetido 16 vezes | 32 | 3 | 4 | `03aab965c12001c9d7d0d2de33192c0494b684bb148196d73c1df1acaf6d0c2e` |
| Parâmetros-alvo | UTF-8 de `Conecta Local POC Argon2id test` | `00112233445566778899aabbccddeeff` | 19.456 | 2 | 1 | `e68ff93eaa19dc2c1721cc50614468011e94c113d2b5888d0c3c3976ff5497c4` |

Referência de cálculo: `argon2-cffi==25.1.0`, `Type.ID`, version 19; o pacote de bindings utiliza a implementação C vendorizada do Argon2. A saída esperada deve ser reproduzida independentemente antes de aprovar qualquer teste automatizado.
4. Testar a capacidade de crescer a memória dentro do próprio módulo WASM, além do teste independente de 19 MiB já aprovado.
5. Medir tempo e memória com Argon2id v1.3, inicialmente com a configuração mínima OWASP `m=19.456 KiB, t=2, p=1`, saída de 32 bytes, salt de 16 bytes.
6. Repetir a medição em execuções separadas e verificar concorrência, limite de seis minutos, consumo total e risco de negação de serviço.
7. Se o pacote não funcionar ou não tiver margem operacional suficiente, reabrir a arquitetura. Não reduzir os parâmetros abaixo do recomendado apenas para fazer o teste passar.

### 8.8. Teste local do bundle original — Node.js

O bundle UMD extraído do tarball enviado foi carregado em um contexto JavaScript de teste sem `TextEncoder`. Foi necessário passar `secret: new Uint8Array(0)`, pois a biblioteca converte o valor padrão `secret=""` com `TextEncoder`, mesmo quando senha e salt já são bytes. O wrapper da POC converte a senha para UTF-8 com `Utilities.newBlob(...).getBytes()` e fornece o segredo vazio como array tipado.

Resultados locais em Node.js 24, usando o bundle original 4.13.0 e os dois vetores independentes:

| Caso | Resultado | Tempo local |
|---|---|---:|
| Vetor pequeno (m=32 KiB,t=3,p=4) | PASS | 11,6 ms |
| Perfil OWASP (m=19.456 KiB,t=2,p=1) | PASS | 49,6 ms |

Esses tempos são apenas referências do teste Node local, não estimativas nem resultados do Apps Script. A geração independente dos dois vetores foi reproduzida com `argon2-cffi==25.1.0`/libargon2, e o bundle UMD gerou as mesmas 32 bytes nos dois casos.

### 8.9. Execução manual pendente no Apps Script

A função preparada no harness é `poc03RunArgon2idTests`. Ela executa sequencialmente os dois vetores, compara a saída binária byte a byte, mede a duração e registra apenas PASS/FAIL e parâmetros — nunca a senha ou o hash derivado.

Para executar no projeto Apps Script isolado:

1. Criar um arquivo de script chamado `HashWasmArgon2.gs`.
2. Extrair do tarball exatamente o bundle `package/dist/argon2.umd.min.js` e colar todo o conteúdo nesse arquivo. No PowerShell, a partir da pasta onde está o `.tgz`, execute:
   ```powershell
   tar -xzf .\\hash-wasm-4.13.0.tgz package/dist/argon2.umd.min.js
   ```
   Depois abra `package\\dist\\argon2.umd.min.js`, copie o conteúdo integral e cole em `HashWasmArgon2.gs`. O bundle extraído deve ter SHA-256 `acfe11b015852f593aaddc51116f71dc7850e4551e6b34d42c1f88cf39635f03`.
3. Substituir o conteúdo de `Code.gs` pela versão desta branch, que contém `poc03RunArgon2idTests`.
4. Selecionar e executar somente `poc03RunArgon2idTests`.

O projeto deve continuar isolado, sem Web App publicado, sem planilha de negócio e sem credenciais reais. A função é assíncrona; o V8 do Apps Script suporta `async`/`await`, Promises e o processamento de microtarefas necessário à instanciação WebAssembly. <https://developers.google.com/apps-script/guides/v8-runtime>

**Estado:** bundle e vetores foram verificados em Node local. Ainda falta a execução manual no Apps Script real para verificar compatibilidade, crescimento de memória interno e tempo na plataforma Google. Nenhum algoritmo, salt de produção, comparação de autenticação ou fluxo de login está aprovado.
