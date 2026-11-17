# POC-02 — Autenticidade do gateway Vercel → Apps Script

> **Estado:** implementada e validada manualmente em Preview e no Web App Apps Script isolado em 2026-11-11. PR #11 aberto para integração em `dev`; não aprovada para produção.
> **Base:** branch `dev`, após integração da POC-01.
> **Escopo:** autenticar cada chamada server-to-server, detectar adulteração, expiração e replay.

## 1. Objetivo

A POC-01 comprovou o transporte React → Vercel Function → Apps Script. Ela não autenticava a Function perante o Apps Script. A POC-02 adiciona uma assinatura HMAC-SHA-256 calculada exclusivamente no servidor da Vercel e verificada no Apps Script.

Critérios obrigatórios:

- chamada assinada e íntegra é aceita;
- chamada direta sem assinatura válida é recusada;
- assinatura adulterada ou payload alterado é recusado;
- timestamp fora da janela de validade é recusado;
- nonce já utilizado é recusado como replay;
- nenhuma chave ou assinatura privada é enviada ao React, incluída no bundle ou escrita em logs;
- falhas de configuração e do registro de nonce são tratadas de forma segura (fail closed).

A POC continua limitada a mensagens sintéticas e às três ações de teste já existentes. Não habilita login, sessão, planilha, Drive ou operações de negócio.

## 2. Decisões criptográficas

### 2.1. Algoritmo e segredo

- MAC: **HMAC-SHA-256**.
- Saída da assinatura: 32 bytes representados como 64 caracteres hexadecimais minúsculos.
- Segredo: 32 bytes aleatórios, representados por 64 caracteres hexadecimais.
- O segredo será armazenado como texto hexadecimal ASCII nos dois lados: variável server-side da Vercel e Script Properties do Apps Script. Não fazer hex-decode em apenas um dos lados.
- O segredo deve ser gerado fora do repositório, por exemplo com `openssl rand -hex 32`.
- Vercel: `APPS_SCRIPT_HMAC_SECRET`, configurada somente em Preview para esta prova.
- Apps Script: Script Property `POC02_HMAC_SECRET`.
- Não reutilizar senha de conta, token Google, chave de API ou segredo de outro ambiente.

O Node.js fornece as primitivas criptográficas de HMAC, hash, aleatoriedade segura e comparação de bytes. O serviço Utilities do Apps Script fornece HMAC-SHA-256 e SHA-256 com charset explícito UTF-8. As duas implementações usarão o mesmo contrato binário/textual.

### 2.2. Campos assinados

A Vercel cria os seguintes campos para cada chamada ao Apps Script:

| Campo | Regra |
|---|---|
| `signatureVersion` | literal `v1` |
| `timestamp` | Unix epoch em milissegundos, decimal, 13 dígitos |
| `nonce` | 32 bytes de aleatoriedade criptográfica, em 64 caracteres hexadecimais |
| `action` | ação permitida pela allowlist |
| `requestId` | identificador já validado pelo gateway |
| `payload` | JSON serializado uma única vez pelo gateway |
| `signature` | HMAC-SHA-256 em hexadecimal minúsculo |

O navegador continua enviando somente `action`, `requestId` e `payload` à Vercel. Timestamp, nonce e assinatura são criados exclusivamente na Function.

### 2.3. Formato canônico

Antes de assinar, a Function calcula SHA-256 do texto exato de `payload` em UTF-8. O Apps Script calcula o mesmo hash sobre o valor decodificado recebido em `event.parameter.payload`.

A mensagem canônica é a concatenação UTF-8 das linhas abaixo, nesta ordem, sem espaços extras e sem newline final:

```text
CONECTA_LOCAL_GATEWAY
v1
POST
{timestamp}
{nonce}
{action}
{requestId}
{payloadSha256}
```

A assinatura é:

```text
hex(HMAC-SHA-256(secretUtf8, canonicalMessageUtf8))
```

O domínio `CONECTA_LOCAL_GATEWAY` e a versão `v1` evitam reutilização acidental da assinatura em outro protocolo. O método HTTP lógico, timestamp, nonce, ação, requestId e hash do payload ficam vinculados à mesma assinatura.

## 3. Validade temporal e proteção contra replay

### 3.1. Janela temporal

- Janela máxima: **300.000 ms (5 minutos)** de diferença absoluta entre o relógio do Apps Script e o timestamp assinado.
- Timestamp ausente, fora do formato, no futuro além da tolerância ou expirado: recusar antes de executar a ação.
- Os relógios da Vercel e do Google são presumidos sincronizados por infraestrutura; a margem de cinco minutos tolera pequenas diferenças sem permitir validade indefinida.

### 3.2. Nonce de uso único

Após validar o formato, a janela temporal e o HMAC, o Apps Script reserva o nonce antes de executar qualquer ação:

1. Adquire `LockService.getScriptLock()` com timeout limitado.
2. Abre `PropertiesService.getScriptProperties()`.
3. Remove registros de nonce cuja retenção já venceu.
4. Verifica se o nonce já existe.
5. Recusa nonce duplicado.
6. Registra o nonce com expiração de **630.000 ms (10 minutos e 30 segundos)** após o recebimento.
7. Libera o lock em bloco `finally`.
8. Somente depois da reserva bem-sucedida executa a ação permitida.

A retenção é maior que o maior período durante o qual uma requisição com timestamp no limite futuro ainda poderia permanecer dentro da janela aceita. A reserva é feita sob lock para que duas execuções concorrentes com o mesmo nonce não sejam aceitas simultaneamente.

### 3.3. Limites e comportamento seguro do armazenamento

- Limite inicial explícito: **2.500 nonces ativos** no projeto Apps Script isolado.
- Se o lock não puder ser adquirido, se o armazenamento falhar ou se o limite for atingido, a requisição será recusada. Nunca ignorar a verificação para continuar funcionando.
- Os registros expirados serão removidos durante novas reservas; não haverá limpeza por cache.
- Não usar `CacheService` como fonte de verdade contra replay: a documentação informa que o cache pode remover itens antes do prazo solicitado.
- O registro persistente ainda depende das cotas do Apps Script. A documentação atual lista 500 KB por armazenamento de propriedades e 9 KB por valor; o limite de 2.500 é conservador para esta demonstração, mas deverá ser medido no projeto isolado.
- Esta estratégia atende à prova de conceito e não é uma solução de alta escala. Para produção, uma store transacional/atômica apropriada e controles adicionais seriam necessários.

## 4. Verificação no Apps Script

A ordem de validação será:

1. Confirmar presença e formato dos campos obrigatórios.
2. Validar timestamp e nonce.
3. Confirmar a existência e o formato do segredo em Script Properties; se ausente, falhar fechado.
4. Validar limite de bytes do payload.
5. Calcular SHA-256 do payload original recebido.
6. Reconstruir exatamente a mensagem canônica.
7. Calcular HMAC-SHA-256 com UTF-8.
8. Comparar a assinatura recebida com o HMAC esperado, sem retornar qual parte falhou.
9. Reservar nonce de forma atômica.
10. Interpretar JSON, validar objeto e conferir allowlist.
11. Executar somente a ação de demonstração autorizada.

A comparação do HMAC fará uma comparação de comprimento fixo e acumulará diferenças em vez de encerrar no primeiro caractere divergente. O runtime Apps Script não oferece uma primitiva oficial equivalente a `crypto.timingSafeEqual`; portanto, a implementação reduz diferenças óbvias de comparação, mas não será descrita como garantia formal de tempo constante.

## 5. Contrato de erros

O Apps Script Content Service não é usado nesta POC para emitir status HTTP arbitrários. Em uma chamada direta ao Web App, a resposta pode continuar com HTTP 200 enquanto o JSON contém `ok: false` e um código lógico. Quando a Function recebe esse envelope, ela o converte para um status HTTP próprio:

| Código lógico do Apps Script | Código normalizado na Vercel | HTTP da Vercel |
|---|---|---:|
| `AUTHENTICATION_FAILED` | `UPSTREAM_AUTHENTICATION_FAILED` | 502 |
| `REQUEST_EXPIRED` | `UPSTREAM_TIMESTAMP_REJECTED` | 502 |
| `REPLAY_DETECTED` | `UPSTREAM_REPLAY_REJECTED` | 502 |
| `ACTION_NOT_ALLOWED` | `UPSTREAM_ACTION_REJECTED` | 502 |
| `NONCE_STORE_UNAVAILABLE` | `UPSTREAM_NONCE_STORE_UNAVAILABLE` | 503 |
| `AUTH_CONFIG_ERROR` | `UPSTREAM_AUTH_CONFIG_ERROR` | 503 |
| `INVALID_PAYLOAD` | `UPSTREAM_INVALID_PAYLOAD` | 502 |
| `POC_SIMULATED_ERROR` | `APPS_SCRIPT_REJECTED` | 422 |
| resposta incompatível | `UPSTREAM_INVALID_ENVELOPE` / `UPSTREAM_INVALID_JSON` | 502 |

O 502 indica que o gateway enviou uma chamada assinada, mas o Apps Script a recusou como comunicação upstream inválida; não é uma falha de autenticação do usuário final. A falta de `APPS_SCRIPT_HMAC_SECRET` na Vercel é detectada antes da chamada e gera HTTP 503. Os erros do Apps Script não revelarão assinatura esperada, segredo, hash, nonce armazenado ou detalhes internos. Nenhum segredo será registrado em logs ou devolvido ao navegador.

## 6. Testes de aceite

### Automatizados

- assinatura válida produz HMAC esperado;
- payload com Unicode produz o mesmo SHA-256 nos dois lados;
- alteração de payload sem recalcular assinatura falha;
- alteração de ação, requestId, timestamp ou nonce falha;
- assinatura ausente, malformada ou inválida é recusada;
- timestamp expirado e timestamp excessivamente futuro são recusados;
- segundo POST com o mesmo nonce é recusado;
- duas tentativas concorrentes com o mesmo nonce não conseguem reservar o mesmo identificador;
- store indisponível ou cheia falha fechada;
- falta de segredo na Vercel não chama o Apps Script;
- fluxo POC-01 continua seguindo redirect e mapeando os erros;
- segredo não aparece em logs, resposta, frontend ou bundle.

### Manuais no Preview e no Apps Script isolado

1. Configurar o mesmo segredo sintético nos dois ambientes.
2. Atualizar e implantar a versão protegida do Web App de teste.
3. Executar o eco assinado e confirmar HTTP 200.
#### Resultados manuais executados em 2026-11-11

O responsável pelo projeto executou os testes no Preview da branch `feat/poc-02-hmac-replay` e diretamente contra a URL `/exec` do Web App Apps Script isolado. Os resultados apresentados foram:

**Preview React → Vercel Function → Apps Script**

| Cenário | Resultado observado | Avaliação |
|---|---|---|
| Eco assinado | HTTP 200, `ok: true`, `authenticated: true` e redirect para `script.googleusercontent.com` | Aprovado |
| Erro lógico controlado | HTTP 422, `APPS_SCRIPT_REJECTED` | Aprovado |
| Resposta upstream não JSON | HTTP 502, `UPSTREAM_INVALID_JSON` | Aprovado |
| JSON inválido no navegador | HTTP 400, `INVALID_JSON`, sem chamada upstream | Aprovado |
| Método GET | HTTP 405, `METHOD_NOT_ALLOWED`, allowlist `POST` | Aprovado |

**Chamadas diretas ao Apps Script**

| Cenário | Resultado lógico observado | Avaliação |
|---|---|---|
| Chamada sem assinatura | `AUTHENTICATION_FAILED` | Aprovado |
| Timestamp expirado | `REQUEST_EXPIRED` | Aprovado |
| Primeira chamada assinada | `ok: true` | Aprovado |
| Repetição exata da chamada assinada | `REPLAY_DETECTED` | Aprovado |
| Payload alterado após a assinatura | `AUTHENTICATION_FAILED` | Aprovado |

O Apps Script Content Service respondeu HTTP 200 nesses testes diretos; a aprovação foi determinada pelo envelope JSON e pelos códigos lógicos, não pelo status HTTP.

**Replay concorrente**

Duas requisições idênticas, contendo o mesmo nonce e assinatura, foram enviadas em paralelo com `Promise.all`. Uma foi aceita (`ok: true`) e a outra foi recusada com `REPLAY_DETECTED`. Isso comprova o comportamento concorrente básico do bloqueio em um ensaio com duas chamadas; não é um teste de carga ou de estresse.

Os testes automatizados continuam complementares: o harness simula as APIs do Apps Script e não substitui os ensaios reais registrados acima. Também não foram realizados testes de carga, medição de cotas em escala ou revisão independente de produção.

## 7. Configuração segura dos ambientes

### Vercel

Configurar no projeto Conecta Local:

- `APPS_SCRIPT_WEB_APP_URL`: URL do Web App de teste.
- `APPS_SCRIPT_HMAC_SECRET`: segredo de teste de 64 caracteres hexadecimais.

Nesta POC, configurar **somente Preview** e limitar ao branch de trabalho. Não configurar Production.

### Apps Script

No projeto isolado que hospeda o Web App:

- Abrir Project Settings → Script Properties.
- Criar `POC02_HMAC_SECRET` com exatamente o mesmo texto da variável Vercel.
- Nunca colocar o valor no arquivo `.gs`, no Git, em logs ou na documentação.
- Atualizar a implantação do Web App para executar a versão que contém a verificação HMAC.

Os segredos devem ser informados diretamente nas interfaces de configuração. Não enviá-los pelo chat.

## 8. Limites de segurança da POC

HMAC autentica a posse do segredo compartilhado e protege a integridade dos campos assinados. Não autentica usuários finais, não define papéis, não substitui autorização, não protege contra comprometimento do segredo e não impede que terceiros invoquem anonimamente o endpoint e consumam alguma cota antes da rejeição. Também não torna Apps Script/Sheets adequados para alta escala.

A POC-02 não autoriza login, sessão, operações de dados, upload ou publicação de produção. POC-03 e POC-04 continuam obrigatórias antes de qualquer autenticação de usuário.

## 9. Referências oficiais

- Node.js Crypto: https://nodejs.org/download/release/v24.22.1/docs/api/crypto.html
- Apps Script Utilities: https://developers.google.com/apps-script/reference/utilities/utilities
- Apps Script Lock Service: https://developers.google.com/apps-script/reference/lock/lock-service
- Apps Script Properties Service: https://developers.google.com/apps-script/guides/properties
- Apps Script Quotas: https://developers.google.com/apps-script/guides/services/quotas
- Apps Script Cache: https://developers.google.com/apps-script/reference/cache/cache
