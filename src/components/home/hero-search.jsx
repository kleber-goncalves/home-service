import { ArrowRight, MapPin, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HeroSearch({ query, city, onQueryChange, onCityChange, onSubmit }) {
    return (
        <section className="hero-section" id="inicio" aria-labelledby="hero-title">
            <div className="hero-inner mx-auto grid w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="hero-content">
                    <span className="eyebrow-pill"><Sparkles size={15} aria-hidden="true" />Conectando pessoas e serviços</span>
                    <h1 id="hero-title">Encontre serviços <span>perto de você.</span></h1>
                    <p className="hero-description">Descubra profissionais da sua região, conheça o que eles oferecem e encontre o caminho para entrar em contato.</p>
                    <form className="hero-search-form" role="search" onSubmit={onSubmit}>
                        <label className="search-field">
                            <Search size={19} aria-hidden="true" />
                            <span className="search-field-copy">
                                <span>Qual serviço você precisa?</span>
                                <Input type="search" name="service" placeholder="Ex.: eletricista, limpeza..." value={query} onChange={(event) => onQueryChange(event.target.value)} aria-label="Serviço que você procura" />
                            </span>
                        </label>
                        <span className="search-divider" aria-hidden="true" />
                        <label className="search-field search-field--location">
                            <MapPin size={19} aria-hidden="true" />
                            <span className="search-field-copy">
                                <span>Onde você precisa?</span>
                                <Input type="text" name="location" placeholder="Sua cidade ou região" value={city} onChange={(event) => onCityChange(event.target.value)} aria-label="Cidade ou região" />
                            </span>
                        </label>
                        <Button type="submit" size="lg" className="search-submit">Buscar <ArrowRight size={17} aria-hidden="true" /></Button>
                    </form>
                    <p className="search-hint">Nesta prévia, a busca usa perfis ilustrativos. A consulta por cidade ainda não está conectada.</p>
                </div>
                <div className="hero-visual">
                    <img src="https://images.pexels.com/photos/27928762/pexels-photo-27928762.jpeg?auto=compress&cs=tinysrgb&w=1600" alt="Profissional trabalhando em um painel elétrico residencial." fetchPriority="high" loading="eager" />
                    <div className="hero-photo-caption">
                        <span className="hero-caption-icon" aria-hidden="true"><Search size={17} /></span>
                        <span><strong>Descubra novas possibilidades</strong><small>Serviços para diferentes necessidades do dia a dia</small></span>
                    </div>
                    <span className="hero-photo-note">Imagem ilustrativa</span>
                </div>
            </div>
        </section>
    );
}
