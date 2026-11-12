// ---------------------------------------------------------------------------
// Todo el texto y los precios de la landing viven aquí.
// Edita este archivo para cambiar copy, planes o preguntas frecuentes:
// ningún componente tiene texto escrito a mano.
// ---------------------------------------------------------------------------

export const brand = {
  name: 'Studio',
  nameAccent: 'AI',
  monogram: 'SA',
  tagline: 'Renders de evento con IA',
  email: 'hola@studioai.mx',
};

export const nav = [
  { href: '#seccion-herramientas', label: 'Herramientas' },
  { href: '#seccion-proceso', label: 'Proceso' },
  { href: '#seccion-galeria', label: 'Galería' },
  { href: '#seccion-precios', label: 'Precios' },
];

export const hero = {
  eyebrow: 'Plataforma de render con IA',
  titleTop: 'Del modelo de SketchUp',
  titleBottom: 'al render final en minutos',
  description:
    'Studio AI convierte tus escenas de evento en imágenes fotorrealistas y videos de presentación. Sin render farm, sin esperar toda la noche por una sola toma.',
  primaryCta: 'Crear mi cuenta',
  secondaryCta: 'Ver planes',
  image: '/landing/hero.jpg',
  imageLabel: 'Render de evento',
  stats: [
    { value: '4K', label: 'Resolución máxima de salida' },
    { value: '≈ 60 s', label: 'Por render generado' },
    { value: '3', label: 'Esquemas de iluminación base' },
    { value: '100%', label: 'Historial guardado en la nube' },
  ],
};

// Sección de pestañas (una pestaña por herramienta de la plataforma).
export const tools = {
  eyebrow: 'Herramientas',
  titleTop: 'Todo tu flujo de presentación',
  titleBottom: 'en una sola plataforma',
  description:
    'Cuatro módulos pensados para estudios de diseño de eventos: del boceto 3D a la imagen final y al video que mandas al cliente.',
  cta: 'Probar la plataforma',
  items: [
    {
      tab: 'Event Render',
      title: 'Event Render',
      description:
        'Sube la vista exportada de SketchUp y obtén un render fotorrealista del montaje. Controlas iluminación, temperatura de color, exposición y contraste, y puedes anexar referencias visuales para fijar el estilo.',
      image: '/landing/tool-render.jpg',
      specs: [
        'Entrada: captura o export de tu escena 3D',
        'Iluminación de día, atardecer o noche',
        'Referencias de estilo opcionales',
        'Salida en 2K o 4K',
      ],
    },
    {
      tab: 'Transición de video',
      title: 'Transición de video',
      description:
        'Define un start frame y un end frame y la plataforma genera la transición cinematográfica entre ambos, con el movimiento de cámara que elijas: dolly, zoom o paneo.',
      image: '/landing/tool-video.jpg',
      specs: [
        'Start frame y end frame propios',
        'Dolly in/out, zoom in/out, paneo',
        'Duración configurable',
        'Descarga lista para presentación',
      ],
    },
    {
      tab: 'Upscale 4K',
      title: 'Upscale 4K',
      description:
        'Lleva cualquier render o video del historial a máxima resolución cuando el cliente pide el archivo para impresión o para proyectar en pantalla grande.',
      image: '/landing/tool-upscale.jpg',
      specs: [
        'Escalado de imagen y de video',
        'Se ejecuta en segundo plano',
        'No pierdes el archivo original',
        'Disponible desde el historial',
      ],
    },
    {
      tab: 'Historial',
      title: 'Historial del estudio',
      description:
        'Cada render y cada video queda guardado con su configuración. Recuperas una versión anterior, la duplicas con otra iluminación y comparas resultados sin volver a empezar.',
      image: '/landing/tool-history.jpg',
      specs: [
        'Organizado por fecha y proyecto',
        'Guarda la configuración usada',
        'Descarga en cualquier momento',
        'Privado por cuenta',
      ],
    },
  ],
};

export const process = {
  eyebrow: 'Proceso',
  titleTop: 'Cómo se produce',
  titleBottom: 'cada render',
  description:
    'Un flujo corto y predecible: lo que antes tomaba una noche de render ahora cabe entre dos juntas.',
  imageTitle: 'Del boceto al montaje final',
  image: '/landing/proceso.jpg',
  steps: [
    {
      title: 'Sube tu escena',
      description:
        'Exporta la vista desde SketchUp y súbela. No necesitas limpiar el modelo ni aplicar materiales: la geometría es suficiente.',
    },
    {
      title: 'Define la iluminación',
      description:
        'Eliges día, atardecer o noche y ajustas temperatura de color, exposición y contraste. Puedes escribir instrucciones específicas del montaje.',
    },
    {
      title: 'Genera y compara',
      description:
        'El render sale en alrededor de un minuto. Generas variantes con otra luz o encuadre y las comparas lado a lado antes de decidir.',
    },
    {
      title: 'Entrega en 4K',
      description:
        'Escalas la versión aprobada a 4K y la descargas, o la conviertes en un video de transición para la presentación al cliente.',
    },
  ],
};

export const showcase = {
  eyebrow: 'Galería',
  titleTop: 'Antes y después',
  titleBottom: 'de la misma escena',
  description: 'Arrastra el control para comparar el modelo 3D con el render generado.',
  cta: 'Quiero probarlo',
  items: [
    {
      title: 'Montaje de boda en jardín',
      kind: 'Evento social',
      place: 'Escena exterior · atardecer',
      goal: 'Mostrar al cliente el montaje con luz cálida de las 7 pm antes de rentar mobiliario.',
      solution: 'Render a partir de la vista de SketchUp con iluminación de atardecer y referencia de paleta.',
      before: '/landing/caso-1-antes.jpg',
      after: '/landing/caso-1-despues.jpg',
    },
    {
      title: 'Congreso corporativo',
      kind: 'Evento corporativo',
      place: 'Salón cerrado · luz neutra',
      goal: 'Validar escenografía, pantallas y distribución de mesas en una sola imagen.',
      solution: 'Render en 4K con exposición controlada para que la pantalla LED no se queme.',
      before: '/landing/caso-2-antes.jpg',
      after: '/landing/caso-2-despues.jpg',
    },
    {
      title: 'Activación de marca',
      kind: 'Activación',
      place: 'Espacio abierto · noche',
      goal: 'Presentar tres opciones de iluminación al cliente en la misma junta.',
      solution: 'Tres variantes generadas de la misma escena cambiando solo el esquema de luz.',
      before: '/landing/caso-3-antes.jpg',
      after: '/landing/caso-3-despues.jpg',
    },
  ],
};

// ---------------------------------------------------------------------------
// PRECIOS — ajusta montos, créditos y features a tu modelo real.
// ---------------------------------------------------------------------------

export const pricing = {
  eyebrow: 'Precios',
  titleTop: 'Planes para estudios',
  titleBottom: 'de cualquier tamaño',
  description:
    'Todos los planes incluyen las cuatro herramientas. Lo que cambia es el volumen de renders y los usuarios de tu equipo.',
  currency: 'MXN',
  annualDiscountLabel: 'Ahorra 20%',
  note: 'Precios en pesos mexicanos, IVA incluido. Puedes cambiar o cancelar tu plan cuando quieras.',
  plans: [
    {
      id: 'starter',
      name: 'Starter',
      summary: 'Para freelancers que presentan uno o dos eventos por semana.',
      monthly: 499,
      annual: 399,
      featured: false,
      cta: 'Empezar',
      features: [
        '50 renders en 2K al mes',
        '5 videos de transición',
        '1 usuario',
        'Historial de 30 días',
        'Soporte por correo',
      ],
    },
    {
      id: 'studio',
      name: 'Studio',
      summary: 'El plan de la mayoría: volumen alto y entrega en 4K.',
      monthly: 1299,
      annual: 1039,
      featured: true,
      cta: 'Empezar',
      features: [
        '200 renders en 2K o 4K',
        '20 videos de transición',
        'Upscale 4K incluido',
        'Hasta 3 usuarios',
        'Historial ilimitado',
        'Soporte prioritario',
      ],
    },
    {
      id: 'pro',
      name: 'Estudio Pro',
      summary: 'Para equipos que producen eventos en paralelo todo el mes.',
      monthly: 2999,
      annual: 2399,
      featured: false,
      cta: 'Hablar con ventas',
      href: 'mailto:hola@studioai.mx?subject=Plan%20Estudio%20Pro',
      features: [
        '600 renders en 2K o 4K',
        'Videos de transición ilimitados',
        'Hasta 10 usuarios',
        'Biblioteca de estilos del estudio',
        'Onboarding con tu equipo',
        'Soporte dedicado',
      ],
    },
  ],
};

export const faq = {
  eyebrow: 'Preguntas',
  titleTop: 'Lo que suelen',
  titleBottom: 'preguntarnos',
  items: [
    {
      q: '¿Necesito saber usar un motor de render?',
      a: 'No. Si sabes exportar una vista de SketchUp, ya sabes usar Studio AI. Los controles son de fotografía (luz, temperatura, exposición), no de materiales ni de iluminación 3D.',
    },
    {
      q: '¿Qué tan parecido queda al modelo original?',
      a: 'La plataforma respeta la geometría y el encuadre de tu escena. Lo que agrega son materiales, luz y ambiente; la distribución del montaje se mantiene.',
    },
    {
      q: '¿Puedo usar los renders comercialmente?',
      a: 'Sí. Las imágenes y videos que generas son tuyos y los puedes entregar a tus clientes sin restricción.',
    },
    {
      q: '¿Qué pasa si se me acaban los renders del mes?',
      a: 'Puedes subir de plan en cualquier momento y el cambio aplica de inmediato con el cobro prorrateado.',
    },
    {
      q: '¿Mis proyectos son privados?',
      a: 'Sí. Cada cuenta ve únicamente su propio historial. No usamos tus escenas ni tus renders para nada fuera de tu cuenta.',
    },
  ],
};

export const finalCta = {
  titleTop: 'Presenta tu próximo evento',
  titleBottom: 'con un render, no con un boceto',
  description: 'Crea tu cuenta y genera tu primer render hoy mismo.',
  primary: 'Crear mi cuenta',
  secondary: 'Ya tengo cuenta',
};

export const footer = {
  description:
    'Studio AI es la plataforma de render con inteligencia artificial para estudios de diseño y producción de eventos.',
  columns: [
    {
      title: 'Plataforma',
      links: [
        { href: '#seccion-herramientas', label: 'Herramientas' },
        { href: '#seccion-proceso', label: 'Proceso' },
        { href: '#seccion-galeria', label: 'Galería' },
        { href: '#seccion-precios', label: 'Precios' },
      ],
    },
    {
      title: 'Cuenta',
      links: [
        { href: '/login', label: 'Iniciar sesión', internal: true },
        { href: '/login', label: 'Crear cuenta', internal: true },
      ],
    },
  ],
  legal: ['Aviso de privacidad', 'Términos del servicio'],
};
