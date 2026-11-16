# LOO — orientação a objetos no back-end

## Objetivo acadêmico

Este documento registra a implementação de Linguagem Orientada a Objetos (LOO) em JavaScript no back-end Node.js da Vercel Function do Conecta Local.

A implementação demonstra classes, objetos, atributos, métodos e herança utilizando entidades que já fazem parte dos fluxos existentes do protótipo. Não cria novas telas, módulos ou funcionalidades de produto.

## Onde está implementado

- `server/domain-entities.js`: declara as classes de domínio.
- `server/app-gateway.js`: instancia e utiliza os objetos durante o cadastro do profissional e as operações de serviço.
- `tests/loo/domain-entities.test.js`: contém testes automatizados das classes e métodos.

O caminho executado é:

`React → /api/app → Vercel Function (Node.js) → Apps Script → Google Sheets`

As classes ficam na camada Node.js do back-end, antes da chamada autenticada ao Apps Script. O Apps Script continua responsável pelas validações finais, autorização, regras de negócio persistentes e gravação na planilha.

## Classes, atributos e métodos

| Classe | Atributos principais | Métodos | Responsabilidade |
|---|---|---|---|
| `Usuario` | `email` | `toAccountPayload()` | Representar os dados básicos da conta e organizar o payload técnico da conta. |
| `Profissional` | herda `email`; possui `fullName`, `publicName`, `whatsapp`, `presentation`, `cityId` | `toRegistrationPayload()` | Representar o perfil profissional associado à conta e preparar os dados de cadastro. |
| `Servico` | `serviceId`, `categoryId`, `title`, `description`, `status` | `toCreatePayload()`, `publicar()`, `pausar()`, `toStatusPayload()` | Representar um serviço, organizar os dados de criação e expressar as operações de publicação e pausa. |

## Relação entre as classes

`Profissional` estende `Usuario`: um profissional possui os dados básicos de uma conta e acrescenta os dados específicos do perfil profissional.

`Servico` representa um serviço publicado por um profissional. O vínculo definitivo entre o serviço e o profissional autenticado continua sendo determinado pelo Apps Script a partir da sessão validada, nunca por um identificador de proprietário enviado pelo navegador.

```text
Usuario
  └── Profissional

Profissional
  └── possui serviços (relação de domínio)
       └── Servico
```

## Como os objetos são utilizados no código

### Cadastro profissional

Quando a ação `auth.register` chega ao gateway, o back-end cria um objeto `Profissional` com os dados recebidos. Esse objeto herda o atributo `email` e o método `toAccountPayload()` de `Usuario`. O método `toRegistrationPayload()` organiza os dados no formato esperado pelo Apps Script.

O hash Argon2id, o salt, o algoritmo e o código demonstrativo são fornecidos ao método como dados técnicos. A senha em texto puro não é armazenada como atributo da classe nem enviada ao Apps Script.

### Criação de serviço

Na ação `service.create`, o gateway instancia `Servico` com categoria, título e descrição. O método `toCreatePayload()` retorna somente os campos necessários à operação.

### Publicação e pausa

Na ação `service.setStatus`, o gateway instancia `Servico` com o identificador recebido e chama `publicar()` ou `pausar()`. Depois, `toStatusPayload()` organiza o identificador e o novo estado para envio ao Apps Script.

O Apps Script permanece como autoridade final: verifica a sessão, confirma que o serviço pertence ao profissional autenticado, aceita somente os estados permitidos e grava a alteração com auditoria. Os métodos das classes no Node.js não substituem essas verificações.

## Exemplo didático

```javascript
const profissional = new Profissional({
    email: "ana@example.test",
    fullName: "Ana Silva",
    publicName: "Ana Serviços",
    whatsapp: "34999999999",
    presentation: "Perfil fictício para demonstração.",
    cityId: "cidade-ficticia-01",
});

const servico = new Servico({
    serviceId: "servico-ficticio-01",
    title: "Instalação de chuveiro",
});

servico.pausar();

console.log(profissional.email); // atributo herdado de Usuario
console.log(servico.status);     // "paused"
```

Os valores do exemplo são fictícios e servem somente para explicar o conceito.

## Evidências e validação

O arquivo `tests/loo/domain-entities.test.js` verifica:

1. atributos e método da classe `Usuario`;
2. herança de `Profissional` a partir de `Usuario`;
3. conversão dos atributos do profissional para o contrato do Apps Script;
4. montagem do payload de criação de `Servico`;
5. comportamento do método `pausar()`;
6. comportamento do método `publicar()`.

O comando de execução é `npm run test:loo`.

## Limites da implementação

- As classes organizam os dados e operações de domínio na camada Node.js.
- As regras finais de validação, autenticação, autorização, persistência e auditoria permanecem no Apps Script.
- A implementação não torna o projeto uma aplicação de produção e não altera o escopo funcional do protótipo acadêmico.
- Os dados de demonstração devem continuar fictícios.
