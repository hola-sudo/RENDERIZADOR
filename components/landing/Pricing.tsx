import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Eyebrow, SectionTitle } from './primitives';
import { pricing } from './content';

const Check: React.FC<{ onDark?: boolean }> = ({ onDark }) => (
  <svg
    className={`mt-0.5 h-4 w-4 shrink-0 ${onDark ? 'text-bone/70' : 'text-ink'}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const ctaClass = (dark: boolean) =>
  `mt-7 block rounded-full px-6 py-4 text-center text-[12px] font-semibold uppercase tracking-[0.12em] transition duration-200 ${
    dark ? 'bg-bone text-ink hover:bg-white' : 'bg-ink text-bone hover:bg-ink-soft'
  }`;

const Pricing: React.FC = () => {
  const [annual, setAnnual] = useState(false);
  const format = (n: number) => `$${n.toLocaleString('es-MX')}`;

  return (
    <section id="seccion-precios" className="pt-24 sm:pt-32">
      <Container>
        <Eyebrow>{pricing.eyebrow}</Eyebrow>

        <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionTitle top={pricing.titleTop} bottom={pricing.titleBottom} />
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              {pricing.description}
            </p>
          </div>

          {/* Mensual / anual */}
          <div className="flex shrink-0 items-center gap-1 self-start rounded-full bg-sand p-1.5 lg:self-auto">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] transition ${
                !annual ? 'bg-ink text-bone' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] transition ${
                annual ? 'bg-ink text-bone' : 'text-ink-soft hover:text-ink'
              }`}
            >
              Anual
              <span className={`ml-2 normal-case tracking-normal ${annual ? 'text-bone/60' : 'text-ink-mute'}`}>
                {pricing.annualDiscountLabel}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {pricing.plans.map((plan) => {
            const dark = plan.featured;
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-5xl p-8 sm:p-9 ${dark ? 'bg-ink' : 'bg-sand'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3
                    className={`font-serif text-3xl font-normal tracking-tight ${
                      dark ? 'text-bone' : 'text-ink'
                    }`}
                  >
                    {plan.name}
                  </h3>
                  {dark && (
                    <span className="rounded-full bg-bone/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-bone">
                      Más elegido
                    </span>
                  )}
                </div>

                <p className={`mt-3 text-[14px] leading-relaxed ${dark ? 'text-bone/60' : 'text-ink-mute'}`}>
                  {plan.summary}
                </p>

                <div className="mt-8 flex items-end gap-2">
                  <span
                    className={`font-display text-5xl font-bold tracking-[-0.03em] ${
                      dark ? 'text-bone' : 'text-ink'
                    }`}
                  >
                    {format(annual ? plan.annual : plan.monthly)}
                  </span>
                  <span className={`pb-2 text-[13px] ${dark ? 'text-bone/55' : 'text-ink-mute'}`}>
                    {pricing.currency} / mes
                  </span>
                </div>
                {annual && (
                  <p className={`mt-1 text-[12px] ${dark ? 'text-bone/45' : 'text-ink-mute'}`}>
                    Facturado anualmente
                  </p>
                )}

                {'href' in plan && plan.href ? (
                  <a href={plan.href} className={ctaClass(dark)}>
                    {plan.cta}
                  </a>
                ) : (
                  <Link to="/login" className={ctaClass(dark)}>
                    {plan.cta}
                  </Link>
                )}

                <ul className={`mt-8 border-t pt-6 ${dark ? 'border-bone/15' : 'border-line'}`}>
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-start gap-3 py-2.5 text-[14px] ${
                        dark ? 'text-bone/80' : 'text-ink-soft'
                      }`}
                    >
                      <Check onDark={dark} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-mute">{pricing.note}</p>
      </Container>
    </section>
  );
};

export default Pricing;
