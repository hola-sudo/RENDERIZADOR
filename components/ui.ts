// ---------------------------------------------------------------------------
// Lenguaje visual compartido de la app (herramientas, historial, navegación).
// Usa la misma paleta cálida y las mismas formas que la landing pública:
// fondo bone, tarjetas sand, tinta ink, bordes line, botones píldora.
//
// Si cambias algo aquí, cámbialo también en `components/landing/primitives.tsx`
// para que la plataforma y la landing no se separen.
// ---------------------------------------------------------------------------

/* Títulos ------------------------------------------------------------------ */

/** Título de paso o de sección dentro de una herramienta. */
export const heading = 'font-serif text-2xl font-normal tracking-tight text-ink';

/** Texto de apoyo bajo un título. */
export const subheading = 'text-[14px] leading-relaxed text-ink-soft';

/** Etiqueta en mayúsculas sobre un campo de formulario. */
export const label =
  'block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-mute';

/* Botones ------------------------------------------------------------------ */

const pill =
  'inline-flex items-center justify-center rounded-full text-[12px] font-semibold uppercase tracking-[0.12em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-40';

/** Acción principal: tinta sólida. */
export const btnPrimary = `${pill} bg-ink px-7 py-3.5 text-bone hover:bg-ink-soft`;

/** Acción secundaria: contorno. */
export const btnSecondary = `${pill} border border-line bg-transparent px-7 py-3.5 text-ink hover:border-ink`;

/** Acción secundaria sobre fondo sand (la tarjeta ya es sand). */
export const btnSoft = `${pill} bg-white px-7 py-3.5 text-ink hover:bg-sand-deep`;

/** Ancho completo, para los botones dentro de un paso. */
export const btnBlock = 'w-full';

/** Enlace discreto (volver, cancelar). */
export const btnGhost =
  'text-sm font-medium text-ink-soft transition duration-200 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30';

/* Superficies -------------------------------------------------------------- */

/** Tarjeta o panel. */
export const card = 'rounded-4xl bg-sand p-6 sm:p-7';

/** Caja de resumen dentro de una tarjeta. */
export const summaryBox = 'rounded-3xl bg-white p-5';

/** Zona vacía punteada (sin archivo, sin referencias). */
export const emptyBox =
  'rounded-3xl border border-dashed border-line bg-white/50 p-8 text-center text-[14px] text-ink-mute';

/* Formularios -------------------------------------------------------------- */

const fieldBase =
  'w-full rounded-2xl border border-line bg-white text-[15px] text-ink outline-none transition placeholder:text-ink-mute/70 focus:border-ink disabled:opacity-40';

export const input = `${fieldBase} px-4 py-3.5`;
export const select = `${fieldBase} px-4 py-3.5`;
export const textarea = `${fieldBase} resize-y p-4`;

/* Avisos ------------------------------------------------------------------- */

export const alertError =
  'rounded-3xl border border-red-200 bg-red-50 p-4 text-[14px] text-red-800';

export const note = 'text-[13px] leading-relaxed text-ink-mute';

/* Conmutador de dos opciones (Original / Render, Imágenes / Videos) --------- */

export const toggleGroup = 'flex items-center gap-1 rounded-full bg-sand-deep p-1';

export const toggleOption = (active: boolean) =>
  `flex-1 rounded-full py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] transition duration-200 ${
    active ? 'bg-ink text-bone' : 'text-ink-soft hover:text-ink'
  }`;
