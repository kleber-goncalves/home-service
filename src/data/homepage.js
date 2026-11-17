import { Brush, Droplets, Hammer, Leaf, Paintbrush, Zap } from "lucide-react";

export const categories = [
    { id: "eletricista", label: "Eletricista", icon: Zap },
    { id: "encanador", label: "Encanador", icon: Droplets },
    { id: "diarista", label: "Diarista", icon: Brush },
    { id: "pintor", label: "Pintor", icon: Paintbrush },
    { id: "jardinagem", label: "Jardinagem", icon: Leaf },
    { id: "montagem", label: "Montagem", icon: Hammer },
];

export const professionals = [
    {
        id: "perfil-eletricista", category: "Eletricista", title: "Instalações elétricas",
        description: "Exemplo de apresentação de um serviço de elétrica residencial.",
        image: "https://images.pexels.com/photos/27928762/pexels-photo-27928762.jpeg?auto=compress&cs=tinysrgb&w=1200",
        imageAlt: "Profissional trabalhando em um painel elétrico residencial.",
    },
    {
        id: "perfil-encanador", category: "Encanador", title: "Reparos hidráulicos",
        description: "Exemplo de apresentação de manutenção e reparos hidráulicos.",
        image: "https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=1000",
        imageAlt: "Encanador trabalhando em uma tubulação com uma ferramenta.",
    },
    {
        id: "perfil-diarista", category: "Diarista", title: "Limpeza residencial",
        description: "Exemplo de apresentação de serviços de limpeza para o lar.",
        image: "https://images.pexels.com/photos/27176671/pexels-photo-27176671.jpeg?auto=compress&cs=tinysrgb&w=1200",
        imageAlt: "Pessoa realizando a limpeza de uma sala de estar.",
    },
    {
        id: "perfil-pintor", category: "Pintor", title: "Pintura de ambientes",
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
    { question: "O Conecta Local já está recebendo pedidos?", answer: "Ainda não. Esta página apresenta a proposta e a experiência visual do produto. O cadastro de profissionais, a busca conectada a dados reais e o contato pela plataforma serão desenvolvidos em etapas posteriores." },
    { question: "Como vou encontrar um profissional?", answer: "A proposta é pesquisar pelo serviço e pela região, conhecer as informações públicas do perfil e entrar em contato diretamente com o profissional. Nesta demonstração, a busca filtra apenas exemplos locais." },
    { question: "Preciso criar uma conta para pesquisar?", answer: "A experiência pública planejada permitirá pesquisar e conhecer serviços sem criar uma conta. A autenticação será necessária para profissionais que forem cadastrar e administrar seus próprios serviços." },
    { question: "Sou profissional. Como posso participar?", answer: "O cadastro e o painel do profissional ainda não estão disponíveis. A página apresenta a proposta de divulgação; o fluxo para criar um perfil será implementado em uma próxima etapa." },
    { question: "O Conecta Local terá pagamentos ou agendamentos?", answer: "O escopo inicial é uma vitrine regional para descobrir serviços e falar diretamente com quem os oferece. Pagamentos e agendamentos dentro da plataforma não fazem parte da primeira versão planejada." },
];
