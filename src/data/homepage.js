import { Brush, Droplets, Hammer, Leaf, Paintbrush, Zap } from "lucide-react";

export const categories = [
    { id: "reformas", label: "Reformas", icon: Hammer },
    { id: "eletrica", label: "Elétrica", icon: Zap },
    { id: "hidraulica", label: "Hidráulica", icon: Droplets },
    { id: "pintura", label: "Pintura", icon: Paintbrush },
    { id: "limpeza", label: "Limpeza", icon: Brush },
    { id: "jardinagem", label: "Jardinagem", icon: Leaf },
];

export const professionals = [
    {
        id: "perfil-eletricista", category: "Elétrica", title: "Instalações elétricas",
        description: "Exemplo de apresentação de um serviço de elétrica residencial.",
        image: "https://images.pexels.com/photos/27928762/pexels-photo-27928762.jpeg?auto=compress&cs=tinysrgb&w=1200",
        imageAlt: "Profissional trabalhando em um painel elétrico residencial.",
    },
    {
        id: "perfil-encanador", category: "Hidráulica", title: "Reparos hidráulicos",
        description: "Exemplo de apresentação de manutenção e reparos hidráulicos.",
        image: "https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=1000",
        imageAlt: "Encanador trabalhando em uma tubulação com uma ferramenta.",
    },
    {
        id: "perfil-diarista", category: "Limpeza", title: "Limpeza residencial",
        description: "Exemplo de apresentação de serviços de limpeza para o lar.",
        image: "https://images.pexels.com/photos/27176671/pexels-photo-27176671.jpeg?auto=compress&cs=tinysrgb&w=1200",
        imageAlt: "Pessoa realizando a limpeza de uma sala de estar.",
    },
    {
        id: "perfil-pintor", category: "Pintura", title: "Pintura de ambientes",
        description: "Exemplo de apresentação de serviços de pintura residencial.",
        image: "https://images.pexels.com/photos/6474471/pexels-photo-6474471.jpeg?auto=compress&cs=tinysrgb&w=1200",
        imageAlt: "Pintor aplicando tinta em uma parede interna.",
    },
    {
        id: "perfil-jardinagem", category: "Jardinagem", title: "Cuidados com jardins",
        description: "Exemplo de apresentação de serviços de jardinagem.",
        image: "https://images.pexels.com/photos/27176054/pexels-photo-27176054.jpeg?auto=compress&cs=tinysrgb&w=1200",
        imageAlt: "Jardineira cuidando de mudas em um canteiro.",
    },
];

export const popularServices = [
    "Instalações e pequenos reparos elétricos",
    "Manutenção de torneiras e encanamentos",
    "Limpeza residencial",
    "Pintura de paredes e ambientes",
    "Cuidados com jardins e áreas externas",
    "Montagem de móveis",
];

export const frequentlyAskedQuestions = [
    {
        question: "O que é o Conecta Local?",
        answer: "É um projeto acadêmico em versão demonstrativa que organiza a apresentação de serviços por categoria e região, aproximando pessoas que procuram um serviço de profissionais que o oferecem."
    },
    {
        question: "Preciso criar uma conta para pesquisar serviços?",
        answer: "Não. A consulta ao catálogo público, às categorias e aos detalhes dos serviços publicados pode ser feita sem criar uma conta."
    },
    {
        question: "Como entro em contato com um profissional?",
        answer: "Abra os detalhes de um serviço publicado. Quando o profissional disponibilizar um WhatsApp público, a página apresenta a opção de contato direto. Os cartões fictícios não possuem contato real."
    },
    {
        question: "Os serviços de exemplo são profissionais reais?",
        answer: "Não. Os cartões identificados como exemplos ilustrativos são fictícios e usam imagens de referência para demonstrar a interface. Eles não representam cadastros, disponibilidade, preços ou recomendações."
    },
    {
        question: "Como um profissional pode cadastrar e administrar serviços?",
        answer: "O projeto possui uma área demonstrativa para cadastro e gerenciamento de serviços. Os fluxos ainda fazem parte da validação acadêmica e não devem ser considerados uma plataforma comercial aberta ao público."
    },
    {
        question: "O Conecta Local realiza pagamentos ou agendamentos?",
        answer: "Não. O escopo atual é apresentar serviços e permitir contato direto pelo canal público informado pelo profissional. Pagamentos e agendamentos dentro da plataforma não estão implementados."
    },
];
