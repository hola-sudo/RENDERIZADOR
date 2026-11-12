import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowButton, Container, PillButton, SectionTitle } from './primitives';
import { brand, finalCta, footer } from './content';

const Footer: React.FC = () => (
  <footer className="pb-6 pt-24 sm:pt-32">
    <Container>
      {/* Llamada final, en bloque oscuro */}
      <div className="rounded-5xl bg-ink px-7 py-14 text-center sm:px-12 sm:py-20">
        <SectionTitle onDark top={finalCta.titleTop} bottom={finalCta.titleBottom} className="mx-auto max-w-3xl" />
        <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-bone/60">
          {finalCta.description}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-2">
          <PillButton to="/login" variant="light">{finalCta.primary}</PillButton>
          <ArrowButton to="/login" variant="light" label={finalCta.primary} />
          <Link
            to="/login"
            className="ml-3 text-sm font-medium text-bone/60 underline decoration-bone/25 underline-offset-4 transition hover:text-bone"
          >
            {finalCta.secondary}
          </Link>
        </div>
      </div>

      {/* Pie */}
      <div className="mt-6 rounded-5xl bg-sand px-7 py-10 sm:px-10">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink font-display text-sm font-extrabold text-bone">
                {brand.monogram}
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-ink">
                {brand.name}
                <span className="font-normal text-ink-mute"> {brand.nameAccent}</span>
              </span>
            </div>
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-ink-soft">
              {footer.description}
            </p>
            <a
              href={`mailto:${brand.email}`}
              className="mt-5 inline-block text-[14px] font-medium text-ink underline decoration-line underline-offset-4"
            >
              {brand.email}
            </a>
          </div>

          {footer.columns.map((column) => (
            <div key={column.title}>
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-mute">
                {column.title}
              </h4>
              <ul className="mt-5 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    {'internal' in link && link.internal ? (
                      <Link to={link.href} className="text-[14px] text-ink-soft transition hover:text-ink">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} className="text-[14px] text-ink-soft transition hover:text-ink">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-ink-mute">
            © {new Date().getFullYear()} {brand.name} {brand.nameAccent}. Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            {footer.legal.map((label) => (
              <span key={label} className="text-[13px] text-ink-mute">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Container>
  </footer>
);

export default Footer;
