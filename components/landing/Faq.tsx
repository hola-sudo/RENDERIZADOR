import React, { useState } from 'react';
import { Container, Eyebrow, SectionTitle } from './primitives';
import { faq } from './content';

const Faq: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="seccion-faq" className="pt-24 sm:pt-32">
      <Container>
        <Eyebrow>{faq.eyebrow}</Eyebrow>

        <div className="mt-7 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <SectionTitle top={faq.titleTop} bottom={faq.titleBottom} />

          <div className="rounded-5xl bg-sand px-7 py-3 sm:px-10">
            {faq.items.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q} className="border-b border-line last:border-0">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="font-serif text-xl text-ink sm:text-2xl">{item.q}</span>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/25 text-ink transition duration-300 ${
                        isOpen ? 'rotate-45' : ''
                      }`}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                        <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <p className="max-w-xl pb-7 text-[14px] leading-relaxed text-ink-soft">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Faq;
