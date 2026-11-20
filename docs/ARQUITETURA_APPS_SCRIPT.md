# Arquitetura da integração Vercel Functions + Google Apps Script — Conecta Local

> **Versão:** 0.2  
> **Data da atualização:** 2026-11-20  
> **Estado atual:** o protótipo funcional (#15–#18) e a POC-04 (#14) estão integrados à branch `dev`. O responsável confirmou em 20/11/2026 que revalidou o fluxo principal no Preview atualizado e que a demonstração está funcionando. O backend principal usa Vercel Functions como gateway, Apps Script como autoridade de negócio e oito abas operacionais do Google Sheets. `main`/Production continua sendo vitrine pública, sem backend habilitado. A POC-04 foi mesclada, mas permanece independente e desabilitada; seus dois itens de hardening impedem qualquer reativação. A integração não equivale a auditoria independente, certificação ou aprovação para produção.
> **Escopo:** integração React/Vite, Google Apps Script, Google Sheets e Google Drive para a demonstração acadêmica.  
> **Premissa:** manter Apps Script como autoridade de domínio e sessão; Vercel Functions atua apenas como gateway HTTP. Qualquer fluxo de autenticação e sessão deverá ser aprovado em provas isoladas com dados sintéticos.

## 1. Objetivo e estado real

### Protótipo funcional com persistência — branch `dev`

O fluxo funcional foi integrado à `dev` pela PR #15 e permanece no ambiente Preview para demonstração acadêmica com dados fictícios:

- `api/app.js` expõe a Function `POST /api/app`.
- `server/app-gateway.js` aplica validação de Origin, contrato de JSON, Argon2id no runtime Node, comparação de hash com `timingSafeEqual`, cookie HttpOnly/Secure/SameSite, CSRF e HMAC server-to-server.
- `apps-script/conecta-local/Code.gs` recebe ações assinadas, verifica nonce/timestamp, valida dados e grava usuários, perfis, códigos, sessões, serviços e auditoria nas abas estruturais existentes.
- `src/services/app-api.js` conecta React à Function; `AuthDemoPage.jsx` usa o backend e `HomePage.jsx` consulta os serviços publicados.
- A senha em texto puro não é encaminhada ao Apps Script; a Function deriva o hash Argon2id e envia somente hash, salt e algoritmo.
- O código de confirmação é HMAC no Apps Script e exibido na interface do protótipo. Não há envio de e-mail.
- A sessão é criada pelo backend funcional desta branch; a POC-04 de conta sintética continua separada.

**Estado de ativação:** a integração de negócio com Apps Script e Google Sheets está ativa no Preview de `dev` e foi exercitada pelo responsável no fluxo principal. As variáveis `CONECTA_LOCAL_*` permanecem restritas ao ambiente Preview; seus valores são secretos e não devem ser registrados na documentação. O procedimento original de configuração continua em `docs/ATIVAR-PROTOTIPO-GOOGLE-SHEETS.md` para referência, mas não representa uma ativação pendente.

**Escopo de demonstração:** cadastro, ativação por código, login, sessão, consulta de dados e CRUD mínimo de serviços. Recuperação de senha, e-mail, upload Drive, edição completa de perfil, admin e moderação ficam fora desta rodada. Usar apenas dados fictícios; o protótipo não é declarado pronto para produção.


Este documento preserva decisões arquiteturais, detalhes técnicos e propostas que foram sendo implementadas ao longo das POCs. Em caso de divergência, `docs/AI_CONTEXT.md` e o código da branch `dev` representam o estado atual; trechos identificados como candidatos ou propostas devem ser lidos como histórico/planejamento, não como descrição de funcionalidades inexistentes.

Estado conhecido na data desta revisão:

- Frontend demonstrativo em React, JavaScript/JSX e Vite, publicado na Vercel.
- Projeto configurado como módulo JavaScript ES (package.json usa type module).
- A branch `dev` contém a Function de negócio `api/app.js`, as regras de gateway em `server/app-gateway.js` e a integração Apps Script.
- A planilha estrutural foi criada com 12 abas/102 cabeçalhos; oito abas são utilizadas operacionalmente pelo fluxo atual.
- O fluxo de cadastro, confirmação demonstrativa, login, sessão, perfil, criação, pausa/publicação e consulta de serviços está implementado e conectado ao Sheets.
- A comunicação real da POC-01 foi confirmada manualmente em Preview em 2026-11-11; a evidência está em `docs/POC_01_COMUNICACAO.md`.
- O responsável confirmou a revalidação do fluxo principal no Preview atualizado de `dev` em 20/11/2026.
- Upload/gerenciamento de imagens no Drive e painel administrativo ainda não estão implementados.
- `src/pages/AuthDemoPage.jsx` e `HomePage.jsx` estão conectadas ao gateway/consulta pública; não são apenas interfaces locais.

O projeto continua sendo uma demonstração acadêmica com dados sintéticos. Não inserir credenciais, cadastros ou dados pessoais reais.

## 2. Decisões arquiteturais aprovadas

1. O frontend permanece em React/Vite.
2. Google Apps Script continua sendo o único backend de negócio do MVP: é a autoridade para autenticação, autorização, regras, transições de estado, integridade e operações de dados.
3. Vercel Functions será utilizada como **gateway HTTP server-side** entre o navegador e o Web App do Apps Script.
4. A Function é um componente técnico de borda/transporte, não uma segunda camada de domínio. Ela não será responsável por regras de negócio, não acessará Sheets/Drive diretamente e não será fonte de verdade para usuários, sessões, papéis ou permissões.
5. Google Sheets armazena operacionalmente os dados nas oito abas já integradas; as quatro abas restantes da modelagem continuam planejadas. Google Drive está reservado para uma etapa futura de imagens; o fluxo de upload e permissões ainda não está implementado.
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

**Configuração usada na demonstração:** o Web App de negócio opera com a identidade do implantador e é acessado pela camada server-side da Vercel; a chamada é autenticada por HMAC e todas as operações protegidas validam sessão e autorização no Apps Script. A configuração permanece limitada à demonstração com dados fictícios e ao Preview; conferir o manifesto e as propriedades do projeto Apps Script antes de qualquer mudança de implantação.

Quando executa como quem publicou, o script atua com a autoridade dessa pessoa, independentemente de quem chamou o endpoint. Isso significa que um endpoint público pode acionar operações privilegiadas. A interface, a URL difícil de adivinhar e o login do frontend não protegem a planilha. Toda operação deve validar no servidor o tipo de ação, a sessão, o papel, a propriedade e o estado dos registros.

### 4.2. Isolamento obrigatório para testes

- Usar projeto Apps Script e recursos de teste separados dos recursos pessoais ou de qualquer operação real.
- Conectar somente a planilha sintética do Conecta Local.
- Usar uma pasta raiz de teste privada no Drive.
- Não conceder acesso de editor do projeto Apps Script a quem não deva poder alterar código executado com a identidade do implantador.
- A implantação anônima usada na POC é isolada, aceita somente ações sintéticas `poc.*` e exige HMAC válido para executar essas ações. Não adicionar operações privilegiadas nem dados reais nessa implantação; qualquer expansão de superfície exige nova revisão de segurança.
- Não transmitir ScriptApp.getOAuthToken() ou credenciais Google ao navegador.
- Manter configurações e segredos fora do bundle Vite e do repositório.

O modo de execução e o nível de acesso efetivamente utilizados deverão ser registrados na documentação de implantação depois do teste.


### 4.3. Autenticação da chamada Vercel → Apps Script

O Web App poderá precisar aceitar acesso anônimo para que visitantes sem conta Google alcancem as operações públicas. Se executar como o implantador, cada chamada usa a autoridade desse responsável. A URL do Web App não é segredo suficiente.

Portanto, a proposta exige autenticação própria da comunicação entre a Function e o Apps Script:

- A Function assina cada chamada no servidor com um segredo compartilhado, nunca enviado ao navegador.
- O Apps Script valida a assinatura antes de executar qualquer ação.
- A assinatura deverá vincular pelo menos o método lógico/ação, timestamp, requestId e conteúdo encaminhado.
- A POC-02 foi validada manualmente em 2026-11-11: chamada sem assinatura recusada, timestamp expirado recusado, chamada assinada aceita, repetição de nonce recusada, payload adulterado recusado e duas chamadas concorrentes idênticas resultando em uma aceitação e uma recusa por replay. O ensaio concorrente cobriu duas chamadas, não carga ou escala.
- Um segredo fixo enviado como parâmetro sem assinatura, timestamp ou controle de replay não será considerado solução final.
- A chave fica em variável de ambiente server-side da Vercel e em Script Properties do projeto Apps Script. Não deve aparecer no repositório, no frontend, em logs ou em respostas.

A POC-02 implementa HMAC-SHA-256 com mensagem canônica versionada, timestamp em milissegundos, nonce aleatório de 256 bits, hash SHA-256 do payload e segredo compartilhado de 32 bytes. O contrato, os limites e os resultados manuais estão em `docs/POC_02_ASSINATURA_GATEWAY.md`. O PR #11 foi integrado à `dev` em 2026-11-11 e os testes manuais foram aprovados. A assinatura autentica a comunicação entre servidores, não os usuários finais, e não substitui autorização. A integração continua restrita a ações sintéticas `poc.*` e não está aprovada para produção.

### 4.4. Sessão do usuário e cookie do navegador

A Vercel Function pode emitir uma resposta HTTP própria para o navegador, separada do TextOutput produzido pelo Apps Script. Isso permite testar um cookie de sessão HttpOnly no domínio da aplicação Vercel sem exigir que o Apps Script configure Set-Cookie.

**Implementação atual — sessão principal do protótipo:** o PR #15 integrou o fluxo de sessão por cookie HttpOnly emitido pela Vercel, com validação server-side/Apps Script, CSRF, Origin, revogação e persistência em Sheets. O Apps Script permanece autoridade para sessão, estado da conta e autorização.

1. O login chega à rota da Vercel.
2. A Function valida a entrada, deriva o verificador Argon2id e encaminha somente os dados necessários ao Apps Script por chamada server-to-server autenticada.
3. O Apps Script valida a assinatura, os dados e as regras de negócio, cria/registra a sessão e confirma o resultado.
4. A Function define o cookie `__Host-conecta_local_session` com `HttpOnly; Secure; SameSite=Strict; Path=/`, sem `Domain`.
5. Nas próximas requisições, o navegador envia o cookie à mesma origem; a Function encaminha a operação ao Apps Script.
6. O Apps Script consulta `SESSOES`, valida o hash do token, expiração, revogação, estado da conta e permissões.

O responsável confirmou a revalidação do fluxo principal no Preview atualizado de `dev` em 20/11/2026. A POC-04 é um experimento separado de sessão sintética; foi mesclada em `dev`, mas continua desabilitada e não faz parte desta autenticação.
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
- Parâmetros da chamada autenticada: `signatureVersion`, `timestamp`, `nonce`, `signature`, `action`, `requestId` e `payload`.
- payload: JSON serializado com os campos da operação.
- redirect: follow, pois o Content Service redireciona a resposta.
- AbortController: interromper a chamada antes de exceder o limite de execução definido para a Function.
- Resposta: ler o conteúdo, validar o envelope lógico e converter a falha/sucesso para a resposta HTTP da rota Vercel.

A canonicalização, o HMAC e a proteção contra replay estão especificados em `docs/POC_02_ASSINATURA_GATEWAY.md`. Não enviar segredos de sessão, senha ou a chave compartilhada em query string.

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

### 5.7. POC-01 — transporte básico

A POC-01 foi integrada à branch `dev` pelo PR #10 e teve os cinco cenários reais confirmados manualmente em Preview em 2026-11-11. Ela comprovou o transporte React → Vercel Function → Apps Script, o redirecionamento do Content Service, o eco e o mapeamento de erros.

- `api/backend.js` recebe POST same-origin, valida método, Content-Type, tamanho, JSON, requestId, payload e allowlist.
- `src/services/poc-01-api.js` chama somente `/api/backend`; `src/pages/Poc01Page.jsx` mantém os cenários temporários em `?poc=01`.
- `apps-script/poc-01/Code.gs` registra a versão original, sem autenticação HMAC, e deve ser tratado como código histórico da POC-01.
- `tests/poc01/backend.test.js` complementa a validação manual usando respostas upstream simuladas.

A POC-01, isoladamente, não protegia o Web App contra chamadas diretas. A versão de teste sem assinatura não deve executar ações privilegiadas, acessar Sheets/Drive, e-mail ou dados reais. Se uma implantação antiga dessa versão ainda estiver ativa, atualize-a para o código protegido da POC-02 ou desative-a.

### 5.8. POC-02 — assinatura HMAC e proteção contra replay

A implementação está na branch `feat/poc-02-hmac-replay` e ainda não foi integrada à `dev`.

- `api/backend.js` gera timestamp, nonce aleatório de 32 bytes, hash SHA-256 do payload e HMAC-SHA-256 usando `APPS_SCRIPT_HMAC_SECRET` no servidor da Vercel.
- A mensagem canônica usa domínio `CONECTA_LOCAL_GATEWAY`, versão `v1`, método lógico POST, timestamp, nonce, ação, requestId e hash do payload, separados por newline UTF-8.
- `apps-script/poc-02/Code.gs` valida os campos e a janela temporal de cinco minutos, recalcula hash/HMAC e reserva o nonce em Script Properties sob `LockService.getScriptLock()` antes de executar a ação.
- O registro de nonce tem retenção de 10 minutos e 30 segundos e limite explícito de 2.500 itens ativos. Falha de lock, armazenamento ou capacidade recusa a chamada (fail closed).
- `APPS_SCRIPT_HMAC_SECRET` é configurada somente no ambiente Preview; `POC02_HMAC_SECRET` é configurada em Script Properties. Os valores devem ser idênticos, gerados fora do repositório e nunca enviados pelo chat.
- `tests/poc02/` executa testes Node contra o gateway e um harness local da lógica Apps Script. Isso não substitui a validação de rede real no Google.
- `scripts/poc02-replay-check.mjs` executa os testes manuais diretos de assinatura ausente, timestamp expirado, chamada assinada, repetição do mesmo nonce e payload adulterado sem imprimir o segredo.

A implementação continua limitada a ações sintéticas e não está aprovada para produção. A aceitação exige configurar os dois segredos, atualizar/reimplantar o Web App protegido e validar um Preview real.
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
| AuthService.gs | cadastro, login, códigos e sessões; fluxo principal implementado em `apps-script/conecta-local/Code.gs` |
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

A aba `USUARIOS` já prevê `senha_hash`, `senha_salt` e `senha_algoritmo`, mas o formato candidato da POC-03 ainda não foi aprovado para autenticação.

**Resultado da POC-03 — pesquisa experimental incorporada à dev pelo PR #12:**
- **PBKDF2-HMAC-SHA-256 sobre `Utilities.computeHmacSha256Signature`: reprovado** neste runtime. O vetor de 80.000 iterações/64 bytes levou 84.443 ms; o benchmark de 600.000 iterações foi interrompido preventivamente após 149.247 iterações/180.229 ms, com projeções que poderiam exceder a quota de seis minutos.
- **Argon2id via `hash-wasm@4.13.0`: candidato funcional, não aprovado.** Dois vetores independentes passaram em cinco baterias manuais. No perfil `m=19456 KiB,t=2,p=1`, os tempos foram 142, 130, 86, 280 e 61 ms (mediana 130 ms). Isso não é teste de carga, SLA, medição de pico de memória nem comprovação de capacidade de produção.
- **Salt:** 256 UUIDv4 foram validados no Apps Script real, sem colisões observadas na amostra. Isso não constitui prova estatística da fonte CSPRNG nem unicidade global; o formato continua candidato.
- **Política de entrada:** 14/14 testes manuais passaram para 15–128 code points Unicode, NFC, até 512 bytes UTF-8, preservação de espaços/case e rejeição de controles/malformed UTF-16.
- **Blocklist:** 10/10 cenários simulados passaram e a consulta HTTPS real ao Pwned Passwords foi validada uma vez com o vetor público fixo `password`, enviando somente o prefixo de cinco caracteres SHA-1 e usando `Add-Padding: true`. A lista local é didática, não abrangente, e o avaliador não está integrado ao cadastro/login.
- **Throttling:** testes lógicos e ensaios sintéticos de concorrência foram concluídos em Script Properties/ScriptLock e numa planilha temporária isolada. As estruturas temporárias foram limpas. Isso não é rate limiter operacional do endpoint; lockout por conta ainda traz risco de DoS e exige mitigação.

**Decisão histórica da POC-03C — 13/11/2026:** naquele estágio, o comparador XOR do Apps Script não foi aprovado por ausência de garantia formal de tempo constante, e o helper Node ainda não estava integrado. Essa decisão descrevia o estado da investigação isolada; não deve ser lida como o estado atual do protótipo principal.

**Estado posterior do protótipo:** o gateway do projeto integrou Argon2id via `hash-wasm@4.13.0` e comparação Node com `node:crypto.timingSafeEqual`, conforme registrado em `docs/AI_CONTEXT.md` e `docs/POC_03_ARMAZENAMENTO_SENHAS.md` seção 8.21. A integração é restrita ao protótipo acadêmico no Preview, com credenciais fictícias; não representa auditoria independente ou aprovação para Production. A blocklist didática/Pwned Passwords continua como pesquisa isolada, sem integração afirmada ao cadastro/login.
### 10.2. Sessões

A modelagem prevê persistir somente o hash do token na aba `SESSOES`, com 30 minutos de inatividade e duração absoluta de 8 horas. O token em claro não deve ser gravado na planilha nem em logs.

**Sessão do protótipo principal:** o PR #15 integrou à demonstração o fluxo de sessão por cookie HttpOnly emitido pela Vercel, validação server-side/Apps Script, CSRF, Origin, revogação e persistência em Sheets. Em 20/11/2026, o responsável confirmou que repetiu o percurso funcional no Preview atualizado de `dev` após as integrações posteriores. Essa sessão pertence ao protótipo principal e não depende da POC-04.

**POC-04 — sessão sintética independente:** foi integrada à branch `dev` pela PR #14 em 20/11/2026, sem conexão com `AuthDemoPage.jsx` ou com o fluxo principal. Os ensaios sintéticos confirmaram cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sem `Domain`), CSRF, rejeição de Origin ausente/externa e Fetch Metadata cross-site, expiração por timestamps controlados, replay, concorrência, logout e revogação. A planilha temporária, nonces, segredo `POC04_HMAC_SECRET` e quatro variáveis Vercel exclusivas foram limpos. A rota permanece desabilitada. Os dois pontos de hardening registrados no documento específico impedem qualquer reativação.

A cópia atualizada de `Code.gs` apresentada pelo responsável não contém as cinco funções auxiliares de ensaio; a conferência não substitui a responsabilidade do editor em manter a versão salva. A revisão estática final registrou dois bloqueios para reativação: os limites de corpo/resposta são verificados após leitura integral e não existe rate limiting/limite de emissão. Falhas reais de armazenamento, timeout/upstream e testes de carga não foram executados. Esses itens não foram corrigidos nesta etapa; a rota deve permanecer desabilitada. Evidências e limites em [`docs/POC_04_SESSOES.md`](./POC_04_SESSOES.md).

A limitação de TextOutput continua relevante para respostas diretas do Apps Script; o cookie é emitido pela Function, não pelo Apps Script.

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

**Implementação observada no protótipo atual:**
- `appRequireSession_` resolve a sessão pelo hash do token e retorna o registro de usuário confiável; operações de perfil/serviço não usam um `id_usuario` escolhido pelo navegador como identidade.
- `appUpdateProfile_` encontra o perfil por `state.user.id_usuario` e atualiza somente nome público, apresentação, cidade principal, WhatsApp e data de atualização.
- `appListMyServices_` obtém a lista através do perfil ligado ao usuário da sessão.
- `appCreateService_` deriva `id_profissional` do perfil ligado à sessão; não aceita o proprietário do payload como fonte de verdade.
- `appSetServiceStatus_` localiza o serviço pelo ID solicitado e compara seu `id_profissional` ao perfil obtido da sessão; divergência retorna `SERVICE_NOT_FOUND`. Somente `published` e `paused` são aceitos nesta operação.
- No gateway, `profile.update`, `service.listMine` e `service.setStatus` encaminham apenas campos permitidos e o hash do token derivado do cookie. A ação interna `session.create` não faz parte da allowlist do navegador.

A suíte `tests/authorization/` executa o `Code.gs` real em um harness Node/VM com duas contas, dois perfis e dois serviços sintéticos. Ela cobre listagem isolada, tentativa de A alterar serviço de B, mass assignment de identidade/papel, proprietário de serviço criado, estados não permitidos, sessão inválida e sanitização do gateway. O harness usa mocks de Sheets/LockService/Properties; não é uma validação da infraestrutura Google real. A verificação manual de acesso cruzado no Preview atualizado de `dev` e a inspeção da planilha continuam necessárias.

**Limite de integridade conhecido:** atualização de serviço/perfil e inclusão do evento de auditoria ainda são escritas separadas no Apps Script. Portanto, os testes desta etapa comprovam que operações recusadas não alteram o recurso alheio nem geram evento de sucesso; não comprovam atomicidade diante de uma falha entre a escrita de negócio e a escrita de auditoria. Avaliar esse cenário na POC-05 somente se o esforço for proporcional ao objetivo acadêmico.

Testar também elevação de papel, alteração de proprietário e manipulação de status.

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

1. **POC-01 — comunicação:** concluída e integrada pelo PR #10.
2. **POC-02 — assinatura do gateway:** concluída e integrada pelo PR #11; o protocolo também é utilizado no gateway de negócio.
3. **POC-03 — senha e política de entrada:** estudo concluído; Argon2id e comparação Node com `timingSafeEqual` foram posteriormente integrados ao gateway do protótipo principal. A blocklist e a sonda Pwned Passwords continuam como pesquisa isolada, sem integração afirmada ao fluxo.
4. **POC-04 — sessão sintética independente:** PR #14 integrada à `dev`; ensaios concluídos, rota desabilitada e dois bloqueios de hardening registrados para qualquer reativação. Não conectar ao login principal.
5. **Próxima prioridade — autorização e integridade:** verificar acesso cruzado entre profissionais, manipulação de proprietário/estado e consistência de auditoria. O roteiro está em `docs/ROADMAP_ESTUDOS.md`.
6. **Depois — ciclo de vida dos serviços:** implementar edição e remoção lógica com validações no Apps Script e registro de auditoria.
7. **Opcional — localidades e imagens:** concluir vínculo de serviços a múltiplas cidades e/ou integração de imagens no Drive, somente se agregarem valor à demonstração e ao aprendizado.
8. **Adiadas:** painel administrativo completo, denúncias, envio real de e-mail, recuperação de senha e infraestrutura de produção; não são pré-requisitos para o projeto acadêmico atual.

Não ampliar a arquitetura nem introduzir serviços externos antes de uma necessidade didática ou funcional demonstrável.

**Trabalho visual independente das POCs:** é permitido desenvolver e revisar a experiência visual de cadastro/login em React usando estado local efêmero, desde que não envie credenciais, não persista valores, não crie uma falsa sessão e deixe explícito que o backend não está conectado. Essa permissão não libera a implementação de autenticação, verificação de e-mail, recuperação de senha ou sessão no Apps Script/Vercel.

## 16. Decisões ainda abertas

- Local e formato definitivos da Vercel Function (a POC deverá avaliar a convenção /api/ no projeto Vite atual).
- Formato do envelope e serialização do payload Vercel → Apps Script.
- Variáveis e escopo dos ambientes Development, Preview e Production.
- Timeout e região da Function compatíveis com os limites do Apps Script.
- Estratégia de verificação de senha que preserve a autoridade do Apps Script: o XOR não foi aprovado e o helper Node com `timingSafeEqual` não foi selecionado; qualquer nova fronteira de confiança exige decisão e prova próprias.
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
