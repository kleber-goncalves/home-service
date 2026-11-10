# POC-01 — Comunicação React, Vercel Functions e Apps Script

> **Estado:** implementação inicial preparada na branch de trabalho. A comunicação real ainda depende da criação e implantação do projeto Apps Script isolado e da configuração da variável de ambiente na Vercel.

## 1. Objetivo

Comprovar o fluxo HTTP mínimo:

1. React envia uma requisição JSON para uma rota da mesma origem.
2. A Vercel Function valida o contrato e encaminha a chamada ao Apps Script.
3. O Apps Script responde pelo Content Service.
4. A Function acompanha o redirecionamento para script.googleusercontent.com.
5. A Function valida e normaliza a resposta para JSON/HTTP.
6. O React apresenta o resultado ou a falha.

Esta etapa não implementa login, cadastro, senha, sessão, autorização, planilha, Drive ou auditoria.

## 2. Arquivos criados

- api/backend.js — entrada HTTP server-side da Vercel.
- src/services/poc-01-api.js — chamada same-origin feita pelo React.
- src/pages/Poc01Page.jsx — interface temporária de execução dos cenários.
- apps-script/poc-01/Code.gs — endpoint Apps Script isolado para eco e erros controlados.
- tests/poc01/backend.test.js — testes automatizados do gateway usando respostas upstream simuladas.

A tela de teste pode ser aberta usando o parâmetro de consulta ?poc=01 na raiz da aplicação.

## 3. Contrato de transporte

### Navegador → Vercel

Método: POST  
Rota: /api/backend  
Content-Type: application/json

Exemplo:

~~~json
{
  "action": "poc.echo",
  "requestId": "request-12345678",
  "payload": {
    "message": "Mensagem sintética de teste."
  }
}
~~~

A Function aceita somente estas ações durante a POC:

| Ação | Finalidade | Resposta esperada |
|---|---|---|
| poc.echo | Retornar os dados recebidos | HTTP 200 |
| poc.simulate_error | Simular falha lógica do Apps Script | HTTP 422 |
| poc.invalid_response | Simular resposta que não é JSON | HTTP 502 |

Ações fora da allowlist são recusadas antes de chamar o Apps Script.

### Vercel → Apps Script

A Function envia POST com Content-Type application/x-www-form-urlencoded;charset=UTF-8 e os campos action, requestId e payload. O payload contém o JSON serializado.

A opção de redirecionamento é configurada explicitamente como follow. O sucesso da comunicação exige que a resposta tenha sido redirecionada para o host script.googleusercontent.com; a Function não devolve a URL temporária, apenas informa o host confirmado e a duração.

### Resposta da Function → React

O gateway devolve um envelope padronizado:

~~~json
{
  "ok": true,
  "requestId": "request-12345678",
  "data": {
    "received": true
  },
  "error": null,
  "transport": {
    "redirected": true,
    "redirectHost": "script.googleusercontent.com",
    "upstreamStatus": 200,
    "durationMs": 120
  }
}
~~~

Os valores são ilustrativos. A tela mostrará os valores efetivamente recebidos no teste.

## 4. Cenários e mapeamento de erros

| Situação | HTTP da Vercel | Código |
|---|---:|---|
| Método diferente de POST | 405 | METHOD_NOT_ALLOWED |
| Content-Type incompatível | 415 | UNSUPPORTED_MEDIA_TYPE |
| JSON do navegador inválido | 400 | INVALID_JSON |
| Ação não permitida | 400 | ACTION_NOT_ALLOWED |
| Integração sem URL | 503 | INTEGRATION_NOT_CONFIGURED |
| URL de integração inválida | 503 | INTEGRATION_CONFIG_INVALID |
| Timeout do Apps Script | 504 | UPSTREAM_TIMEOUT |
| Falha de rede no Apps Script | 502 | UPSTREAM_UNAVAILABLE |
| Redirecionamento não confirmado | 502 | UPSTREAM_REDIRECT_NOT_CONFIRMED |
| Resposta upstream não JSON | 502 | UPSTREAM_INVALID_JSON |
| Envelope upstream incompatível | 502 | UPSTREAM_INVALID_ENVELOPE |
| Falha lógica controlada no Apps Script | 422 | APPS_SCRIPT_REJECTED |

O Content Service normalmente entrega uma resposta HTTP própria por redirecionamento; o Apps Script não é usado nesta etapa para definir status HTTP arbitrários. Por isso, a Function interpreta o envelope lógico e devolve o status apropriado ao navegador.

## 5. Preparar o projeto Apps Script de teste

1. Crie um projeto Apps Script independente, sem vínculo com a planilha Conecta Local e sem arquivos do Drive.
2. Abra o arquivo Code.gs e substitua o conteúdo pelo arquivo versionado em apps-script/poc-01/Code.gs.
3. Salve o projeto.
4. Crie uma implantação do tipo Aplicativo da Web.
5. Para esta prova isolada, selecione execução como o responsável pela implantação e acesso de qualquer pessoa, caso a política da conta permita.
6. Implante e copie a URL terminada em /exec.

**Atenção:** o Web App ficará acessível anonimamente. O código de teste não usa Sheets, Drive, e-mail ou outras permissões privilegiadas; limita-se a ecoar conteúdo sintético e produzir falhas controladas. O próprio Apps Script repete a allowlist e limita o payload a 8 KiB, pois chamadas diretas podem ignorar as validações da Vercel. Ainda assim, terceiros podem chamar o endpoint e consumir a cota de execução do projeto. Não coloque dados pessoais, segredos ou operações reais nesse projeto e desative/remova a implantação pública quando a prova terminar.

A POC-01 ainda não valida a assinatura HMAC. Essa proteção pertence à POC-02. Não reutilize este endpoint público como backend operacional.

## 6. Configurar a Vercel

No projeto Vercel que hospeda o Conecta Local, crie a variável server-side:

~~~text
APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/ID_DA_IMPLANTACAO/exec
~~~

Configure-a inicialmente apenas para Preview. Não use o prefixo VITE_ e não inclua a URL no código React.

Para desenvolvimento local, crie o arquivo .env.local na raiz (não o versione) com o mesmo nome e valor. O padrão de .gitignore já ignora arquivos locais.

A URL de implantação é configuração de servidor. O frontend nunca deve importá-la nem chamar o domínio script.google.com.

## 7. Executar e testar

### Local

1. Garanta que o projeto Vercel esteja vinculado à pasta local, usando a Vercel CLI quando necessário.
2. Configure APPS_SCRIPT_WEB_APP_URL em .env.local.
3. Inicie a aplicação com a CLI da Vercel para servir também o diretório api:

~~~bash
npx vercel dev
~~~

4. Abra a URL local informada pela CLI com o parâmetro ?poc=01.
5. Execute os cinco cenários apresentados na página.

O comando npm run dev inicia apenas o Vite. Ele não deve ser usado para concluir a POC da Function.

### Preview

1. Configure a variável APPS_SCRIPT_WEB_APP_URL no ambiente Preview do projeto Vercel.
2. Gere um novo Preview da branch da POC.
3. Abra a URL de Preview com ?poc=01.
4. Execute os cenários e confirme que o teste de eco retorna HTTP 200 e transport.redirected igual a true.

### Testes automatizados

O repositório inclui testes com o runner nativo do Node.js:

~~~bash
npm run test:poc01
npm run lint
npm run build
~~~

Os testes automatizados usam um cliente upstream simulado. Eles validam o contrato, o corpo form-urlencoded, a opção redirect: follow e os mapeamentos de erro. **Eles não comprovam a rede real, a implantação Apps Script nem o redirecionamento real do Google.** Essa comprovação depende dos testes locais/Preview contra a URL /exec implantada.

## 8. Critérios de aceite da POC-01

- A interface React chama somente /api/backend.
- O navegador não faz requisições diretas ao Apps Script.
- A Function valida método, Content-Type, JSON, tamanho, requestId e allowlist de ações.
- A Function encaminha POST form-urlencoded ao Apps Script.
- O teste real confirma response.redirected e o host final script.googleusercontent.com.
- O eco devolve o mesmo requestId e os dados sintéticos enviados.
- O erro lógico do Apps Script chega ao navegador normalizado como HTTP 422.
- A resposta textual inválida chega ao navegador como HTTP 502.
- Timeout, indisponibilidade, URL ausente e respostas incompatíveis produzem erros JSON controlados.
- Nenhuma chamada grava dados no Sheets ou Drive.

A POC-01 só será considerada comprovada após um teste real em Preview ou ambiente local Vercel com o Web App implantado. Build e testes unitários, isoladamente, não são evidência de integração real.

## 9. Limitações que permanecem

- Sem HMAC, timestamp assinado ou proteção contra replay; isso será avaliado na POC-02.
- Sem autenticação de usuário, sessão ou cookie.
- Sem acesso ao Google Sheets ou Google Drive.
- Sem rate limit persistente ou proteção de produção.
- Sem garantia de disponibilidade, latência ou escala comercial.
