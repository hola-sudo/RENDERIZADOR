import React from 'react';
import { ArrowButton, Container, Eyebrow, Media, PillButton, SectionTitle } from './primitives';
import { hero } from './content';

const Hero: React.FC = () => (
  <section className="pt-32 sm:pt-40">
    <Container>
      <Eyebrow>{hero.eyebrow}</Eyebrow>

      <div className="mt-7 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-end">
        <SectionTitle as="h1" top={hero.titleTop} bottom={hero.titleBottom} />

        <div className="lg:pb-3">
          <p className="max-w-xl text-[15px] leading-relaxed text-ink-soft sm:text-base">
            {hero.description}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <PillButton to="/login">{hero.primaryCta}</PillButton>
            <ArrowButton to="/login" label={hero.primaryCta} />
            <a
              href="#seccion-precios"
              className="ml-2 text-sm font-medium text-ink-soft underline decoration-line underline-offset-4 transition hover:text-ink"
            >
              {hero.secondaryCta}
            </a>
          </div>
        </div>
      </div>

      {/* Imagen principal */}
      <div className="mt-10 overflow-hidden rounded-5xl bg-sand">
        <Media
          src={hero.image}
          alt={hero.imageLabel}
          label={hero.imageLabel}
          className="h-[300px] w-full sm:h-[440px] lg:h-[560px]"
        />
      </div>

      {/* Indicadores */}
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-4xl bg-line lg:grid-cols-4">
        {hero.stats.map((stat) => (
          <div key={stat.label} className="bg-bone px-6 py-7">
            <dt className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              {stat.value}
            </dt>
            <dd className="mt-2 text-[13px] leading-snug text-ink-mute">{stat.label}</dd>
          </div>
        ))}
      </dl>
    </Container>
  </section>
);

export default Hero;
