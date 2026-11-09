// Descarga de archivos alojados en otro origen (Storage de Supabase).
//
// El atributo `download` de un <a> SOLO funciona si el archivo es del mismo
// origen que la página. Con una URL firmada de Supabase el navegador lo ignora
// y NAVEGA al archivo: el video se abre en la pestaña y se pierde el estado de
// la app (el wizard, el render, todo). Por eso descargamos el contenido a un
// blob local —que sí es del mismo origen— y disparamos la descarga desde ahí.

/** Añade el parámetro que hace que Storage responda con Content-Disposition: attachment. */
const withDownloadParam = (url: string, filename: string): string => {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('download', filename);
    return parsed.toString();
  } catch {
    return url;
  }
};

const clickAnchor = (href: string, filename: string): void => {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

/**
 * Descarga `url` como `filename` sin sacar al usuario de la página.
 * Si el fetch falla (CORS, URL firmada expirada), cae a abrir el archivo en una
 * pestaña nueva pidiéndole la descarga al Storage: en el peor caso se abre otra
 * pestaña, pero la página actual nunca se pierde.
 */
export const downloadFromUrl = async (url: string, filename: string): Promise<void> => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const objectUrl = URL.createObjectURL(await res.blob());
    clickAnchor(objectUrl, filename);
    // Se revoca en el siguiente tick: hacerlo de inmediato cancela la descarga.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  } catch {
    window.open(withDownloadParam(url, filename), '_blank', 'noopener');
  }
};
