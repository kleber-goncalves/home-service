# Registro de Ocorrências — Conecta Local

> **Finalidade:** manter um histórico rastreável de bugs, erros técnicos, vulnerabilidades e incidentes do Conecta Local. Este arquivo está em um repositório público; registre somente informações avaliadas como seguras para divulgação.
>
> **Responsável pelo registro:** mantenedor do repositório.

## 1. Como usar este registro

Este documento complementa o [AI_CONTEXT.md](./AI_CONTEXT.md):

- O **AI_CONTEXT** descreve o estado atual, a arquitetura, as decisões e as instruções de continuidade.
- O **Registro de Ocorrências** preserva problemas encontrados, investigação, causa raiz, correções, validações e prevenção de recorrência.
- O **GitHub Actions** executa um validador estrutural para reduzir erros de preenchimento.

O registro é histórico. Uma ocorrência resolvida não deve ser apagada nem reescrita para esconder o problema original. Correções de informação devem preservar a rastreabilidade.

**Estado inicial:** nenhum bug, erro, vulnerabilidade ou incidente foi registrado neste documento na data de sua criação (2026-11-06). Isso não significa que o projeto esteja livre de problemas; significa apenas que ainda não há ocorrências documentadas.

## 2. Segurança em repositório público

O Conecta Local é acadêmico, mas o repositório é público. Nunca inclua neste arquivo:

- Senhas, tokens, chaves, cookies, credenciais ou valores de arquivos `.env`.
- Dados pessoais de clientes ou profissionais, como documentos, telefone privado, endereço residencial ou informações de conta.
- Identificadores ou URLs privadas que aumentem a superfície de ataque.
- Provas de conceito exploráveis, payloads, sequências de exploração ou detalhes que facilitem reproduzir uma vulnerabilidade ainda não corrigida.
- Logs, capturas de tela ou requisições que exponham informações anteriores.

Uma vulnerabilidade sensível não deve ser detalhada em um documento público antes da correção e da avaliação de divulgação. Utilize um canal privado apropriado. A revisão humana de segurança nunca é substituída pelo validador automatizado.

Ao suspeitar de exposição de credenciais, interrompa a divulgação e revogue/rotacione o segredo. Apagar o valor de um commit não invalida uma credencial que já foi exposta.

## 3. Categorias e identificadores

Cada ocorrência pública recebe um identificador permanente, único e sequencial dentro de sua categoria.

| Prefixo | Categoria | Quando usar |
|---|---|---|
| `BUG-0001` | Bug | Comportamento incorreto de uma funcionalidade ou regra do produto. |
| `ERR-0001` | Erro técnico | Falha de execução, integração, build, CI/CD, publicação ou infraestrutura. |
| `VULN-0001` | Vulnerabilidade | Fraqueza de segurança que pode afetar confidencialidade, integridade ou disponibilidade. |
| `INC-0001` | Incidente | Evento operacional relevante; pode agrupar bugs, erros ou vulnerabilidades relacionados. |

Regras dos IDs:

1. Cada prefixo possui sequência própria, iniciada em `0001`.
2. Um ID publicado nunca é reutilizado, mesmo após resolução, duplicidade ou reclassificação.
3. Ocorrências relacionadas devem referenciar seus IDs; evite registros duplicados para o mesmo problema.
4. Um incidente pode agrupar outros registros sem substituir seus históricos.
5. Achados sensíveis não devem ser detalhados aqui. Um identificador público de vulnerabilidade só deve ser criado quando existir um resumo sanitizado aprovado.

## 4. Status

| Status | Significado |
|---|---|
| `ABERTO` | Ocorrência registrada, ainda sem investigação concluída. |
| `EM INVESTIGAÇÃO` | Evidências e hipóteses estão sendo analisadas. |
| `EM CORREÇÃO` | A causa ou mitigação foi identificada e a mudança está em desenvolvimento. |
| `MITIGADO` | O impacto foi reduzido, mas há correção definitiva ou risco residual pendente. |
| `RESOLVIDO` | Correção aplicada e validada por evidências registradas. |
| `ACEITO (RISCO)` | Risco residual aceito conscientemente, com justificativa e data de revisão. |
| `NÃO REPRODUZIDO` | Não foi possível reproduzir com as evidências disponíveis; isso não prova inexistência do problema. |
| `DUPLICADO` | O registro aponta para outra ocorrência que representa o mesmo problema. |

**Critério de encerramento:** alteração de código, isoladamente, não comprova resolução. Para usar `RESOLVIDO`, registre o que foi validado, em qual ambiente e qual evidência sustenta a conclusão.

## 5. Prioridade e severidade

Para bugs, erros e incidentes, registre prioridade operacional:

- **Crítica:** indisponibilidade ampla, perda relevante de dados ou bloqueio de função essencial.
- **Alta:** impacto importante em uma função central ou grupo significativo de usuários.
- **Média:** impacto limitado, com alternativa ou contorno disponível.
- **Baixa:** impacto pequeno, visual ou localizado, sem bloqueio relevante.

Para vulnerabilidades, registre severidade (**Crítica, Alta, Média, Baixa ou Informativa**) somente após avaliação técnica. CVSS pode ser incluído quando calculado de forma justificada; não atribua nota por impressão.

Prioridade operacional e severidade de segurança são conceitos diferentes. Não use severidade de segurança para classificar um bug funcional que não represente vulnerabilidade.

## 6. Processo de registro

1. **Registrar:** descrever o comportamento observado sem antecipar a causa.
2. **Reproduzir:** indicar ambiente, condições e frequência, quando conhecido.
3. **Investigar:** separar evidências, hipóteses descartadas e causa raiz confirmada.
4. **Avaliar impacto:** indicar funcionalidades, usuários e ambientes afetados, sem expor dados pessoais.
5. **Corrigir ou mitigar:** apontar a mudança e as limitações que permanecerem.
6. **Validar:** relacionar testes automatizados e verificações manuais, distinguindo o que foi realmente executado.
7. **Prevenir:** registrar testes, monitoramento, documentação ou controles para reduzir recorrência.
8. **Atualizar o status:** registrar data, justificativa e referência da decisão.

### Regras específicas para segurança

- Não publicar detalhes de vulnerabilidade enquanto correção ou divulgação coordenada não estiver aprovada.
- Não realizar varreduras, exploração, força bruta, negação de serviço ou testes em contas e dados reais sem autorização explícita do responsável.
- Para estudos, prefira ambiente local, Preview autorizado e dados sintéticos.
- Não inclua evidências com nomes, e-mails, telefones, endereços, arquivos ou informações identificáveis.
- A classificação de um achado como público ou sensível exige avaliação humana. O validador não consegue julgar a segurança do texto.

## 7. Modelo para novas ocorrências

Copie o modelo e substitua os campos. Preserve todas as seções; quando algo ainda não for conhecido, escreva explicitamente `Pendente` ou `Não determinado`.

O exemplo abaixo usa um prefixo genérico para não ser interpretado como uma ocorrência real pelo validador:

### [PREFIXO]-0001 — Título breve

- **Status:** ABERTO
- **Data de registro:** YYYY-MM-DD
- **Data de descoberta:** YYYY-MM-DD ou Não determinada
- **Data de resolução:** —
- **Componente:** área ou módulo afetado
- **Prioridade:** Crítica, Alta, Média ou Baixa
- **Severidade:** Crítica, Alta, Média, Baixa, Informativa ou Não se aplica
- **Divulgação:** PÚBLICA — resumo sanitizado

#### Resumo

Descreva o problema objetivamente.

#### Impacto

- Comportamento esperado:
- Comportamento observado:
- Consequência:

#### Investigação e causa raiz

Registre evidências, hipóteses descartadas e causa confirmada ou pendente. Não apresente hipótese como causa comprovada.

#### Correção ou mitigação

Descreva a alteração aplicada ou o plano de ação.

#### Validação

Informe comandos/testes, ambiente, resultado e limitações. Não declare como executado algo que ainda não foi realizado.

#### Prevenção

Registre controles que reduzam a chance de recorrência.

#### Referências

Inclua links para PRs, commits, Actions, issues ou documentos relacionados. Não inclua links privados nem evidências sensíveis.

## 8. Histórico de ocorrências

Nenhuma ocorrência registrada até 2026-11-06.

