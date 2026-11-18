// ---------------------------------------------------------------------------
// Todo el texto y los precios de la landing viven aquí.
// Edita este archivo para cambiar copy, planes o preguntas frecuentes:
// ningún componente tiene texto escrito a mano.
// ---------------------------------------------------------------------------

export const brand = {
  name: 'PHORMA',
  nameAccent: 'RENDER',
  monogram: 'PR',
  tagline: 'Renders con IA para arquitectura',
  email: 'hola@studioai.mx',
};

export const nav = [
  { href: '#seccion-herramientas', label: 'Herramientas' },
  { href: '#seccion-proceso', label: 'Proceso' },
  { href: '#seccion-galeria', label: 'Galería' },
  { href: '#seccion-precios', label: 'Precios' },
];

export const hero = {
  eyebrow: 'Renderizado fotorrealista en segundos',
  titleTop: 'Transforma tu modelo 3D',
  titleBottom: 'en renders y recorridos virtuales',
  description:
    'Sube tu boceto y toma el control de la escena. PHORMARENDER analiza tus materiales e iluminación para entregarte imágenes fijas en 4K y recorridos virtuales.',
  primaryCta: 'Crear mi cuenta',
  secondaryCta: 'Ver planes',
  image: '/landing/hero.jpg',
  imageLabel: 'Render de arquitectura',
  stats: [
    { value: '2K y 4K', label: 'Resolución de alta calidad para un resultado fotorrealista.' },
    {
      value: 'Precisión y Control',
      label: 'Descripción y detección específica de tu escena para un control de cada material.',
    },
    {
      value: 'Control de Iluminación',
      label: 'Manejo de ambiente adaptable con configuraciones de día, tarde y noche.',
    },
    {
      value: 'Fijos y Recorridos',
      label: 'Genera tanto imágenes estáticas como recorridos virtuales a partir de tus escenas.',
    },
  ],
};

// Sección de pestañas (una pestaña por herramienta de la plataforma).
export const tools = {
  eyebrow: 'Herramientas',
  titleTop: 'Renders y recorridos virtuales',
  titleBottom: 'en una sola plataforma',
  description:
    'Pensado para arquitectos y diseñadores de interiores. Convierte tu modelo 3D en imágenes fotorrealistas y genera recorridos virtuales para tus proyectos.',
  cta: 'Probar la plataforma',
  items: [
    {
      tab: 'Render Fijo',
      title: 'Renderizador',
      description:
        'Sube una vista exportada de tu modelo 3D y obtén un render fotorrealista. Tú tienes el control total: ajusta los valores de iluminación, define los materiales, dirige los elementos de la escena y anexa referencias visuales para lograr exactamente el resultado que buscas.',
      image: '/landing/tool-render.jpg',
      specs: [
        { term: 'Ingreso de escena', detail: 'Ingresa tu modelo 3D.' },
        { term: 'Dirección de escena', detail: 'Define los materiales, elementos y añade referencias.' },
        { term: 'Ambiente dinámico', detail: 'Cambia el tipo de iluminación a día, tarde o noche.' },
        { term: 'Calidad flexible', detail: 'Genera tu modelo en 2K o 4K, como tú prefieras.' },
      ],
    },
    {
      tab: 'Recorrido Virtual',
      title: 'Recorridos Virtuales',
      description:
        'Añade un start frame y un end frame para que nuestra plataforma analice y genere la transición de movimiento entre ambas escenas. Aplica el movimiento de cámara que prefieras, ya sea dolly, zoom o paneo.',
      image: '/landing/tool-video.jpg',
      video: '/landing/video/interior-1.mp4',
      specs: [
        { term: 'Renders clave', detail: 'Añades tus escenas.' },
        { term: 'Configuración visual', detail: 'Defines los materiales.' },
        { term: 'Movimiento de cámara', detail: 'Defines el tipo de movimiento de cámara que quieres hacer.' },
        { term: 'Resultado final', detail: 'Obtienes un recorrido fluido entre escenas de 8 segundos.' },
      ],
    },
    {
      tab: 'Historial',
      title: 'Historial y Privacidad',
      description:
        'Visualiza y descarga tus renders y recorridos hasta por 7 días sin necesidad de renderizar desde cero.',
      image: '/landing/tool-history.jpg',
      specs: [
        { term: 'Organización eficiente', detail: 'Organizado por fecha.' },
        { term: 'Replicabilidad', detail: 'Se guarda la configuración de iluminación.' },
        { term: 'Disponibilidad', detail: 'Descargas en cualquier momento (dentro de los 7 días).' },
        { term: 'Privacidad total', detail: 'Tus escenas son completamente privadas en tu perfil.' },
      ],
    },
  ],
};

export const process = {
  eyebrow: 'Proceso',
  titleTop: 'Cómo crear tus renders',
  titleBottom: 'con PHORMARENDER',
  description:
    'La manera más precisa de describir tus modelos 3D. Obtenemos un resultado fotorrealista respetando tus materiales y la geometría de tu escena.',
  imageTitle: 'Del modelo 3D al render final',
  image: '/landing/proceso.jpg',
  steps: [
    {
      title: 'Sube tu escena',
      description:
        'Exporta la vista de tu software 3D con los colores y texturas base. Nuestro sistema analiza y describe tu escena, reconociendo cada elemento geométrico y material.',
    },
    {
      title: 'Dirección de escena',
      description:
        'Toma el control. Corrige materiales, añade elementos no detectados y sube imágenes de referencia aisladas para asegurar que la escena esté descrita como la imaginaste.',
    },
    {
      title: 'Iluminación a medida',
      description:
        'Configura el ambiente. Elige entre iluminación de día, tarde o noche, y añade luces para darle la atmósfera correcta.',
    },
    {
      title: 'Entrega fotorrealista',
      description:
        'Obtén un render fotorrealista de alta calidad, listo para presentar a tus clientes.',
    },
  ],
};

export const showcase = {
  eyebrow: 'Galería',
  titleTop: 'Diseñado para',
  titleBottom: 'arquitectos e interioristas',
  description:
    'Explora cómo los profesionales transforman sus modelos 3D en imágenes fotorrealistas. Pasa el cursor sobre cualquier imagen para ver el antes (modelo 3D) y el después (render PHORMARENDER).',
  cta: 'Quiero probarlo',
  // Cada categoría es un filtro del collage. `video` es opcional: cuando
  // existe, la tarjeta muestra un botón de play con el recorrido virtual.
  categories: [
    {
      id: 'residencial',
      label: 'Residencial y Fachadas',
      items: [
        {
          title: 'Fachada principal al atardecer',
          render: '/landing/galeria/fachada-1-render.jpg',
          model: '/landing/galeria/fachada-1-modelo.jpg',
          video: '/landing/video/fachada-1.mp4',
        },
        {
          title: 'Acceso peatonal y jardín',
          render: '/landing/galeria/fachada-2-render.jpg',
          model: '/landing/galeria/fachada-2-modelo.jpg',
          video: '/landing/video/fachada-2.mp4',
        },
        {
          title: 'Cochera y celosía perforada',
          render: '/landing/galeria/fachada-3-render.jpg',
          model: '/landing/galeria/fachada-3-modelo.jpg',
          video: '/landing/video/fachada-3.mp4',
        },
      ],
    },
    {
      id: 'interiores',
      label: 'Diseño de Interiores',
      items: [
        {
          title: 'Recámara principal con vista a la ciudad',
          render: '/landing/galeria/interior-1-render.jpg',
          model: '/landing/galeria/interior-1-modelo.jpg',
          video: '/landing/video/interior-1.mp4',
        },
        {
          title: 'Cabecera y paneles de madera',
          render: '/landing/galeria/interior-2-render.jpg',
          model: '/landing/galeria/interior-2-modelo.jpg',
        },
      ],
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
    'Todos los planes incluyen las herramientas de la plataforma. Lo que cambia es el volumen de renders y los usuarios de tu equipo.',
  currency: 'MXN',
  annualDiscountLabel: 'Ahorra 20%',
  note: 'Precios en pesos mexicanos, IVA incluido. Puedes cambiar o cancelar tu plan cuando quieras.',
  plans: [
    {
      id: 'starter',
      name: 'Starter',
      summary: 'Para freelancers que presentan uno o dos proyectos por semana.',
      monthly: 499,
      annual: 399,
      featured: false,
      cta: 'Empezar',
      features: [
        '50 renders en 2K al mes',
        '5 recorridos virtuales',
        '1 usuario',
        'Historial de 7 días',
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
        '20 recorridos virtuales',
        'Salida en 4K incluida',
        'Hasta 3 usuarios',
        'Historial de 7 días',
        'Soporte prioritario',
      ],
    },
    {
      id: 'pro',
      name: 'Estudio Pro',
      summary: 'Para equipos que producen proyectos en paralelo todo el mes.',
      monthly: 2999,
      annual: 2399,
      featured: false,
      cta: 'Hablar con ventas',
      href: 'mailto:hola@studioai.mx?subject=Plan%20Estudio%20Pro',
      features: [
        '600 renders en 2K o 4K',
        'Recorridos virtuales ilimitados',
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
      a: 'No. Si sabes exportar una vista de tu modelo 3D, ya sabes usar PHORMARENDER. Los controles son de fotografía (luz, temperatura, exposición), no de materiales ni de iluminación 3D.',
    },
    {
      q: '¿Qué tan parecido queda al modelo original?',
      a: 'La plataforma respeta la geometría y el encuadre de tu escena. Lo que agrega son materiales, luz y ambiente; la composición de tu proyecto se mantiene.',
    },
    {
      q: '¿Puedo usar los renders comercialmente?',
      a: 'Sí. Las imágenes y recorridos que generas son tuyos y los puedes entregar a tus clientes sin restricción.',
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
  titleTop: 'Presenta tu próximo proyecto',
  titleBottom: 'con un render que destaque, fiel a tu diseño',
  description: 'Crea tu cuenta y transforma tu primer modelo 3D en un render fotorrealista hoy mismo.',
  primary: 'Crear mi cuenta',
  secondary: 'Ya tengo cuenta',
};

export const footer = {
  description:
    'PHORMARENDER es la plataforma de render con inteligencia artificial para arquitectos y diseñadores de interiores.',
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
