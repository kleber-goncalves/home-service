# Arquitetura da integração Vercel Functions + Google Apps Script — Conecta Local

> **Versão:** 0.1  
> **Data:** 2026-11-10  
> **Status:** implementação inicial da POC-01 na branch feat/poc-01-vercel-apps-script; a comunicação real ainda depende da implantação isolada do Apps Script e da configuração da variável de ambiente na Vercel.  
> **Escopo:** integração React/Vite, Google Apps Script, Google Sheets e Google Drive para a demonstração acadêmica.  
> **Premissa:** manter Apps Script como backend inicial e autenticação própria por e-mail e senha, conforme decisão funcional aprovada. Transporte, sessão e armazenamento seguro de senhas continuam pendentes de prova de conceito.

## 1. Objetivo e estado real

Este documento registra a arquitetura aprovada para a comunicação do Conecta Local e os testes necessários antes da implementação. Ele não declara que qualquer API ou integração já exista.

Estado conhecido na data desta revisão:

- Frontend demonstrativo em React, JavaScript/JSX e Vite, publicado na Vercel.
- Projeto configurado como módulo JavaScript ES (package.json usa type module).
- A branch dev ainda não possui diretório api/; a branch feat/poc-01-vercel-apps-script contém a primeira Function e a página de teste. A descoberta/publicação efetiva deverá ser comprovada pelo Preview Vercel.
- Arquivo Google Sheets estrutural criado e conferido pelo responsável, com 12 abas e 102 cabeçalhos.
- A planilha ainda não é armazenamento operacional integrado.
- A branch de trabalho contém a Function da POC-01 e o código do Web App de teste, mas ainda não há URL Apps Script configurada nem comunicação real concluída.
- Não há autenticação, sessão, integração operacional com Sheets/Drive, upload ou painel administrativo implementados.

O projeto continua sendo uma demonstração acadêmica com dados sintéticos. Não inserir credenciais, cadastros ou dados pessoais reais.

## 2. Decisões arquiteturais aprovadas

1. O frontend permanece em React/Vite.
2. Google Apps Script continua sendo o único backend de negócio do MVP: é a autoridade para autenticação, autorização, regras, transições de estado, integridade e operações de dados.
3. Vercel Functions será utilizada como **gateway HTTP server-side** entre o navegador e o Web App do Apps Script.
4. A Function é um componente técnico de borda/transporte, não uma segunda camada de domínio. Ela não será responsável por regras de negócio, não acessará Sheets/Drive diretamente e não será fonte de verdade para usuários, sessões, papéis ou permissões.
5. Google Sheets continua armazenando os registros nas 12 abas aprovadas. Google Drive continua armazenando imagens.
6. O navegador chamará somente rotas de mesma origem da aplicação, como /api/backend. Não chamará o Web App Apps Script diretamente.
7. A Vercel Function chamará o Apps Script server-to-server, acompanhará os redirecionamentos do Content Service e converterá a resposta lógica em JSON/HTTP para o frontend.
8. Toda regra crítica e toda autorização continuarão sendo verificadas no Apps Script. A Function não poderá ser a única barreira contra chamadas diretas ao Web App.
9. URLs e segredos da integração serão configurados como variáveis server-side da Vercel e propriedades privadas do Apps Script. Nunca usar prefixo VITE_ para segredos.
10. Não adicionar Firebase, Supabase, Express, banco adicional ou provedor de autenticação sem reabrir formalmente a decisão.
11. A demonstração não será apresentada como serviço pronto para produção ou escala comercial.

**Precisão importante:** tecnicamente haverá código server-side na Vercel, mas restrito a gateway HTTP. O backend que detém as regras de domínio e os dados continua sendo o Apps Script.

## 3. Visão geral da arquitetura

Navegador do visitante/profissional  
↓ mesma origem: POST /api/backend  
Frontend React + Vite — hospedagem Vercel  
↓  
Vercel Function — gateway HTTP server-side  
- valida método, formato, tamanho e contrato de entrada;
- aplica controles de borda e timeout;
- autentica a chamada servidor-servidor;
- encaminha a ação e o payload;
- acompanha o redirecionamento do Apps Script;
- normaliza a resposta para JSON/HTTP.
↓ POST server-to-server, application/x-www-form-urlencoded  
Google Apps Script — backend de negócio  
- valida a assinatura do gateway;
- valida dados e regras de negócio;
- verifica sessão, papel, propriedade e autorização;
- coordena Sheets, Drive, LockService e auditoria.
↙　　　　　　　　　　　　↘  
Google Sheets　　　　　　　 Google Drive  
12 abas　　　　　　　　　　 arquivos de imagem  
↓  
Auditoria no Google Sheets

A comunicação browser → Vercel Function é de mesma origem; por isso o navegador não precisa fazer uma chamada cross-origin ao Apps Script. A comunicação Vercel Function → Apps Script ocorre entre servidores e precisa seguir os redirecionamentos documentados do Content Service.

O fluxo de confiança é: React envia uma ação permitida; a Function valida o envelope e encaminha a solicitação autenticada; Apps Script verifica a origem lógica da chamada, a sessão do usuário quando aplicável e todas as permissões; somente então acessa Sheets ou Drive. A Function não decide se um profissional pode editar determinado serviço.

## 4. Limite de confiança e implantação do Web App

### 4.1. Identidade de execução

O Apps Script Web App pode executar como o usuário que implantou o aplicativo (USER_DEPLOYING) ou como o usuário que está acessando (USER_ACCESSING). O manifesto também define quem pode acessar o Web App.

Para uma interface pública hospedada na Vercel, visitantes sem login Google precisam conseguir alcançar as rotas públicas. A configuração ANYONE_ANONYMOUS é uma candidata para essa necessidade; ANYONE exige que a pessoa esteja conectada a uma conta Google.

**Candidata para a prova de conceito, não autorização para publicar:** Web App executando como o responsável pela implantação (USER_DEPLOYING) e acessível anonimamente (ANYONE_ANONYMOUS), limitado a uma planilha e pasta do Drive de teste, ambas com dados sintéticos.

Quando executa como quem publicou, o script atua com a autoridade dessa pessoa, independentemente de quem chamou o endpoint. Isso significa que um endpoint público pode acionar operações privilegiadas. A interface, a URL difícil de adivinhar e o login do frontend não protegem a planilha. Toda operação deve validar no servidor o tipo de ação, a sessão, o papel, a propriedade e o estado dos registros.

### 4.2. Isolamento obrigatório para testes

- Usar projeto Apps Script e recursos de teste separados dos recursos pessoais ou de qualquer operação real.
- Conectar somente a planilha sintética do Conecta Local.
- Usar uma pasta raiz de teste privada no Drive.
- Não conceder acesso de editor do projeto Apps Script a quem não deva poder alterar código executado com a identidade do implantador.
- Não publicar uma implantação anônima até que a superfície de API e os testes de autorização estejam revisados.
- Não transmitir ScriptApp.getOAuthToken() ou credenciais Google ao navegador.
- Manter configurações e segredos fora do bundle Vite e do repositório.

O modo de execução e o nível de acesso efetivamente utilizados deverão ser registrados na documentação de implantação depois do teste.


### 4.3. Autenticação da chamada Vercel → Apps Script

O Web App poderá precisar aceitar acesso anônimo para que visitantes sem conta Google alcancem as operações públicas. Se executar como o implantador, cada chamada usa a autoridade desse responsável. A URL do Web App não é segredo suficiente.

Portanto, a proposta exige autenticação própria da comunicação entre a Function e o Apps Script:

- A Function assina cada chamada no servidor com um segredo compartilhado, nunca enviado ao navegador.
- O Apps Script valida a assinatura antes de executar qualquer ação.
- A assinatura deverá vincular pelo menos o método lógico/ação, timestamp, requestId e conteúdo encaminhado.
- A POC deverá testar validade temporal, comparação segura, tentativa de chamada direta sem assinatura e proteção contra replay.
- Um segredo fixo enviado como parâmetro sem assinatura, timestamp ou controle de replay não será considerado solução final.
- A chave fica em variável de ambiente server-side da Vercel e em Script Properties do projeto Apps Script. Não deve aparecer no repositório, no frontend, em logs ou em respostas.

HMAC-SHA-256 é uma possibilidade técnica a avaliar usando primitivas nativas do Node.js na Function e Utilities do Apps Script. O formato canônico, codificação, comparação e proteção contra replay ainda não estão aprovados; serão definidos e testados na POC-02.

### 4.4. Sessão do usuário e cookie do navegador

A Vercel Function pode emitir uma resposta HTTP própria para o navegador, separada do TextOutput produzido pelo Apps Script. Isso permite testar um cookie de sessão HttpOnly no domínio da aplicação Vercel sem exigir que o Apps Script configure Set-Cookie.

Modelo candidato, ainda não aprovado:

1. O login chega à rota da Vercel.
2. A Function encaminha a operação autenticada ao Apps Script.
3. O Apps Script cria/registra a sessão e devolve a informação necessária somente à Function.
4. A Function define o cookie com atributos seguros, por exemplo HttpOnly, Secure, SameSite apropriado e Path restrito.
5. Nas próximas requisições, o navegador envia o cookie automaticamente à mesma origem; a Function repassa o token ao Apps Script por canal server-to-server.
6. Apps Script continua sendo a autoridade que consulta SESSOES, verifica o hash do token, expiração, revogação, estado da conta e permissões.

A POC de sessão deverá avaliar CSRF, validação de Origin, SameSite, escopo do cookie em Preview/produção, logout, revogação, expiração e ausência do token em JavaScript, URL e logs. Não considerar cookie implementado só porque a Function consegue emitir Set-Cookie.
## 5. Comunicação React/Vite ↔ Vercel Function ↔ Apps Script

### 5.1. Navegador → Vercel Function

O React deverá utilizar uma rota relativa de mesma origem, inicialmente uma entrada como POST /api/backend.

O contrato público da rota deverá:

- aceitar somente métodos explicitamente previstos;
- limitar o tamanho do corpo antes de processar JSON;
- validar estrutura, tipos e formato dos campos;
- aceitar somente ações registradas em uma allowlist;
- nunca permitir que o cliente escolha nome de aba, intervalo A1, função interna ou operação arbitrária;
- usar Zod ou validação equivalente na Function para rejeitar envelopes inválidos;
- devolver JSON com cabeçalhos de não cache e mensagens seguras;
- aplicar timeout e tratamento de falhas;
- não expor URL do Web App, segredo compartilhado, credenciais Google ou detalhes internos.

A validação feita na Vercel é uma primeira barreira e melhora a experiência, mas não substitui a validação de negócio no Apps Script.

Como navegador e API estarão na mesma origem de cada implantação Vercel, o frontend não precisará de CORS para chamar /api/backend. A origem do Preview será a própria origem do Preview. Isso não protege o endpoint contra clientes HTTP externos: Origin ausente ou falsificado não é autenticação.

### 5.2. Vercel Function → Google Apps Script

A Function faz uma chamada server-to-server ao URL armazenado em variável de ambiente, usando POST.

Formato inicial recomendado para a POC:

- Content-Type: application/x-www-form-urlencoded;charset=UTF-8.
- Parâmetros: action, requestId, timestamp, signature e payload.
- payload: JSON serializado com os campos da operação.
- redirect: follow, pois o Content Service redireciona a resposta.
- AbortController: interromper a chamada antes de exceder o limite de execução definido para a Function.
- Resposta: ler o conteúdo, validar o envelope lógico e converter a falha/sucesso para a resposta HTTP da rota Vercel.

O formato exato da assinatura e do payload será definido na POC. Não enviar segredos de sessão ou senha em query string.

### 5.3. Content Service, redirecionamento e CORS

O Content Service redireciona a resposta para uma URL temporária em script.googleusercontent.com. O cliente server-side deve acompanhar o redirecionamento. A Vercel Function será esse cliente; o navegador não acessará o Apps Script diretamente.

A classe TextOutput documenta métodos para conteúdo e MIME type, mas não um método para configurar cabeçalhos HTTP arbitrários, como Set-Cookie ou Access-Control-Allow-Origin. Assim:

- Apps Script não será responsável por configurar cookies do navegador.
- A Function devolverá sua própria resposta JSON ao React.
- A Function poderá emitir Set-Cookie quando a estratégia de sessão for aprovada.
- A Function mapeará códigos lógicos de erro recebidos do Apps Script para status HTTP adequados.
- O comportamento de redirects, resposta vazia, HTML inesperado, JSON inválido e timeout será coberto pela POC.

O fato de a Function seguir redirecionamentos não elimina a necessidade de validar o envelope recebido. Não tratar qualquer HTTP 200 do Apps Script como sucesso de negócio.

### 5.4. Contrato lógico de mensagem

Formato ilustrativo de requisição do navegador para a Vercel:

    {
      "action": "catalog.search",
      "requestId": "identificador-da-requisicao",
      "payload": {
        "term": "eletricista",
        "cityId": "uuid-da-cidade"
      }
    }

Envelope de resposta da Function para o navegador:

    {
      "ok": true,
      "requestId": "identificador-da-requisicao",
      "data": {},
      "error": null
    }

Em falhas:

    {
      "ok": false,
      "requestId": "identificador-da-requisicao",
      "data": null,
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Confira os dados enviados."
      }
    }

Os exemplos são contratos lógicos, não código implementado. A Function converterá erros de validação, autenticação, autorização, conflito, limite, falha upstream e timeout em status HTTP coerentes. O Apps Script continuará retornando um envelope lógico no corpo, pois TextOutput não oferece configuração documentada de status HTTP arbitrário.

Nunca retornar stack trace, dados privados, hash de senha, salt, código, token, assinatura ou chave.

### 5.5. Proteções e limitações do gateway

A Function poderá aplicar:

- allowlist de métodos e ações;
- limite de bytes e validação de estrutura;
- verificação de Origin para reduzir chamadas cross-origin de navegador;
- rate limit de melhor esforço na borda;
- timeout, requestId e logs sanitizados;
- normalização de respostas do Apps Script.

Limitações e regras:

- Origin não autentica chamadas server-to-server nem clientes HTTP arbitrários.
- Rate limit em memória (Map) é best-effort em ambiente serverless; instâncias podem escalar, reiniciar ou não compartilhar estado.
- Não usar Map da Function como controle definitivo de tentativas de login, consumo de códigos ou bloqueio de conta.
- Os controles de autenticação, autorização e abuso que afetam a integridade da conta devem ser aplicados no Apps Script e testados sob concorrência.
- A chamada direta ao Web App deverá falhar sem a assinatura válida do gateway; a Function não pode ser a única barreira.

### 5.6. Organização inicial da Function no repositório

A POC deverá avaliar uma Function mínima na raiz do repositório, no diretório api/, com uma rota inicial como /api/backend.

A documentação atual da Vercel descreve arquivos nesse diretório como Vercel Functions executadas no runtime Node.js. O projeto já utiliza JavaScript ES Modules (type: module), mas ainda não possui api/ nem vercel.json. A convenção de exportação e a descoberta da Function no projeto Vite atual deverão ser comprovadas com um Preview antes de qualquer implementação funcional.

Diretrizes para o primeiro protótipo:

- uma única Function de entrada, com POST e allowlist explícita de ações;
- sem Express, Next.js, banco, fila ou dependência externa;
- sem leitura/escrita direta em Google Sheets ou Drive;
- configuração e segredo somente em variáveis server-side;
- resposta JSON padronizada;
- timeout e limite de corpo;
- código pequeno e separado de componentes React.

A execução local com Vite não deve ser confundida com a execução de Vercel Functions. A POC precisa documentar como testar a Function localmente ou em Preview usando a ferramenta oficial da Vercel, sem presumir que npm run dev sozinho execute a pasta api/.

### 5.7. POC-01 — transporte básico sem autenticação

A implementação inicial está isolada na branch feat/poc-01-vercel-apps-script:

- `api/backend.js` recebe POST same-origin, valida método, Content-Type, limite do corpo, JSON, requestId, payload e allowlist de três ações de teste.
- `src/services/poc-01-api.js` envia somente para `/api/backend`; `src/pages/Poc01Page.jsx` disponibiliza cenários temporários em `?poc=01`.
- `apps-script/poc-01/Code.gs` é um Web App independente, sem acesso a Sheets, Drive ou outros recursos; faz eco de payload sintético, devolve um erro lógico controlado e pode retornar texto intencionalmente inválido.
- A Function envia `application/x-www-form-urlencoded`, configura `redirect: follow`, aplica timeout e exige que a resposta final confirme o host `script.googleusercontent.com`.
- A Function normaliza sucesso e falhas para JSON/HTTP, sem devolver a URL temporária do Content Service.
- `tests/poc01/backend.test.js` valida o comportamento do gateway com respostas upstream simuladas; isso não comprova a comunicação real com o Google.

**Limite deliberado:** a POC-01 ainda não implementa HMAC, timestamp assinado ou proteção contra replay. Como o Web App isolado será acessível anonimamente, ele não pode conter operações privilegiadas e não deverá acessar planilha, Drive, e-mail ou dados reais. A assinatura server-to-server pertence à POC-02.

**Pendência para aceite:** o responsável deverá criar e implantar o projeto Apps Script de teste, configurar `APPS_SCRIPT_WEB_APP_URL` no ambiente Preview da Vercel e executar o cenário de eco. A POC só será considerada comprovada quando a resposta real confirmar o redirecionamento para `script.googleusercontent.com` e devolver o requestId/payload esperados. Testes unitários e build não bastam.

Procedimento, cenários e critérios de aceite: [POC-01 — Comunicação React, Vercel Functions e Apps Script](./POC_01_COMUNICACAO.md).
## 6. Organização proposta do projeto Apps Script

O código deverá ficar versionado no repositório, separado do frontend, em uma pasta futura apps-script/. A ferramenta e o fluxo de publicação (editor Apps Script ou clasp) serão definidos antes da primeira implementação e documentados; credenciais de desenvolvedor e tokens de publicação nunca serão commitados.

Divisão inicial sugerida, sem abstrações desnecessárias:

| Arquivo futuro | Responsabilidade |
|---|---|
| Entrypoints.gs | doGet e doPost; sem regras de negócio complexas |
| ApiRouter.gs | interpretar a ação permitida e encaminhar ao serviço correto |
| Config.gs | ler configuração privada e validar dependências |
| Response.gs | padronizar envelopes e erros seguros |
| Validation.gs | validar e normalizar entradas no backend |
| SheetsRepository.gs | leitura/gravação controlada nas abas |
| DriveRepository.gs | upload e gerenciamento de arquivos |
| AuthService.gs | cadastro, login, códigos e sessões; bloqueado até PoCs |
| Authorization.gs | papel, propriedade, sessão e permissões |
| AuditService.gs | registrar eventos e resultados sem segredos |

Os arquivos .gs compartilham o contexto global do projeto. Nomes de funções e constantes deverão ser claros e consistentes. Não introduzir classes, camadas ou bibliotecas somente por padrão arquitetural.

## 7. Responsabilidades dos componentes

### 7.1. Frontend React/Vite

- Exibir telas, formulários, feedback e navegação.
- Fazer validação de experiência do usuário, sem substituir validação no servidor.
- Enviar somente campos necessários para a ação, por rota de mesma origem da Vercel.
- Nunca armazenar chaves Google, segredos HMAC, hashes de senha, salts ou credenciais.
- Não confiar em role, userId, ownerId, preço, status ou autorização recebidos do cliente.
- Não considerar a sessão válida apenas porque existe estado local no React.
- Não afirmar sucesso antes da confirmação da Function.

### 7.2. Vercel Function — gateway HTTP

- Receber chamadas HTTP do frontend pela mesma origem.
- Validar método, tamanho, estrutura e allowlist de ações.
- Executar validações iniciais de payload e controles de borda.
- Assinar requisições servidor-servidor com o mecanismo aprovado.
- Encaminhar somente os campos necessários ao Apps Script.
- Acompanhar redirecionamentos, impor timeout e validar resposta.
- Normalizar respostas e códigos de erro para JSON/HTTP.
- Emitir e limpar cookie do navegador caso a estratégia de sessão seja aprovada.
- Não implementar regras de negócio, consultas diretas ao Sheets/Drive, decisão de papel ou autorização final.
- Não guardar usuários, senhas, sessões ou dados de domínio em memória ou armazenamento próprio.

**A Function não é a autoridade final:** payloads manipulados ou chamadas diretas ao Apps Script devem ser recusados pelo backend de negócio.

### 7.3. Google Apps Script

- Receber requisições da Function e validar a assinatura servidor-servidor.
- Controlar a lista de ações permitidas.
- Verificar autenticação e autorização em todas as rotas protegidas.
- Aplicar regras, integridade, transições de estado e limites.
- Coordenar Sheets, Drive, lock e auditoria.
- Sanitizar mensagens e logs.
- Tratar falhas parciais e confirmar operação somente quando concluída.

### 7.4. Google Sheets

- Continuar como armazenamento simplificado da demonstração.
- Conservar as 12 abas e os 102 cabeçalhos aprovados.
- Usar UUID como identificador; número da linha não é chave de negócio.
- Ler apenas intervalos necessários, evitando transferir a planilha inteira em toda requisição.
- Transformar linhas em objetos por cabeçalho, sem depender da ordem de inserção dos registros.
- Não retornar abas internas ou campos privados em consultas públicas.
- Usar RAW nas gravações pela Sheets API para evitar que conteúdo textual seja interpretado como fórmula.
- Não permitir escrita pelo frontend nem distribuir credenciais de edição.

### 7.5. Google Drive

- Manter a pasta raiz privada.
- Guardar metadados e relacionamentos na aba IMAGENS.
- Validar no backend limite de 5.000.000 bytes, tipo permitido e conteúdo efetivo do arquivo; não confiar só na extensão ou no MIME informado pelo navegador.
- Respeitar o limite de uma imagem ativa por perfil e cinco por serviço.
- Aplicar permissão pública por link somente quando a imagem for elegível e a conta/serviço permitirem exposição.
- Restringir o arquivo quando deixar de ser elegível, confirmar a mudança e registrar falhas.
- Considerar que revogar acesso não apaga cópias previamente baixadas ou capturadas.

## 8. Configuração e segredos

A proposta é utilizar PropertiesService.getScriptProperties() para configurações comuns do Apps Script, como:

- SPREADSHEET_ID;
- DRIVE_ROOT_FOLDER_ID;
- segredo HMAC necessário à verificação das chamadas assinadas pela Vercel;
- segredos HMAC necessários às operações de códigos e identificadores;
- versão/configuração do ambiente, se necessário.

Na Vercel, variáveis server-side candidatas:

- APPS_SCRIPT_WEB_APP_URL;
- APPS_SCRIPT_GATEWAY_SECRET;
- configurações de ambiente estritamente necessárias.

As variáveis Vercel deverão ser configuradas por ambiente (Development, Preview e Production) conforme a necessidade. Não utilizar prefixo VITE_ em qualquer segredo. Não incluir valores no repositório ou em logs.

Regras:

- Nunca colocar esses valores no React, em variáveis VITE_*, no GitHub ou em logs.
- Não confundir Script Properties com cofre de segredos dedicado.
- Pessoas com acesso de edição ao projeto Apps Script são privilegiadas: podem alterar código e afetar operações executadas com a identidade do implantador. Controlar rigorosamente esses acessos.
- Não armazenar senhas de usuários em Properties Service; os registros de conta pertencem à aba USUARIOS.
- Não usar Properties Service como banco de registros ou cache de sessões.
- Não guardar chaves privadas ou tokens em arquivos do projeto.

A configuração real será inserida manualmente no projeto de teste durante a implantação. Valores não serão copiados para a documentação.

## 9. Consistência, concorrência e auditoria

### 9.1. LockService

Operações críticas de leitura → validação → gravação devem obter LockService.getScriptLock() antes da seção protegida e liberar o lock em finally.

O lock:

- serializa trechos concorrentes executados pelo mesmo projeto Apps Script;
- não substitui validações nem atomicidade de gravação;
- não bloqueia edições manuais feitas diretamente por editores na planilha;
- não coordena automaticamente outro projeto Apps Script que acesse a mesma planilha.

A duração do trecho protegido deve ser curta. Não manter lock durante upload de arquivo ou outras operações demoradas do Drive sem justificativa. Testar timeout e resposta de concorrência.

### 9.2. Gravação de dados e auditoria

Para alterações de negócio que exigem evento de auditoria, a atualização de dados e a inclusão do evento deverão ser enviadas em uma única chamada spreadsheets.batchUpdate da Google Sheets API para o mesmo arquivo, mantendo a atomicidade do lote.

Isso exige habilitar e testar o serviço avançado da Google Sheets API no projeto Apps Script. Não substituir o lote por duas chamadas independentes de escrita e afirmar que são atômicas. SpreadsheetApp.flush() e LockService não transformam múltiplas gravações separadas em uma transação.

A aba AUDITORIA será append-only pela aplicação. Isso não a torna inviolável contra editores que tenham acesso direto ao arquivo.

### 9.3. Operações no Drive

Sheets e Drive não compartilham transação distribuída. Uma operação que atualize dados e permissões de arquivos terá etapas separadas:

1. validar a ação e o estado;
2. executar a alteração de dados e auditoria aplicável no Sheets;
3. solicitar a alteração de permissão no Drive;
4. consultar/confirmar a permissão efetiva;
5. registrar falha e reconciliar o estado quando necessário.

Não apresentar sucesso integral quando a atualização de permissões falhar. Os procedimentos devem ser idempotentes e testados com falhas parciais.

## 10. Autenticação e segurança — bloqueios de implementação

### 10.1. Senhas

A aba USUARIOS já prevê senha_hash, senha_salt e senha_algoritmo, mas isso não significa que o mecanismo criptográfico esteja escolhido.

A referência oficial do Apps Script Utilities documenta digest e HMAC; essas operações, isoladamente, não são KDFs adequados para armazenamento de senhas. A OWASP recomenda funções de derivação lentas e apropriadas, priorizando Argon2id; PBKDF2-HMAC-SHA-256 é uma alternativa em cenários específicos, com parâmetros adequados.

**Bloqueio:** não implementar armazenamento de senha com SHA-256 simples, HMAC simples ou criptografia própria. Antes de aprovar um algoritmo, testar quais primitivas estão realmente disponíveis no runtime V8 do Apps Script, verificar uma implementação mantida e revisada, medir o desempenho e validar parâmetros, salt individual e comparação. Se não houver implementação adequada e viável dentro dos limites da plataforma, interromper a autenticação própria e reabrir a decisão com o responsável.

### 10.2. Sessões

A modelagem prevê apenas o hash do token na aba SESSOES, 30 minutos de inatividade e duração absoluta de 8 horas. O token em claro não deve ser gravado na planilha nem em logs.

Ainda não está decidido:

- como gerar token com aleatoriedade criptograficamente segura;
- como a Vercel Function emitirá, receberá, apagará e encaminhará o token;
- quais atributos de cookie e controles CSRF serão utilizados;
- como Apps Script validará o hash do token, expiração e revogação;
- como o fluxo funcionará em domínio de Preview e produção.

**Caminho candidato:** a Vercel Function emitir um cookie HttpOnly, Secure e SameSite adequado no domínio da aplicação. Em chamadas posteriores, a Function lê o cookie no servidor e encaminha o token ao Apps Script, que continua sendo a autoridade da sessão e valida o hash armazenado na aba SESSOES.

Não escolher os atributos finais nem considerar o cookie seguro sem testar CSRF, validação de Origin, expiração por inatividade e absoluta, logout, revogação, XSS, Preview e produção. Não expor o token à aplicação React, à URL ou aos logs.

A limitação de TextOutput continua relevante para respostas diretas do Apps Script, mas o cookie seria emitido pela Function, não pelo Apps Script.

Para token realmente aleatório e de alta entropia, o hash de validação armazenado no Sheets pode ser rápido; isso é diferente de hash de senha, que exige KDF lento.

### 10.3. Códigos e bloqueio de tentativas

- Códigos de verificação: seis dígitos, HMAC com segredo privado, validade de 10 minutos, até cinco tentativas, uso único e intervalo mínimo de 60 segundos.
- Senhas e códigos nunca entram em logs.
- O segredo HMAC não fica na planilha nem no frontend.
- Contadores e consumo de código são atualizados no backend sob controle de concorrência.
- Testar se a regra de cinco falhas em 15 minutos permite que terceiros bloqueiem contas de forma abusiva.
- Respostas de login e recuperação devem ser genéricas para evitar enumeração de e-mails.

### 10.4. Autorização

Em toda operação protegida:

1. obter a sessão pelo mecanismo que for aprovado;
2. localizar a conta no backend;
3. validar estado active e expiração/revogação da sessão;
4. obter papel do registro confiável, nunca do payload;
5. verificar propriedade do recurso ou permissão administrativa;
6. validar novamente os campos e as transições;
7. executar a operação e auditar o resultado.

Testar acesso cruzado entre profissionais, elevação de papel, alteração de proprietário e manipulação de status.

## 11. Catálogo inicial de operações da API

A lista abaixo é um agrupamento lógico, não um conjunto de endpoints já implementados.

| Grupo | Operações previstas | Camada de entrada | Autoridade final |
|---|---|---|---|
| Saúde | verificação mínima de disponibilidade | Vercel Function | Function e disponibilidade do Apps Script |
| Catálogo público | pesquisar, filtrar e consultar serviço/perfil elegível | Vercel Function | Apps Script |
| Conta | cadastro, confirmação, login, logout, recuperação e alteração de senha/e-mail | Vercel Function | Apps Script |
| Profissional | consultar/alterar próprio perfil e próprios serviços | Vercel Function | Apps Script |
| Imagens | upload, remoção e consulta de estado dos próprios arquivos | Vercel Function | Apps Script + Drive |
| Administração | gerir contas, categorias, cidades, serviços e denúncias; consultar auditoria | Vercel Function | Apps Script |

O gateway encaminha somente ações explicitamente permitidas. Não criar método genérico que receba nome de aba, intervalo A1 ou nome de função a executar diretamente do navegador. A autorização será refeita no Apps Script em toda operação protegida.

## 12. Erros, observabilidade e proteção de informações

- Cada requisição terá requestId não secreto para correlação entre React, Vercel Function e Apps Script.
- O log registra operação, resultado, duração e identificador de correlação, com dados minimizados.
- Não registrar senha, hash/salt de senha, código, token, hash de token, segredo HMAC, conteúdo integral de upload ou dados pessoais desnecessários.
- Erros internos serão registrados de forma sanitizada; o cliente recebe mensagem genérica e código lógico estável.
- Limites de entrada, tamanho de texto, quantidade de itens e tamanho de upload devem ser verificados no backend.
- Não expor mensagens de exceção, stack trace, nomes de abas privadas ou detalhes da infraestrutura ao visitante.
- Falhas de quota, lock, Sheets ou Drive devem resultar em erro controlado; não retornar sucesso antes da confirmação da operação.
- Evitar registrar conteúdo enviado em query string e não usar query string para segredos.

## 13. Quotas, desempenho e limites do modelo

Google Apps Script possui cotas e limites de execução que variam conforme tipo de conta e podem mudar. O MVP deve reduzir chamadas desnecessárias e trabalhar com poucos dados sintéticos, sem alegar escalabilidade de produção.

Diretrizes:

- agrupar leituras por aba/intervalo e evitar chamadas célula a célula;
- não ler todas as linhas e colunas em cada consulta pública;
- limitar paginação, tamanho de payload e uploads;
- medir tempo de execução de operações de autenticação e de leitura/gravação;
- tratar limites e exceções de quota;
- usar cache somente para dados públicos não sensíveis e nunca como fonte de verdade de autorização ou sessão;
- reavaliar o desenho se volume de requisições ou registros ultrapassar a finalidade acadêmica.

## 14. Provas de conceito obrigatórias e critérios de aceite

Nenhuma implementação de autenticação, publicação anônima ou escrita operacional será liberada apenas porque a arquitetura parece viável. As PoCs devem ser isoladas, usar dados sintéticos e registrar evidências reproduzíveis.

| ID | Prova de conceito | Critério mínimo para avançar |
|---|---|---|
| POC-01 | React → Vercel Function → Apps Script | a chamada same-origin funciona; a Function chama o Web App com POST form-urlencoded, segue redirect, valida a resposta, mapeia sucesso/erro e trata timeout; nenhum acesso direto do navegador ao Apps Script |
| POC-02 | Autenticidade Vercel → Apps Script | chamadas assinadas são aceitas; chamadas diretas sem assinatura, assinatura inválida, timestamp expirado e replay são recusados; segredo não aparece no cliente ou logs |
| POC-03 | KDF e aleatoriedade | algoritmo apropriado, implementação mantida/revisada, salt por senha, parâmetros versionados, geração segura de token e desempenho medido |
| POC-04 | Sessão com cookie via gateway | cookie HttpOnly/Secure/SameSite testado; CSRF e Origin avaliados; token não aparece em JavaScript/URL/logs; expiração por inatividade e absoluta, logout e revogação comprovados |
| POC-05 | Concorrência e auditoria | chamadas simultâneas não duplicam unicidade/contadores; LockService e spreadsheets.batchUpdate demonstram o comportamento esperado |
| POC-06 | Permissões do Drive | arquivos privados por padrão; mudança público/privado confirmada; falhas parciais detectadas e reconciliáveis |
| POC-07 | Integração de arquivos | validação de tamanho e conteúdo; upload de até 5.000.000 bytes testado sem exceder limites práticos de execução/memória |
| POC-08 | Implantação e abuso | configuração de acesso/identidade documentada; variáveis separadas por ambiente; endpoints protegidos contra manipulação de papel/proprietário e bypass do gateway |
| POC-09 | Quotas e desempenho | tempos, limites, timeout e falhas medidos para Vercel Functions, Apps Script e conjunto de dados sintético |

**Critério de interrupção:** se qualquer requisito crítico de assinatura, senha, sessão, transporte ou autorização não puder ser atendido sem improviso inseguro, interromper a implementação correspondente e reabrir a decisão arquitetural com o responsável.

## 15. Ordem de trabalho proposta

1. Revisar e aprovar esta arquitetura de gateway.
2. **POC-01 — comunicação:** criar uma Function mínima de teste e comprovar React/Vercel → Function → Apps Script, incluindo redirect, resposta JSON, timeout e erros.
3. **POC-02 — assinatura do gateway:** comprovar que só chamadas server-to-server assinadas são processadas e que chamadas diretas/replay são recusadas.
4. **POC-03 — senha e aleatoriedade:** avaliar primitivas, KDF e desempenho no ambiente disponível.
5. **POC-04 — sessão:** testar cookie emitido pela Vercel Function, ciclo de vida e proteção CSRF; Apps Script continua validando a sessão.
6. **POC-05 — Sheets, locks e auditoria:** confirmar lote atômico, concorrência e falhas.
7. **POC-06/07 — Drive e arquivos:** confirmar permissões, validações e limites.
8. **POC-08/09 — implantação, abuso e quotas:** testar limites do ambiente de demonstração.
9. Somente após aprovações: implementar módulos progressivamente, começando por leitura pública e operações não privilegiadas; autenticação permanece bloqueada até POC-03/04.

Não criar endpoints administrativos, painel autenticado, upload público ou escrita operacional antes das etapas e critérios correspondentes.

## 16. Decisões ainda abertas

- Local e formato definitivos da Vercel Function (a POC deverá avaliar a convenção /api/ no projeto Vite atual).
- Formato do envelope e serialização do payload Vercel → Apps Script.
- Algoritmo/canonicalização da assinatura, timestamp, nonce e controle de replay.
- Variáveis e escopo dos ambientes Development, Preview e Production.
- Timeout e região da Function compatíveis com os limites do Apps Script.
- KDF seguro, mantido e viável no runtime Apps Script.
- Geração de token e estratégia de cookie no navegador; atributos SameSite e defesa CSRF.
- Viabilidade prática de upload binário com limite de 5.000.000 bytes.
- Comportamento das permissões do Drive na conta Google utilizada.
- Ferramenta de sincronização/versionamento do código Apps Script.
- Quotas efetivas da conta e tempos medidos.

As decisões abertas não alteram as regras de negócio aprovadas. Elas impedem a implementação das partes correspondentes até serem resolvidas.

## 17. Referências técnicas consultadas

- [Vercel — Functions](https://vercel.com/docs/functions)
- [Vercel — Node.js Runtime](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel — Functions API Reference](https://vercel.com/docs/functions/functions-api-reference)
- [Vercel — Environment Variables](https://vercel.com/docs/environment-variables)
- [Google Apps Script — Web Apps](https://developers.google.com/apps-script/guides/web)
- [Google Apps Script — Content Service](https://developers.google.com/apps-script/guides/content)
- [Google Apps Script — TextOutput](https://developers.google.com/apps-script/reference/content/text-output)
- [Google Apps Script — Manifesto de Web App e API executável](https://developers.google.com/apps-script/manifest/web-app-api-executable)
- [Google Apps Script — Utilities](https://developers.google.com/apps-script/reference/utilities/utilities)
- [Google Apps Script — Lock Service](https://developers.google.com/apps-script/reference/lock)
- [Google Apps Script — Properties Service](https://developers.google.com/apps-script/guides/properties)
- [Google Apps Script — Quotas e limites](https://developers.google.com/apps-script/guides/services/quotas)
- [Google Sheets API — Batch requests e atomicidade](https://developers.google.com/workspace/sheets/api/guides/batch)
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

---

**Conclusão:** esta arquitetura organiza a implementação futura, mas não certifica Apps Script como backend seguro para produção. A primeira entrega técnica deve ser uma prova de conceito de transporte; senha e sessão permanecem bloqueadas até demonstração verificável.
