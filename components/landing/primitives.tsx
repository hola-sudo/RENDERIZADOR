import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/* Píldora de etiqueta: "• Sección" */
export const Eyebrow: React.FC<{ children: React.ReactNode; onDark?: boolean }> = ({
  children,
  onDark = false,
}) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium ${
      onDark ? 'bg-white/10 text-bone' : 'bg-white text-ink'
    }`}
  >
    <span className={`h-1.5 w-1.5 rounded-full ${onDark ? 'bg-bone' : 'bg-ink'}`} />
    {children}
  </span>
);

/* Título de sección a dos tonos: primera línea en tinta, segunda en gris */
export const SectionTitle: React.FC<{
  top: string;
  bottom: string;
  as?: 'h1' | 'h2';
  className?: string;
  onDark?: boolean;
}> = ({ top, bottom, as = 'h2', className = '', onDark = false }) => {
  const Tag = as;
  return (
    <Tag
      className={`font-display font-bold tracking-[-0.03em] leading-[1.02] ${
        as === 'h1'
          ? 'text-[2.6rem] sm:text-6xl lg:text-[4.4rem]'
          : 'text-[2.1rem] sm:text-5xl lg:text-[3.4rem]'
      } ${className}`}
    >
      <span className={onDark ? 'text-bone' : 'text-ink'}>{top}</span>
      <br />
      <span className={onDark ? 'text-bone/45' : 'text-ink-mute'}>{bottom}</span>
    </Tag>
  );
};

const pillBase =
  'inline-flex items-center justify-center rounded-full px-7 py-4 text-[12px] font-semibold uppercase tracking-[0.12em] transition duration-200';

type PillProps = {
  children: React.ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  variant?: 'dark' | 'light' | 'outline';
  className?: string;
};

/* Botón píldora. Usa `to` para rutas internas, `href` para anclas. */
export const PillButton: React.FC<PillProps> = ({
  children,
  to,
  href,
  onClick,
  variant = 'dark',
  className = '',
}) => {
  const styles = {
    dark: 'bg-ink text-bone hover:bg-ink-soft',
    light: 'bg-bone text-ink hover:bg-white',
    outline: 'border border-line text-ink hover:border-ink',
  }[variant];

  const cls = `${pillBase} ${styles} ${className}`;

  if (to) return <Link to={to} className={cls}>{children}</Link>;
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <button type="button" onClick={onClick} className={cls}>{children}</button>;
};

const ArrowIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

/* Botón circular con flecha, el compañero del botón píldora */
export const ArrowButton: React.FC<{
  to?: string;
  href?: string;
  onClick?: () => void;
  variant?: 'dark' | 'light' | 'outline';
  label?: string;
  direction?: 'left' | 'right';
}> = ({ to, href, onClick, variant = 'dark', label = 'Continuar', direction = 'right' }) => {
  const styles = {
    dark: 'bg-ink text-bone hover:bg-ink-soft',
    light: 'bg-bone text-ink hover:bg-white',
    outline: 'border border-line text-ink hover:border-ink',
  }[variant];

  const cls = `inline-flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full transition duration-200 ${styles} ${
    direction === 'left' ? 'rotate-180' : ''
  }`;

  const icon = <ArrowIcon />;

  if (to) return <Link to={to} aria-label={label} className={cls}>{icon}</Link>;
  if (href) return <a href={href} aria-label={label} className={cls}>{icon}</a>;
  return <button type="button" aria-label={label} onClick={onClick} className={cls}>{icon}</button>;
};

/*
 * Imagen con respaldo: mientras no exista el archivo en /public/landing/
 * se dibuja un marcador neutro con el nombre de la toma, para que la
 * maqueta se vea completa sin assets.
 */
export const Media: React.FC<{
  src?: string;
  alt: string;
  label?: string;
  className?: string;
  grayscale?: boolean;
}> = ({ src, alt, label, className = '', grayscale = false }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-sand-deep ${className}`}
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(26,23,21,0.045) 0 1px, transparent 1px 14px)',
        }}
        role="img"
        aria-label={alt}
      >
        <span className="px-6 text-center font-serif text-lg text-ink-mute">
          {label ?? alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${grayscale ? 'grayscale' : ''} ${className}`}
    />
  );
};

/* Contenedor de ancho máximo usado por todas las secciones */
export const Container: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`mx-auto w-full max-w-[1180px] px-5 sm:px-8 ${className}`}>{children}</div>;
