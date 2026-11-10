# Arquitetura do backend Google Apps Script — Conecta Local

> **Versão:** 0.1  
> **Data:** 2026-11-10  
> **Status:** proposta arquitetural inicial para revisão; não liberada para implementação.  
> **Escopo:** integração React/Vite, Google Apps Script, Google Sheets e Google Drive para a demonstração acadêmica.  
> **Premissa:** manter Apps Script como backend inicial e autenticação própria por e-mail e senha, conforme decisão funcional aprovada. Transporte, sessão e armazenamento seguro de senhas continuam pendentes de prova de conceito.

## 1. Objetivo e estado real

Este documento transforma as decisões de produto e de dados em uma proposta de arquitetura técnica. Ele não declara que o backend, a API, a autenticação ou a integração com Drive já existam.

Estado conhecido nesta data:

- Frontend demonstrativo em React, JavaScript/JSX e Vite, publicado na Vercel.
- Arquivo Google Sheets criado pelo responsável pelo projeto com as 12 abas e os 102 cabeçalhos do modelo físico.
- O arquivo exportado em XLSX foi inspecionado: nomes e ordem das abas, cabeçalhos, listas suspensas e ausência de registros ou fórmulas inesperados foram conferidos.
- O responsável confirmou a conferência das proteções e do compartilhamento restrito na interface do Google Sheets.
- O arquivo ainda é uma estrutura inicial, não um backend operacional integrado.
- Não há autenticação, sessão, API operacional, leitura/gravação de dados pelo frontend, upload de imagens ou painel administrativo implementados.

O projeto é uma demonstração acadêmica com dados sintéticos. Não inserir senhas, credenciais, cadastros ou dados pessoais reais.

## 2. Decisões preservadas

1. O frontend permanece em React/Vite.
2. Google Apps Script é o único backend planejado para o MVP; não adicionar Firebase, Supabase, Express ou outro provedor de autenticação sem reabrir formalmente a decisão.
3. Google Sheets armazena os registros nas 12 abas aprovadas.
4. Google Drive armazena os arquivos de imagem; a aba IMAGENS contém os metadados e relacionamentos.
5. Visitantes podem pesquisar e visualizar conteúdo público sem conta.
6. Profissionais usam conta própria com e-mail e senha, quando os bloqueios técnicos forem resolvidos.
7. O backend é a fronteira de confiança. O navegador nunca decide papel, propriedade, status ou autorização.
8. O modelo físico e as regras de negócio aprovados continuam sendo a fonte de verdade para os dados.
9. A demonstração não será apresentada como serviço pronto para produção ou escala comercial.

## 3. Visão geral da arquitetura

Navegador do visitante/profissional  
↓  
Frontend React + Vite — hospedagem atual: Vercel  
↓ HTTP GET/POST — transporte ainda precisa ser comprovado  
Google Apps Script — Web App / camada de API  
↓  
Validação, autorização e regras de negócio  
↙　　　　　　　　　↘  
Google Sheets　　　　 Google Drive  
12 abas　　　　　　　 arquivos de imagem  
↘  
Auditoria no Google Sheets

O Apps Script também lê configuração e segredos do Script Properties. A seta entre Vercel e Apps Script representa uma integração planejada, não comprovada. A prova de conceito de transporte/CORS é a primeira condição técnica para avançar.

O fluxo de confiança é: React solicita uma operação; Apps Script valida formato e tamanho da entrada, identifica a operação permitida, verifica sessão e autorização quando necessário, aplica regras de negócio e só então acessa Sheets ou Drive. A resposta retorna apenas os campos permitidos para aquele ator.

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

## 5. Comunicação React/Vite ↔ Apps Script

### 5.1. Entradas HTTP

O Web App recebe requisições por doGet(e) e doPost(e). A proposta inicial é:

- GET: somente consulta pública não sensível e verificação técnica de disponibilidade, quando necessário.
- POST: operações de leitura que exijam payload estruturado, autenticação, alteração de dados, upload e ações administrativas.
- Nunca enviar senha, código, token de sessão ou outros segredos em query string.
- Não usar JSONP para operações autenticadas ou dados privados.
- Tratar todo parâmetro recebido como não confiável.

### 5.2. Bloqueio conhecido do Content Service

O Content Service redireciona a resposta para uma URL temporária em script.googleusercontent.com. A classe TextOutput documenta métodos para conteúdo, MIME type e nome de download; não documenta um método para configurar cabeçalhos HTTP arbitrários, como Access-Control-Allow-Origin, Set-Cookie ou atributos de cookie HttpOnly.

Consequências arquiteturais:

- Não presumir que um fetch do domínio Vercel para o domínio Apps Script funcionará com CORS.
- Não presumir que será possível criar cookie de sessão HttpOnly, Secure e SameSite apenas retornando TextOutput.
- Requisições application/json podem provocar preflight CORS no navegador; a compatibilidade do Web App com o fluxo completo precisa ser testada.
- Não considerar o redirecionamento para script.googleusercontent.com um detalhe irrelevante: ele faz parte do fluxo de resposta.
- A ausência de um cabeçalho HTTP configurável pode impedir o desenho de sessão pretendido. A solução não deve ser improvisada com armazenamento inseguro de token.

O comportamento real será medido em navegador, na origem de produção e em uma origem de Preview autorizada, com GET, POST JSON, POST de formulário, redirecionamento, resposta de erro e requisições concorrentes.

### 5.3. Alternativas condicionais

A proposta principal continua sendo React/Vite hospedado na Vercel chamando o Web App. Se a prova de conceito demonstrar uma limitação impeditiva:

1. avaliar hospedagem da experiência web em HtmlService e chamada interna por google.script.run; ou
2. retornar à decisão de arquitetura para discutir um intermediário HTTP controlado.

Nenhuma dessas alternativas está aprovada agora. A segunda introduziria outro componente de backend e contrariaria a premissa atual de Apps Script como único backend; portanto, não deverá ser adicionada automaticamente.

### 5.4. Contrato lógico de mensagem

Formato inicial ilustrativo de requisição:

    {
      "action": "catalog.search",
      "requestId": "identificador-da-requisicao",
      "payload": {
        "term": "eletricista",
        "cityId": "uuid-da-cidade"
      }
    }

Envelope lógico de resposta:

    {
      "ok": true,
      "requestId": "identificador-da-requisicao",
      "data": {},
      "error": null
    }

Em falhas, ok será false e error conterá código estável e mensagem segura. O contrato exato será validado no teste de transporte. Não retornar stack trace, dados privados, hash de senha, salt, código, token ou chave.

Como TextOutput não oferece setter documentado de status HTTP, o contrato lógico não deve depender exclusivamente de códigos HTTP específicos. A capacidade real do transporte será registrada na prova de conceito.

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
- Enviar apenas os campos necessários à ação.
- Nunca armazenar chaves Google, segredos HMAC, hashes de senha, salts ou credenciais.
- Não confiar em role, userId, ownerId, preço, status ou autorização recebidos do cliente.
- Não considerar a sessão válida apenas porque existe estado local no React.
- Não afirmar sucesso antes da confirmação recebida do backend.

### 7.2. Google Apps Script

- Receber e validar requisições.
- Controlar a lista de ações permitidas.
- Verificar autenticação e autorização em todas as rotas protegidas.
- Aplicar regras, integridade, transições de estado e limites.
- Coordenar Sheets, Drive, lock e auditoria.
- Sanitizar mensagens e logs.
- Tratar falhas parciais e retornar confirmação somente quando a operação estiver concluída.

### 7.3. Google Sheets

- Continuar como armazenamento simplificado da demonstração.
- Conservar as 12 abas e os 102 cabeçalhos aprovados.
- Usar UUID como identificador; número da linha não é chave de negócio.
- Ler apenas intervalos necessários, evitando transferir a planilha inteira em toda requisição.
- Transformar linhas em objetos por cabeçalho, sem depender da ordem de inserção dos registros.
- Não retornar abas internas ou campos privados em consultas públicas.
- Usar RAW nas gravações pela Sheets API para evitar que conteúdo textual seja interpretado como fórmula.
- Não permitir escrita pelo frontend nem distribuir credenciais de edição.

### 7.4. Google Drive

- Manter a pasta raiz privada.
- Guardar metadados e relacionamentos na aba IMAGENS.
- Validar no backend limite de 5.000.000 bytes, tipo permitido e conteúdo efetivo do arquivo; não confiar só na extensão ou no MIME informado pelo navegador.
- Respeitar o limite de uma imagem ativa por perfil e cinco por serviço.
- Aplicar permissão pública por link somente quando a imagem for elegível e a conta/serviço permitirem exposição.
- Restringir o arquivo quando deixar de ser elegível, confirmar a mudança e registrar falhas.
- Considerar que revogar acesso não apaga cópias previamente baixadas ou capturadas.

## 8. Configuração e segredos

A proposta é utilizar PropertiesService.getScriptProperties() para configurações comuns do projeto, como:

- SPREADSHEET_ID;
- DRIVE_ROOT_FOLDER_ID;
- segredos HMAC necessários às operações de códigos e identificadores;
- versão/configuração do ambiente, se necessário.

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

- como gerar token com aleatoriedade criptograficamente segura no runtime;
- como transportá-lo do navegador ao Apps Script;
- como persistir a sessão no navegador sem expô-la desnecessariamente;
- como compatibilizar esse transporte com CORS, redirecionamentos e a limitação documentada de cabeçalhos do TextOutput.

Não escolher localStorage, sessionStorage, cookie ou token em query string antes da prova de conceito. HttpOnly não pode ser presumido pelo caminho TextOutput documentado.

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

A lista abaixo é um agrupamento lógico, não um contrato de endpoints já implementado.

| Grupo | Operações previstas | Autenticação |
|---|---|---|
| Saúde | verificação mínima de disponibilidade | Pública, sem dados internos |
| Catálogo público | pesquisar, filtrar e consultar serviço/perfil elegível | Pública |
| Conta | cadastro, confirmação, login, logout, recuperação e alteração de senha/e-mail | Conforme operação; depende da PoC |
| Profissional | consultar/alterar próprio perfil e próprios serviços | Profissional autenticado |
| Imagens | upload, remoção e consulta de estado dos próprios arquivos | Profissional autenticado |
| Administração | gerir contas, categorias, cidades, serviços e denúncias; consultar auditoria | Administrador autenticado |

O roteador deverá aceitar somente ações explicitamente permitidas. Não criar método genérico que receba nome de aba, intervalo A1 ou nome de função a executar diretamente do navegador.

## 12. Erros, observabilidade e proteção de informações

- Cada requisição terá requestId não secreto para correlação.
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

Nenhuma implementação de autenticação ou publicação anônima será liberada apenas por a arquitetura parecer viável. As PoCs devem ser isoladas, usar dados sintéticos e registrar evidências reproduzíveis.

| ID | Prova de conceito | Critério mínimo para avançar |
|---|---|---|
| POC-01 | Transporte React/Vercel ↔ Web App | GET/POST, corpo JSON/form, redirecionamento e CORS funcionam nos navegadores-alvo sem expor segredo; preflight documentado |
| POC-02 | KDF e aleatoriedade | algoritmo apropriado, implementação mantida/revisada, salt por senha, parâmetros versionados, geração segura de token e desempenho medido |
| POC-03 | Sessões no navegador | transporte/persistência escolhidos com justificativa, expiração por inatividade e absoluta, logout e revogação comprovados; token fora de URL/logs |
| POC-04 | Concorrência e auditoria | chamadas simultâneas não duplicam unicidade/contadores; LockService e spreadsheets.batchUpdate demonstram o comportamento esperado |
| POC-05 | Permissões do Drive | arquivos privados por padrão; mudança público/privado confirmada; falhas parciais detectadas e reconciliáveis |
| POC-06 | Integração de arquivos | validação de tamanho e conteúdo; upload de até 5.000.000 bytes testado sem exceder limites práticos de execução/memória |
| POC-07 | Implantação e abuso | configuração de acesso/identidade documentada; endpoints protegidos contra manipulação de papel/proprietário e uso abusivo básico |
| POC-08 | Quotas e desempenho | tempos, limites e falhas medidos para o conjunto de dados sintético e navegador-alvo |

**Critério de interrupção:** se qualquer requisito crítico de senha, sessão, transporte ou autorização não puder ser atendido sem improviso inseguro, interromper a implementação correspondente e reabrir a decisão arquitetural com o responsável.

## 15. Ordem de trabalho proposta

1. Revisão desta arquitetura: confirmar escopo, fronteiras e riscos antes de código.
2. POC-01 — transporte: verificar comunicação browser/Vercel com Apps Script. É o primeiro teste porque pode impedir a arquitetura de frontend atual.
3. POC-02 e POC-03 — senha e sessão: avaliar primitivas reais do runtime, KDF e ciclo de vida da sessão.
4. POC-04 — Sheets, locks e auditoria: confirmar lote atômico, concorrência e falhas.
5. POC-05 e POC-06 — Drive e uploads: confirmar permissões, validações e limites.
6. POC-07 e POC-08 — implantação, abuso e quotas: testar os limites do ambiente de demonstração.
7. Somente após aprovações: implementar módulos progressivamente, começando por integração não privilegiada e leitura pública; autenticação permanece bloqueada até POC-02/03.

Não criar endpoints administrativos, painel autenticado, upload público ou escrita em produção antes das etapas e critérios correspondentes.

## 16. Decisões ainda abertas

- Transporte compatível com CORS/redirecionamento entre Vercel e Apps Script.
- Disponibilidade de KDF seguro, mantido e viável no runtime Apps Script.
- Geração de token criptograficamente seguro e estratégia de sessão no navegador.
- Viabilidade prática de upload binário com o limite aprovado.
- Comportamento das permissões do Drive na conta Google utilizada.
- Ferramenta de sincronização/versionamento do código Apps Script.
- Quotas efetivas da conta e tempos medidos.

As decisões abertas não alteram as regras de negócio aprovadas. Elas impedem a implementação das partes correspondentes até serem resolvidas.

## 17. Referências técnicas consultadas

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
