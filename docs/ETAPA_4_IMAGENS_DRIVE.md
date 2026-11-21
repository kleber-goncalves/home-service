# Etapa 4 — Imagens no Google Drive

> **Status:** implementação integrada em `dev` pela PR #26; CI pós-merge aprovada e validação manual principal no Preview concluída.
>
> **Branch de implementação:** `feat/drive-image-upload` (integrada em `dev` pela PR #26).
>
> **Escopo inicial:** imagens de serviços. Foto de perfil fica para uma segunda parte da etapa.
>
> **Ambiente:** Vercel Preview + Apps Script + Google Sheets e Drive de teste; somente dados e imagens sintéticas/licenciadas.

## 1. Objetivo

Permitir que um profissional autenticado envie, visualize e remova imagens dos próprios serviços. O Google Drive guarda o arquivo binário; a aba `IMAGENS` guarda os metadados e o relacionamento com o serviço.

A implementação deverá respeitar o limite já definido no MVP:

- até **5 imagens ativas por serviço**;
- no máximo **5.000.000 bytes por imagem**;
- formatos JPG/JPEG, PNG e WebP;
- posições de exibição de 1 a 5, sem duplicidade;
- somente o proprietário do serviço pode gerenciar as imagens.

A pasta raiz do Drive permanece privada. A permissão é aplicada individualmente a cada arquivo.

## 2. Restrição de plataforma identificada

O gateway atual aceita JSON de até 20 KiB e o Apps Script limita os payloads normais a 16 KiB. Portanto, não é possível colocar uma imagem em Base64 no contrato atual sem enfraquecer os limites das operações existentes.

O projeto Vercel está no plano **Hobby**. Em 20/11/2026, a Vercel anunciou uma opção beta de corpo de requisição de até 20 MiB, mas ela exige funções com 4 GB de memória. O plano Hobby não permite selecionar essa memória: seu limite é 2 GB. Não faremos upgrade nem alteraremos configurações de cobrança para esta etapa.

Referências oficiais:
- [Vercel — limite de 20 MiB em beta (20/11/2026)](https://vercel.com/changelog/vercel-functions-now-support-request-bodies-up-to-20mib)
- [Vercel — limites de Functions](https://vercel.com/docs/functions/limitations)
- [Vercel — configuração de memória e CPU](https://vercel.com/docs/functions/configuring-functions/memory)

## 3. Estratégia escolhida: upload retomável em blocos

Será usado o protocolo de upload retomável da API Google Drive, mas os blocos continuarão passando pela aplicação. O navegador **não** receberá token OAuth nem URI de sessão do Drive.

### 3.1. Tamanho dos blocos

- Bloco padrão: **1 MiB (1.048.576 bytes)**.
- 1 MiB é múltiplo de 256 KiB, conforme o requisito de blocos do protocolo retomável do Drive.
- O último bloco poderá ter o tamanho restante, inferior a 1 MiB.
- Um arquivo de 5.000.000 bytes será enviado em quatro blocos completos e um bloco final menor.
- O corpo recebido pela Function fica muito abaixo do limite padrão de 4,5 MB da Vercel. O JSON/Base64 entre Vercel e Apps Script terá limite específico para a ação de upload; as demais ações continuam limitadas a 16 KiB.

Referência oficial: [Google Drive API — fazer upload de dados](https://developers.google.com/workspace/drive/api/guides/manage-uploads).

### 3.2. Fluxo de confiança

```text
React (File/Blob.slice)
        |
        | POST /api/images — bloco binário de até 1 MiB
        | cookie HttpOnly + CSRF + mesma origem
        v
Vercel Function — gateway de upload
        |
        | HMAC servidor-servidor
        | Base64 apenas do bloco atual
        v
Google Apps Script
        |
        | valida sessão, papel, proprietário,
        | intenção, tamanho, MIME e offset
        | URI resumível guardado em Script Properties
        v
Google Drive API — upload resumível
        |
        | arquivo concluído e validado
        v
Google Sheets — aba IMAGENS
```

O gateway de upload será uma rota separada, por exemplo `POST /api/images`, para não aumentar os limites do endpoint JSON atual. Ela aceitará somente blocos binários e cabeçalhos estritamente definidos. A rota continua restrita a Preview e exige a origem permitida, cookie de sessão, CSRF e identificador de requisição.

## 4. Ciclo de vida proposto

### 4.1. Iniciar upload — `image.upload.start`

O navegador envia somente metadados pequenos: ID do serviço, tamanho esperado e MIME declarado.

O Apps Script deverá:
1. validar a sessão profissional;
2. localizar o serviço e confirmar que pertence ao profissional autenticado;
3. permitir somente serviços em estado compatível com edição (não permitir `suspended` ou `removed`);
4. verificar que o tamanho está entre 1 e 5.000.000 bytes;
5. aceitar somente `image/jpeg`, `image/png` ou `image/webp`;
6. contar as imagens ativas e reservar a primeira posição livre de 1 a 5;
7. impedir uploads concorrentes para o mesmo serviço na versão inicial;
8. iniciar uma sessão resumível do Drive com nome de arquivo gerado no backend e pasta privada configurada;
9. guardar a URI de upload, proprietário, serviço, tamanho, MIME, posição, offset confirmado e expiração em Script Properties;
10. devolver somente um `uploadId` aleatório à aplicação.

O nome original do arquivo não será usado como caminho ou nome confiável no Drive.

### 4.2. Enviar blocos — `image.upload.chunk`

Cada chamada envia:
- `uploadId`;
- início/fim do intervalo e tamanho total;
- Base64 do bloco atual, nunca do arquivo completo.

O Apps Script deverá:
- localizar a intenção no armazenamento privado;
- validar novamente a sessão e o proprietário;
- conferir expiração, tamanho e sequência do bloco;
- validar a assinatura do conteúdo no primeiro bloco (JPEG, PNG ou WebP);
- consultar/confirmar o offset atual da sessão resumível antes de avançar;
- encaminhar o bloco ao Drive usando a URI armazenada no servidor;
- atualizar o offset somente com base na resposta confirmada do Drive;
- retornar apenas o estado do progresso, sem expor URI ou credencial.

Blocos repetidos, fora de ordem, adulterados ou associados a outra conta devem ser recusados. Em caso de timeout, o servidor consulta o estado da sessão no Drive antes de aceitar a continuação; não presume que uma chamada com timeout falhou antes de gravar.

### 4.3. Concluir e registrar metadados

Somente após o Drive confirmar o upload completo, o Apps Script confere os metadados reais do arquivo (ID, tamanho, MIME e pasta pai), verifica que o arquivo pertence à intenção e registra uma linha em `IMAGENS`:

- `id_imagem`;
- `id_servico`;
- `id_arquivo_drive`;
- `tipo_mime`;
- `tamanho_bytes`;
- `ordem_exibicao`;
- `status = active`;
- `criado_em` e `atualizado_em`.

Para imagens de serviço, `id_profissional` fica vazio. Não criar novas colunas sem revisar a modelagem.

Se a gravação dos metadados falhar depois de o Drive concluir o upload, tentar restringir e colocar o arquivo incompleto/órfão na lixeira. Registrar uma falha sanitizada e não informar sucesso ao navegador. Como Drive e Sheets são serviços distintos, não prometer transação atômica.

### 4.4. Cancelar/expirar

O cancelamento remove a intenção de upload do armazenamento privado e libera a posição reservada. A URI de sessão não é exposta ao navegador. Sessões abandonadas expiram no Drive; intenções vencidas serão removidas por limpeza controlada no início de novos uploads ou por rotina explícita.

A versão inicial terá uma intenção ativa por serviço para simplificar reserva de posição e concorrência.

### 4.5. Listar e remover imagens

- `service.listMine` deverá retornar metadados de imagem dos serviços do próprio profissional, sem URI de upload.
- `public.services` só poderá retornar URL pública de imagens ativas quando o serviço estiver publicado e a conta estiver ativa.
- `image.remove` validará sessão e propriedade, restringirá o arquivo primeiro e depois marcará a linha como `removed`; a imagem removida não ocupa posição.
- O arquivo não será apagado fisicamente no fluxo normal de remoção; mantém-se privado e o histórico lógico permanece na planilha.

## 5. Regras de permissão

| Estado atual | Permissão esperada no Drive |
|---|---|
| Serviço `draft` | Privada |
| Serviço `published` + conta `active` | `ANYONE_WITH_LINK` / `VIEW` |
| Serviço `paused` | Privada |
| Serviço `suspended` | Privada |
| Serviço `removed` | Privada |
| Conta `suspended` ou `closed` | Privada |

A pasta raiz nunca será compartilhada publicamente. A permissão é individual por arquivo para evitar herança pública indesejada. O Drive pode impedir compartilhamento por link em contas administradas; isso deve ser testado antes de considerar a etapa concluída.

**Ordem segura das transições:**
- Ao pausar/remover um serviço, restringir as imagens antes de concluir a mudança de estado no Sheets. Se a planilha falhar depois, as imagens podem ficar privadas antes do estado ser atualizado; isso é uma falha funcional, mas preserva confidencialidade.
- Ao publicar, atualizar o estado do serviço e só então tentar conceder acesso público aos arquivos. Se a concessão falhar, a imagem permanece privada e a operação informa falha parcial; não expor arquivo sem estado elegível.
- Uma falha de permissão não pode ser tratada como sucesso. O sistema deve manter estado de erro e permitir nova sincronização.

Referência oficial: [Apps Script Drive Access](https://developers.google.com/apps-script/reference/drive/access) e [Apps Script File.setSharing](https://developers.google.com/apps-script/reference/drive/file#setSharing(Access,Permission)).

## 6. Configuração externa necessária

Antes do teste real, verificar no projeto Apps Script já existente:

1. Criar uma pasta raiz exclusiva para o Conecta Local e mantê-la privada.
2. Guardar o ID dessa pasta em uma nova Script Property, por exemplo `CONECTA_LOCAL_DRIVE_FOLDER_ID`.
3. Verificar o manifesto `appsscript.json` existente. Se houver escopos explícitos, acrescentar apenas os escopos de Drive e UrlFetch necessários, preservando os escopos e as configurações existentes.
4. Autorizar o novo escopo de Drive na conta que executa o Web App.
5. Preservar o ID/URL da implantação existente, execução como proprietário, acesso atual, Spreadsheet ID e segredo HMAC.
6. Publicar uma nova versão da implantação existente somente depois da validação do código.

Não criar outro projeto Apps Script, outra planilha ou outra implantação para esta etapa.

## 7. Interface — primeira entrega

O primeiro ciclo será restrito a imagens de serviços existentes:

- seleção de até cinco arquivos;
- validação de tamanho e formato antes do envio para orientar o usuário;
- pré-visualização local;
- envio sequencial com progresso por bloco;
- cancelamento seguro;
- lista de imagens já persistidas;
- remoção lógica com confirmação;
- mensagens claras de erro e sucesso.

O frontend não é autoridade de validação. O backend repete todas as verificações.

Para a homepage pública, a primeira versão usará a primeira imagem válida do serviço como imagem principal; sem imagem cadastrada, mantém-se a fotografia ilustrativa atual. Uma galeria detalhada e imagem de perfil ficam para uma etapa posterior.

## 8. Testes e critérios de aceitação

### Automatizados

- Aceitar somente os três tipos de imagem definidos.
- Recusar tamanho zero, acima de 5.000.000 bytes e MIME não permitido.
- Recusar assinatura binária que não corresponda ao MIME declarado.
- Recusar serviço inexistente, de outro proprietário, suspenso ou removido.
- Impedir mais de cinco imagens ativas e posições duplicadas.
- Reservar/liberar posição corretamente; uma intenção expirada não pode ser finalizada.
- Recusar bloco fora de sequência, repetido ou com total/tamanho alterado.
- Reconciliar timeout com o offset confirmado pelo Drive.
- Confirmar criação de metadados somente após upload completo.
- Recusar remoção por outro proprietário e garantir restrição de acesso antes do status `removed`.
- Recusar upload no ambiente Production.
- Manter testes das operações existentes dentro de seus limites originais (20 KiB/16 KiB).

### Validação manual real — Preview + Apps Script + Sheets + Drive

Os cenários abaixo foram executados no ambiente Preview, com confirmação operacional dos resultados nas telas da aplicação, nas abas `IMAGENS` e `AUDITORIA` e no Google Drive:

- [x] Envio real de duas imagens para o mesmo serviço; os uploads concluíram e os arquivos foram criados no Drive, com metadados em `IMAGENS`.
- [x] Remoção lógica de uma imagem; ela deixou de aparecer em **Meus serviços**, recebeu status `removed` na aba `IMAGENS` e gerou evento correspondente em `AUDITORIA`.
- [x] Restrição do arquivo removido no Drive; o acesso geral ficou como `Restrito`.
- [x] Limite de cinco imagens ativas por serviço; com uma imagem ativa, foi possível adicionar mais quatro. A tentativa de adicionar uma sexta imagem foi bloqueada.
- [x] Consistência do limite e dos registros no Drive, na aba `IMAGENS` e na aba `AUDITORIA`.
- [x] Serviço publicado: imagens ativas com acesso por link.
- [x] Serviço pausado: imagens ativas com acesso geral `Restrito`.
- [x] Serviço publicado novamente: acesso por link restaurado para as imagens ativas.

Os testes manuais acima validam o caminho funcional principal da integração real. Não registrar como executados os cenários complementares que não foram confirmados nesta sessão, como repetição manual individual com PNG/WebP, falha forçada de gravação no Sheets ou interrupção deliberada de blocos.

## 9. Fora do primeiro ciclo

- Foto de perfil profissional.
- Edição de ordem por arrastar e soltar.
- Galeria completa na página de detalhes.
- Conversão, compressão e otimização de imagens no servidor.
- Painel administrativo de mídia.
- Imagens anexadas a denúncias.
- Operação com dados reais ou em Production.

## 10. Estado e próxima ação

**Status em 20/11/2026:** Etapa 4 implementada, validada funcionalmente no ambiente Preview e integrada exclusivamente em `dev` pela PR #26. A PR foi mesclada em 20/11/2026 (horário local), pelo merge commit `6dab42ba291008a20a490542dcaf28c6c439c7d2`. A CI pós-merge [Validate Home Service #44850407547](https://github.com/kleber-goncalves/home-service/actions/runs/44850407547) concluiu **SUCCESS** sobre esse commit. O workflow [AI Context — Synchronize #44850407640](https://github.com/kleber-goncalves/home-service/actions/runs/44850407640) também concluiu **SUCCESS**. Nenhuma alteração foi feita em `main` ou em Production.

- **Arquitetura:** upload retomável em blocos binários de 1 MiB pela rota dedicada `/api/images`.
- **Backend Apps Script:** ações de iniciar, enviar, consultar status, cancelar e remover; URI da sessão de Drive guardada em Script Properties; metadados em `IMAGENS`; permissões individuais sincronizadas conforme o estado do serviço.
- **Gateway:** rota binária separada com mesma origem, cookie de sessão HttpOnly, CSRF, HMAC servidor-servidor e limite de stream de 1 MiB; endpoints JSON existentes preservam seus limites.
- **Interface:** seleção de imagens de serviços, prévias locais, progresso, cancelamento, recuperação e remoção; primeira imagem ativa/publicável usada na vitrine.
- **Limites funcionais:** até 5 imagens ativas por serviço; JPG/JPEG, PNG ou WebP; no máximo 5.000.000 bytes por arquivo; somente o proprietário do serviço gerencia as imagens.
- **Correção importante:** a validação da URI de upload retomável do Drive aceita parâmetros de consulta adicionais retornados pelo Google (por exemplo, `fields` e `session_crd`), sem abrir mão da validação de HTTPS, host, caminho e `upload_id`.
- **CI pós-merge:** #44850407547 — **SUCCESS**. Foram aprovados auditoria de dependências, POC-01/02/03/04, autorização/propriedade, testes do gateway e cliente de imagens, LOO, validação do registro de ocorrências, ESLint e build.
- **Preview de `dev`:** deployment READY `dpl_Bqwfwchf4vpH1LKLBFte2Y1yav9Y`, commit `6dab42ba291008a20a490542dcaf28c6c439c7d2`; URL da branch: https://home-service-git-dev-kleber-goncalves-s-projects.vercel.app.
- **Apps Script e Drive de teste:** pasta raiz privada configurada; Script Property `CONECTA_LOCAL_DRIVE_FOLDER_ID` definida; escopos Drive e autorização concluídos; código sincronizado e nova versão publicada na implantação Web App existente.
- **Validação manual confirmada pelo responsável no Preview:** dois uploads reais no mesmo serviço; remoção lógica de uma imagem com status `removed` em `IMAGENS`, evento em `AUDITORIA` e arquivo com acesso geral `Restrito`; limite de cinco imagens ativas e bloqueio da sexta; serviço publicado com acesso por link, pausado com imagens restritas e republicado com acesso por link restaurado. O responsável também confirmou a persistência dos resultados no Google Drive e nas abas correspondentes do Sheets.
- **Limites da validação manual:** não registrar como executados nesta rodada testes manuais individuais de todos os formatos, interrupção deliberada de blocos ou falha forçada entre Drive e Sheets. Os testes automatizados aplicáveis permanecem na suíte; esses cenários adicionais não foram reportados como ensaios manuais concluídos.

**Estado final:** a Etapa 4 está concluída para o escopo de imagens de serviços no Preview de desenvolvimento. A funcionalidade permanece fora de Production por decisão do projeto. Foto de perfil, galeria avançada, ordenação por arrastar e soltar, compressão/otimização, painel administrativo de mídia e uso de dados reais continuam fora deste primeiro ciclo.

**Próxima etapa do roadmap:** seguir para a Etapa 5 — catálogo público, navegação e apresentação de imagens, conforme `docs/PLANO_CATALOGO_PUBLICO_E_NAVEGACAO.md`. A pesquisa acadêmica e o acabamento da apresentação passam a compor a Etapa 6 e continuam dependendo da orientação do professor/orientador antes da coleta com participantes. Não promover o Preview nem configurar backend em Production sem decisão explícita e revisão específica de segurança.


## 11. Referências técnicas oficiais

- [Google Drive API — upload retomável e blocos de 256 KiB](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Apps Script — Drive Service](https://developers.google.com/apps-script/reference/drive)
- [Apps Script — quotas e limites de UrlFetch/Properties](https://developers.google.com/apps-script/guides/services/quotas)
- [Vercel — request body limits](https://vercel.com/docs/functions/limitations)
