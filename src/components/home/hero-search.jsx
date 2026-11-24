import { ArrowRight, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HeroSearch({ query, city, onQueryChange, onCityChange, onSubmit, availableCities = [] }) {
    return (
        <section className="hero-section" id="inicio" aria-labelledby="hero-title">
            <img
                className="hero-decoration hero-decoration--vacuum"
                src="/M%C3%A3o%20segurando%20aspirador%20azul.png"
                alt=""
                aria-hidden="true"
                width={1359}
                height={1158}
                loading="eager"
                decoding="async"
                draggable={false}
            />
            <img
                className="hero-decoration hero-decoration--dish"
                src="/M%C3%A3os%20Limpando%20Prato%20com%20Esponja%20Verde.png"
                alt=""
                aria-hidden="true"
                width={1230}
                height={1278}
                loading="eager"
                decoding="async"
                draggable={false}
            />
            <div className="hero-inner mx-auto grid w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="hero-content">
                 
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
                                <Input type="text" name="location" list="service-city-options" placeholder="Sua cidade ou região" value={city} onChange={(event) => onCityChange(event.target.value)} aria-label="Cidade ou região" />
                                <datalist id="service-city-options">
                                    {availableCities.map((item) => (
                                        <option key={item.id} value={item.name + " - " + item.state} />
                                    ))}
                                </datalist>
                            </span>
                        </label>
                        <Button type="submit" size="lg" className="search-submit">Buscar <ArrowRight size={17} aria-hidden="true" /></Button>
                    </form>
                    <p className="search-hint">A busca considera os municípios de atendimento vinculados a cada serviço.</p>
                </div>
               
            </div>
        </section>
    );
}
