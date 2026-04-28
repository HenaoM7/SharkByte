import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconBolt = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const IconCalendar = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const IconChart = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconCheck = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const IconChat = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
const IconWhatsApp = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
const IconGoogle = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);
const IconSheets = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19.818 0H4.182A2.182 2.182 0 002 2.182V21.82A2.182 2.182 0 004.182 24H19.82A2.182 2.182 0 0022 21.818V2.182A2.182 2.182 0 0019.818 0zM10.91 17.455H7.272v-1.819h3.636v1.819zm0-3.637H7.272V12h3.636v1.818zm0-3.636H7.272V8.364h3.636v1.818zm5.454 7.273H13v-1.819h3.364v1.819zm0-3.637H13V12h3.364v1.818zm0-3.636H13V8.364h3.364v1.818z" />
  </svg>
);
const IconBrain = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
  </svg>
);
const IconClock = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconAlertCircle = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconUsers = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);
const IconStar = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);
const IconChevronDown = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);
const IconMenu = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const IconX = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const IconLaptop = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const IconBell = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const IconShield = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const IconScissors = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
  </svg>
);
const IconUtensils = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 2v6a3 3 0 006 0V2M6 8v14M18 2v4m0 0v14m0-14a4 4 0 010 8" />
  </svg>
);
const IconShoppingBag = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);
const IconBriefcase = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const IconHeart = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);
const IconLinkedIn = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const IconInstagram = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled]       = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq]         = useState(null);
  const [activeTab, setActiveTab]     = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'Servicios',     id: 'servicios' },
    { label: 'Cómo funciona', id: 'como-funciona' },
    { label: 'Precios',       id: 'precios' },
    { label: 'FAQ',           id: 'faq' },
  ];

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/mes',
      highlight: false,
      badge: null,
      features: [
        '100 mensajes mensuales',
        'Asistente IA básico',
        '1 número de WhatsApp',
        'Panel de control',
        'Soporte por correo',
      ],
      cta: 'Comenzar gratis',
      ctaTo: '/register',
    },
    {
      name: 'Mensual',
      price: '$999.998',
      period: ' COP/mes',
      highlight: true,
      badge: 'Más popular',
      features: [
        'Mensajes ilimitados',
        'Asistente IA avanzado',
        'WhatsApp Business',
        'Agendamiento automático',
        'Sincronización Google Calendar',
        'Exportación a Google Sheets',
        'Notificaciones por correo',
        'Soporte prioritario',
      ],
      cta: 'Crear cuenta',
      ctaTo: '/register',
    },
    {
      name: 'Anual',
      price: '$9.999.998',
      period: ' COP/año',
      highlight: false,
      badge: null,
      subPrice: '~$833.333 / mes',
      features: [
        'Todo lo del plan Mensual',
        'Equivale a 2 meses gratis',
        'Soporte dedicado',
        'Onboarding personalizado',
        'SLA garantizado',
      ],
      cta: 'Crear cuenta',
      ctaTo: '/register',
    },
  ];

  const faqs = [
    {
      q: '¿Necesito conocimientos técnicos para usar SharkByte?',
      a: 'No. SharkByte está diseñado para cualquier dueño de negocio. La configuración es guiada paso a paso y no requiere programar ni conocimientos previos. Si puedes usar WhatsApp, puedes usar SharkByte.',
    },
    {
      q: '¿Puedo conectar mi número de WhatsApp actual?',
      a: 'Sí. SharkByte se conecta con tu número de WhatsApp mediante un código QR, igual que WhatsApp Web. El proceso toma menos de un minuto y conservas tu número y tus contactos.',
    },
    {
      q: '¿Qué pasa cuando un cliente necesita hablar con una persona?',
      a: 'El sistema detecta automáticamente cuando una conversación requiere atención humana y transfiere al cliente a uno de tus agentes designados, notificándote de inmediato por correo.',
    },
    {
      q: '¿Puedo cancelar mi suscripción en cualquier momento?',
      a: 'Sí. Puedes cancelar cuando quieras desde tu panel sin penalizaciones. Tu cuenta permanece activa hasta el final del período pagado.',
    },
    {
      q: '¿Cuánto tiempo toma poner el sistema en marcha?',
      a: 'Menos de 5 minutos. Creas tu cuenta, conectas WhatsApp, describes tu negocio y el asistente empieza a funcionar de inmediato.',
    },
    {
      q: '¿Funciona para cualquier tipo de negocio?',
      a: 'Sí. SharkByte se personaliza con el perfil, productos, horarios y flujos específicos de cada negocio — clínicas, tiendas, restaurantes, consultores y más.',
    },
  ];

  // Showcase tabs — app screenshots
  const showcaseTabs = [
    {
      label: 'Panel principal',
      img: '/Imagen1.png',
      title: 'Todo tu negocio en un solo lugar',
      desc: 'Visualiza el estado de tu asistente, los mensajes procesados, las citas agendadas y las ventas del día — todo actualizado en tiempo real desde cualquier dispositivo.',
    },
    {
      label: 'Configuración',
      img: '/Imagen2.png',
      title: 'Personaliza el asistente a tu negocio',
      desc: 'Define el perfil de tu empresa, los horarios de atención, el catálogo de productos y el tono del asistente. Sin código, sin formularios complicados.',
    },
    {
      label: 'WhatsApp',
      img: '/Imagen3.png',
      title: 'Conecta tu WhatsApp en segundos',
      desc: 'Escanea el código QR y tu número queda vinculado al sistema. El asistente empieza a responder de inmediato usando la información de tu negocio.',
    },
    {
      label: 'Ventas',
      img: '/Imagen4.png',
      title: 'Registra cada venta automáticamente',
      desc: 'Cuando un cliente confirma un pedido o pago, el sistema lo registra, notifica a tu equipo y queda disponible en el historial para análisis.',
    },
    {
      label: 'Catálogo',
      img: '/Imagen5.png',
      title: 'Tu catálogo de productos siempre disponible',
      desc: 'Agrega productos con nombre, descripción, precio e imagen. El asistente los presenta a los clientes de forma natural durante la conversación.',
    },
    {
      label: 'Integraciones',
      img: '/Imagen6.png',
      title: 'Conectado con las herramientas que usas',
      desc: 'Sincroniza citas con Google Calendar y exporta datos a Google Sheets automáticamente. Tus registros siempre actualizados, sin trabajo manual.',
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ═══════════════════════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════════════════════ */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <img src="/Logo.png" alt="SharkByte" className={`h-8 w-auto transition-all ${scrolled ? '' : 'brightness-0 invert'}`} />
              <span className={`font-bold text-lg tracking-tight transition-colors ${scrolled ? 'text-sb-dark' : 'text-white'}`}>SharkByte</span>
            </div>

            <div className="hidden md:flex items-center gap-7">
              {navLinks.map((link) => (
                <button key={link.id} onClick={() => scrollToSection(link.id)}
                  className={`text-sm font-medium transition-colors ${scrolled ? 'text-gray-500 hover:text-sb-primary' : 'text-white/80 hover:text-white'}`}>
                  {link.label}
                </button>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/login"
                className={`text-sm font-medium transition-colors px-3 py-2 ${scrolled ? 'text-sb-primary hover:text-sb-secondary' : 'text-white/80 hover:text-white'}`}>
                Iniciar sesión
              </Link>
              <Link to="/register"
                className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${scrolled ? 'bg-sb-primary text-white hover:bg-sb-secondary' : 'bg-white text-sb-primary hover:bg-white/90'}`}>
                Crear cuenta
              </Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 transition-colors ${scrolled ? 'text-gray-600 hover:text-sb-primary' : 'text-white hover:text-white/80'}`} aria-label="Toggle menu">
              {mobileMenuOpen ? <IconX /> : <IconMenu />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4 shadow-lg">
            {navLinks.map((link) => (
              <button key={link.id} onClick={() => scrollToSection(link.id)}
                className="text-left text-gray-700 font-medium py-1 text-sm">
                {link.label}
              </button>
            ))}
            <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                className="text-center border border-sb-primary text-sb-primary rounded-lg px-4 py-2.5 text-sm font-medium">
                Iniciar sesión
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}
                className="text-center bg-sb-primary text-white rounded-lg px-4 py-2.5 text-sm font-semibold">
                Crear cuenta gratis
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════════
          HERO — banner.png como fondo completo
      ═══════════════════════════════════════════════════════ */}
      <section className="relative pt-16 min-h-[92vh] flex flex-col overflow-hidden">
        {/* Imagen de fondo */}
        <img
          src="/banner.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlay oscuro degradado — hace legible el texto */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(2,40,89,0.92) 0%, rgba(21,57,89,0.85) 45%, rgba(2,40,89,0.60) 100%)' }}
        />

        {/* Contenido */}
        <div className="relative flex-1 flex flex-col justify-center">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-28 w-full">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 border border-white/25 rounded-full px-4 py-1.5 mb-7 text-white/80 text-xs font-medium backdrop-blur-sm">
                <IconBolt className="w-3.5 h-3.5 text-white/80" />
                Automatización inteligente para negocios
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[52px] font-bold text-white leading-tight mb-5">
                Tu negocio atendiendo clientes{' '}
                <span className="text-white/90 underline underline-offset-4 decoration-white/30">las 24 horas,</span>{' '}
                sin que estés presente
              </h1>

              <p className="text-base sm:text-lg text-white/65 mb-8 leading-relaxed max-w-xl">
                SharkByte convierte tu WhatsApp en un asistente inteligente que responde preguntas,
                agenda citas, gestiona ventas y escala a tu equipo cuando es necesario —
                de forma totalmente automática.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Link to="/register"
                  className="bg-white text-sb-primary hover:bg-gray-50 rounded-xl px-8 py-3.5 text-sm font-bold transition-colors text-center shadow-xl shadow-black/25">
                  Crear cuenta gratis
                </Link>
                <button onClick={() => scrollToSection('como-funciona')}
                  className="border border-white/40 text-white hover:bg-white/10 rounded-xl px-8 py-3.5 text-sm font-medium transition-colors backdrop-blur-sm">
                  Ver cómo funciona
                </button>
              </div>

              <p className="text-white/35 text-xs">
                Sin tarjeta de crédito&nbsp;&nbsp;·&nbsp;&nbsp;Configuración en minutos&nbsp;&nbsp;·&nbsp;&nbsp;Cancela cuando quieras
              </p>
            </div>
          </div>
        </div>

        {/* Stats strip en la parte inferior */}
        <div className="relative border-t border-white/10 backdrop-blur-sm" style={{ background: 'rgba(2,40,89,0.65)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { value: '500+', label: 'Negocios activos' },
              { value: '24/7', label: 'Disponibilidad' },
              { value: '2 seg', label: 'Tiempo de respuesta' },
              { value: '5 min', label: 'Para estar listo' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-0.5">{stat.value}</div>
                <div className="text-white/50 text-xs sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PROBLEMA
      ═══════════════════════════════════════════════════════ */}
      <section id="como-funciona" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-sb-primary uppercase tracking-widest mb-3">El desafío</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Los negocios pierden clientes cada día por la misma razón
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Sin un sistema automatizado, atender clientes se convierte en un trabajo que nunca termina.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                icon: <IconClock className="w-6 h-6 text-gray-500" />,
                title: 'Respuesta lenta',
                desc: 'El 78% de los clientes elige al primer negocio que responde. Cada minuto sin respuesta es una oportunidad perdida.',
              },
              {
                icon: <IconAlertCircle className="w-6 h-6 text-gray-500" />,
                title: 'Conversaciones sin control',
                desc: 'Sin un sistema centralizado, los mensajes se pierden entre distintas aplicaciones y personas, sin seguimiento real.',
              },
              {
                icon: <IconCalendar className="w-6 h-6 text-gray-500" />,
                title: 'Citas que no se presentan',
                desc: 'Los clientes olvidan sus citas y el tiempo se desperdicia. Sin confirmaciones automáticas, el ausentismo es inevitable.',
              },
              {
                icon: <IconUsers className="w-6 h-6 text-gray-500" />,
                title: 'Equipo saturado',
                desc: 'Responder manualmente cientos de mensajes al día desgasta al equipo y reduce la calidad del servicio.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 rounded-xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SOLUCIÓN — 3 pilares
      ═══════════════════════════════════════════════════════ */}
      <section className="py-20" style={{ background: '#f5f7fa' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-sb-primary uppercase tracking-widest mb-3">La solución</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              SharkByte automatiza la atención de principio a fin
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Una plataforma que reemplaza horas de trabajo manual con respuestas inteligentes,
              agendamiento automático y visibilidad completa de tu negocio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <IconChat className="w-7 h-7 text-sb-primary" />,
                title: 'Atiende y convierte',
                desc: 'El asistente responde preguntas, presenta productos, gestiona objeciones y guía a cada cliente hasta cerrar la venta — sin intervención manual.',
              },
              {
                icon: <IconCalendar className="w-7 h-7 text-sb-primary" />,
                title: 'Agenda sin esfuerzo',
                desc: 'Los clientes reservan, modifican y cancelan citas directamente desde WhatsApp. Todo sincronizado con tu calendario y con recordatorios automáticos.',
              },
              {
                icon: <IconLaptop className="w-7 h-7 text-sb-primary" />,
                title: 'Control total',
                desc: 'Supervisa en tiempo real todas las interacciones, ventas registradas y citas agendadas. Toma decisiones con información real de tu negocio.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-100 p-7 text-center hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sb-bg mb-5">
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-3">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CÓMO FUNCIONA — 3 pasos
      ═══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-sb-primary uppercase tracking-widest mb-3">Proceso</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Empieza en 3 pasos, en menos de 5 minutos
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              No necesitas un equipo técnico ni experiencia previa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector (desktop) */}
            <div className="hidden md:block absolute top-[52px] left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-gray-200 z-0" />

            {[
              {
                step: '01',
                icon: <IconUsers className="w-7 h-7 text-white" />,
                title: 'Crea tu cuenta y registra tu negocio',
                time: '60 segundos',
                desc: 'Nombre, giro comercial y datos de contacto. Sin formularios extensos. Comienza con el plan gratuito sin compromisos.',
              },
              {
                step: '02',
                icon: <IconWhatsApp className="w-7 h-7 text-white" />,
                title: 'Conecta WhatsApp y configura tu asistente',
                time: '2-3 minutos',
                desc: 'Escanea el QR para vincular tu número. Luego describe tus productos, servicios y horarios — el asistente aprende de esa información.',
              },
              {
                step: '03',
                icon: <IconBrain className="w-7 h-7 text-white" />,
                title: 'Tu negocio opera en piloto automático',
                time: 'Desde el primer mensaje',
                desc: 'El asistente responde, agenda y vende. Tú recibes notificaciones de eventos importantes y revisas el resumen cuando quieras.',
              },
            ].map((step) => (
              <div key={step.step} className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-[104px] h-[104px] rounded-2xl mb-5 shadow-lg relative"
                  style={{ background: 'linear-gradient(135deg, #022859 0%, #174873 100%)' }}>
                  {step.icon}
                  <span className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-sb-primary shadow">
                    {step.step}
                  </span>
                </div>
                <div className="inline-block bg-green-50 text-green-700 text-xs font-semibold rounded-full px-3 py-1 mb-3 border border-green-100">
                  {step.time}
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2 px-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          EL SISTEMA EN ACCIÓN — screenshots con tabs
      ═══════════════════════════════════════════════════════ */}
      <section id="servicios" className="py-20" style={{ background: '#f5f7fa' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-sb-primary uppercase tracking-widest mb-3">El sistema</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Mira SharkByte en acción
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Una plataforma diseñada para que tú tengas control total de tu negocio desde un solo lugar.
            </p>
          </div>

          {/* Tab selector */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {showcaseTabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === i
                    ? 'bg-sb-primary text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-sb-primary/40 hover:text-sb-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Screenshot display */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
              <div className="flex-1 mx-3 bg-white rounded border border-gray-200 px-3 py-1 text-xs text-gray-400 max-w-sm">
                app.sharkbyteia.com
              </div>
            </div>

            {/* Image */}
            <div className="relative">
              <img
                key={activeTab}
                src={showcaseTabs[activeTab].img}
                alt={showcaseTabs[activeTab].title}
                className="w-full object-cover max-h-[520px] object-top"
              />
              {/* Caption overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 md:p-8">
                <h3 className="text-white font-bold text-lg sm:text-xl mb-1">
                  {showcaseTabs[activeTab].title}
                </h3>
                <p className="text-white/75 text-sm max-w-xl">
                  {showcaseTabs[activeTab].desc}
                </p>
              </div>
            </div>
          </div>

          {/* Thumbnail row */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4">
            {showcaseTabs.map((tab, i) => (
              <button
                key={tab.label}
                onClick={() => setActiveTab(i)}
                className={`rounded-lg overflow-hidden border-2 transition-all ${
                  activeTab === i ? 'border-sb-primary' : 'border-transparent opacity-60 hover:opacity-90'
                }`}
              >
                <img src={tab.img} alt={tab.label} className="w-full h-16 object-cover object-top" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SERVICIOS / CARACTERÍSTICAS — 4-col grid
      ═══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-sb-primary uppercase tracking-widest mb-3">Funcionalidades</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que tu negocio necesita, en un solo sistema
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Cada funcionalidad está diseñada para que tu operación sea más eficiente, sin complejidad adicional.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <IconBrain className="w-5 h-5 text-sb-primary" />,
                title: 'Asistente con IA',
                desc: 'Responde preguntas, presenta tu catálogo y guía clientes con lenguaje natural adaptado a tu negocio.',
              },
              {
                icon: <IconWhatsApp className="w-5 h-5 text-sb-primary" />,
                title: 'WhatsApp nativo',
                desc: 'Usa tu número actual sin cambiarlo. Los clientes te escriben como siempre, el sistema hace el resto.',
              },
              {
                icon: <IconCalendar className="w-5 h-5 text-sb-primary" />,
                title: 'Agendamiento automático',
                desc: 'Los clientes reservan citas directamente en la conversación. Confirmaciones y recordatorios sin intervención.',
              },
              {
                icon: <IconGoogle className="w-5 h-5 text-sb-primary" />,
                title: 'Google Calendar',
                desc: 'Cada cita aparece en tu calendario automáticamente. Sin duplicados, sin trabajo manual.',
              },
              {
                icon: <IconSheets className="w-5 h-5 text-sb-primary" />,
                title: 'Google Sheets',
                desc: 'Clientes, ventas y citas se exportan a tus hojas de cálculo en tiempo real para reportes y análisis.',
              },
              {
                icon: <IconChart className="w-5 h-5 text-sb-primary" />,
                title: 'Panel de ventas',
                desc: 'Cada venta confirmada queda registrada con fecha, cliente y producto. Historial siempre disponible.',
              },
              {
                icon: <IconBell className="w-5 h-5 text-sb-primary" />,
                title: 'Notificaciones',
                desc: 'Recibe alertas por correo cuando hay ventas, escalamientos o eventos importantes en tu negocio.',
              },
              {
                icon: <IconShield className="w-5 h-5 text-sb-primary" />,
                title: 'Escalamiento humano',
                desc: 'El sistema detecta cuándo un cliente necesita atención personal y transfiere la conversación a tu equipo.',
              },
            ].map((feat) => (
              <div key={feat.title} className="rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
                <div className="w-9 h-9 rounded-lg bg-sb-bg flex items-center justify-center mb-4">
                  {feat.icon}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{feat.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          BENEFICIOS — lista + card
      ═══════════════════════════════════════════════════════ */}
      <section className="py-20" style={{ background: '#f5f7fa' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-sb-primary uppercase tracking-widest mb-3">Por qué SharkByte</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Más clientes atendidos, menos tiempo invertido
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-5">
              {[
                {
                  title: 'Responde en menos de 2 segundos, todo el día',
                  desc: 'Tu asistente nunca descansa. Atiende clientes en horarios en los que tú no puedes — fines de semana, madrugadas, días festivos.',
                },
                {
                  title: 'Escala tu capacidad sin contratar más personal',
                  desc: 'El mismo sistema atiende a 10 o a 1.000 clientes simultáneamente, sin comprometer la calidad de la respuesta.',
                },
                {
                  title: 'Tu equipo se enfoca en lo que genera más valor',
                  desc: 'Libera a tu personal de tareas repetitivas. El asistente gestiona lo rutinario y escala lo que realmente requiere atención humana.',
                },
                {
                  title: 'Decisiones basadas en datos reales',
                  desc: 'Accede a reportes de interacciones, ventas y citas para entender qué funciona y qué mejorar en tu negocio.',
                },
                {
                  title: 'Privacidad y seguridad garantizadas',
                  desc: 'La información de tu negocio y de tus clientes está cifrada y protegida. Tus datos son exclusivamente tuyos.',
                },
              ].map((b) => (
                <div key={b.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mt-0.5">
                    <IconCheck className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm mb-0.5">{b.title}</h4>
                    <p className="text-gray-500 text-sm leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Metrics card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 max-w-sm mx-auto w-full">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm font-medium text-gray-500">Datos de hoy</span>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Clientes atendidos', value: '47',   color: 'text-sb-primary' },
                  { label: 'Tiempo de respuesta', value: '1.8s', color: 'text-green-600' },
                  { label: 'Citas agendadas',     value: '12',  color: 'text-sb-secondary' },
                  { label: 'Ventas registradas',  value: '8',   color: 'text-sb-primary' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500 text-sm">{stat.label}</span>
                    <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400">Panel actualizado en tiempo real</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CASOS DE USO
      ═══════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-sb-primary uppercase tracking-widest mb-3">Industrias</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Para cualquier tipo de negocio
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              SharkByte se adapta a los flujos de atención y ventas de tu industria.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: <IconHeart className="w-6 h-6 text-sb-primary" />,
                name: 'Clínicas y Consultorios',
                desc: 'Agenda citas médicas, envía recordatorios a pacientes, responde consultas frecuentes y transfiere urgencias a tu personal.',
              },
              {
                icon: <IconScissors className="w-6 h-6 text-sb-primary" />,
                name: 'Peluquerías y Barberías',
                desc: 'Los clientes agendan su turno por WhatsApp, eligen el profesional y reciben confirmación. Los "no shows" se reducen con recordatorios automáticos.',
              },
              {
                icon: <IconUtensils className="w-6 h-6 text-sb-primary" />,
                name: 'Restaurantes',
                desc: 'Recibe pedidos, comparte el menú del día, gestiona reservas y confirma disponibilidad sin que tu equipo intervenga en cada mensaje.',
              },
              {
                icon: <IconShoppingBag className="w-6 h-6 text-sb-primary" />,
                name: 'Tiendas y Comercios',
                desc: 'Responde sobre productos, disponibilidad y precios. Registra pedidos confirmados y notifica al equipo para el despacho.',
              },
              {
                icon: <IconBriefcase className="w-6 h-6 text-sb-primary" />,
                name: 'Consultores y Coaches',
                desc: 'Califica prospectos, agenda sesiones de consultoría y comparte materiales automáticamente según el interés de cada cliente.',
              },
              {
                icon: <IconBolt className="w-6 h-6 text-sb-primary" />,
                name: 'Servicios a Domicilio',
                desc: 'Solicita información del servicio, agenda visitas técnicas y confirma la atención con datos completos del cliente y la ubicación.',
              },
            ].map((item) => (
              <div key={item.name} className="rounded-xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-sb-bg flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.name}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          INTEGRACIONES
      ═══════════════════════════════════════════════════════ */}
      <section className="py-16" style={{ background: '#f5f7fa' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-sb-primary uppercase tracking-widest mb-3">Integraciones</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              Compatible con las herramientas que ya usas
            </h2>
            <p className="text-gray-500 max-w-lg mx-auto text-sm">
              SharkByte se conecta con las plataformas más usadas por negocios en Latinoamérica, sin configuraciones complicadas.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: <IconWhatsApp className="w-9 h-9 text-green-500" />, name: 'WhatsApp Business', detail: 'Canal principal de atención' },
              { icon: <IconGoogle className="w-9 h-9" />,                  name: 'Google Calendar',   detail: 'Agendamiento y citas' },
              { icon: <IconSheets className="w-9 h-9 text-green-600" />,   name: 'Google Sheets',     detail: 'Registro y exportación' },
              { icon: <IconBrain className="w-9 h-9 text-sb-primary" />,   name: 'Inteligencia Artificial', detail: 'Motor de respuestas' },
              { icon: <IconBell className="w-9 h-9 text-sb-primary" />,    name: 'Notificaciones',    detail: 'Alertas por correo' },
            ].map((item) => (
              <div key={item.name}
                className="flex flex-col items-center bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow w-40 text-center">
                <div className="mb-3">{item.icon}</div>
                <div className="font-semibold text-gray-900 text-xs">{item.name}</div>
                <div className="text-gray-400 text-[11px] mt-0.5">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PRECIOS
      ═══════════════════════════════════════════════════════ */}
      <section id="precios" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-sb-primary uppercase tracking-widest mb-3">Precios</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Planes simples y transparentes
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Sin cargos ocultos. Sin contratos de permanencia. Cambia o cancela cuando quieras.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => (
              <div key={plan.name}
                className={`relative bg-white rounded-2xl p-7 ${plan.highlight ? 'border-2 border-sb-primary shadow-xl' : 'border border-gray-100 shadow-sm'}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-sb-primary text-white text-[11px] font-bold rounded-full px-4 py-1">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-gray-400 text-sm pb-0.5">{plan.period}</span>
                  </div>
                  {plan.subPrice && <p className="text-gray-400 text-sm mt-1">{plan.subPrice}</p>}
                </div>

                <ul className="space-y-3 mb-7">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <IconCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600 text-sm">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link to={plan.ctaTo}
                  className={`block w-full text-center rounded-xl px-4 py-3 font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? 'bg-sb-primary text-white hover:bg-sb-secondary'
                      : 'border border-sb-primary text-sb-primary hover:bg-sb-bg'
                  }`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-400 text-sm mt-8">
            Todos los planes incluyen acceso completo al panel y soporte por correo.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TESTIMONIOS
      ═══════════════════════════════════════════════════════ */}
      <section className="py-20" style={{ background: '#f5f7fa' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-sb-primary uppercase tracking-widest mb-3">Testimonios</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Negocios reales que transformaron su operación con SharkByte.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                initials: 'MG',
                name: 'María González',
                business: 'Clínica Dental Bogotá',
                quote: 'Reducimos un 80% el tiempo de respuesta a pacientes. Ahora la IA agenda citas, resuelve dudas y escala los casos urgentes a nuestro equipo. Nuestro personal se concentra en lo que realmente importa.',
              },
              {
                initials: 'CR',
                name: 'Carlos Rodríguez',
                business: 'Barbería El Corte',
                quote: 'Mis clientes agendan solos desde WhatsApp, reciben recordatorio el día anterior y confirman con un mensaje. Los "no shows" bajaron un 60% desde que usamos SharkByte.',
              },
              {
                initials: 'AL',
                name: 'Ana López',
                business: 'Tienda Online Moda',
                quote: 'Las ventas aumentaron desde que el asistente responde preguntas de tallas, disponibilidad y envíos a cualquier hora. Los clientes reciben respuesta inmediata, sin importar cuándo escriban.',
              },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-sm transition-shadow">
                <div className="flex gap-0.5 mb-5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <IconStar key={s} className="w-4 h-4 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sb-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-400 text-xs">{t.business}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════ */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-sb-primary uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Preguntas frecuentes
            </h2>
            <p className="text-gray-500">Resolvemos tus dudas antes de que las tengas.</p>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left">
                  <span className="font-semibold text-gray-900 text-sm sm:text-base pr-4">{faq.q}</span>
                  <span className={`flex-shrink-0 transition-transform duration-200 text-sb-primary ${openFaq === i ? 'rotate-180' : ''}`}>
                    <IconChevronDown className="w-5 h-5" />
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${openFaq === i ? 'max-h-56 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="px-6 pb-5 text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CTA FINAL
      ═══════════════════════════════════════════════════════ */}
      <section
        className="py-24 text-center"
        style={{ background: 'linear-gradient(140deg, #022859 0%, #153959 55%, #1a4a6e 100%)' }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5">
            Empieza a automatizar tu negocio hoy
          </h2>
          <p className="text-white/65 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Únete a cientos de negocios que ya usan SharkByte para atender más clientes,
            vender más y dedicar su tiempo a lo que realmente importa.
          </p>
          <Link to="/register"
            className="inline-block bg-white text-sb-primary hover:bg-gray-100 rounded-xl px-10 py-4 text-base font-bold transition-colors shadow-lg shadow-black/20">
            Crear cuenta gratis
          </Link>
          <p className="text-white/35 text-sm mt-6">
            Sin tarjeta de crédito&nbsp;&nbsp;·&nbsp;&nbsp;Configuración en minutos&nbsp;&nbsp;·&nbsp;&nbsp;Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════ */}
      <footer className="bg-sb-dark text-white py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-10">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/Logo.png" alt="SharkByte" className="h-8 w-auto brightness-0 invert" />
                <span className="font-bold text-lg">SharkByte</span>
              </div>
              <p className="text-white/45 text-sm leading-relaxed max-w-xs">
                Plataforma de automatización empresarial con inteligencia artificial para negocios que quieren crecer sin crecer su equipo.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white/90 mb-4 text-xs uppercase tracking-wider">Producto</h4>
              <ul className="space-y-2.5">
                {['Servicios', 'Precios', 'Integraciones'].map((item) => (
                  <li key={item}>
                    <button
                      onClick={() => scrollToSection(item === 'Servicios' ? 'servicios' : item === 'Precios' ? 'precios' : 'servicios')}
                      className="text-white/45 hover:text-white text-sm transition-colors">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white/90 mb-4 text-xs uppercase tracking-wider">Empresa</h4>
              <ul className="space-y-2.5">
                {['Nosotros', 'Blog', 'Contacto'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-white/45 hover:text-white text-sm transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white/90 mb-4 text-xs uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2.5">
                {['Privacidad', 'Términos de uso', 'Soporte'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-white/45 hover:text-white text-sm transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-7 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/35 text-sm">
              &copy; {new Date().getFullYear()} SharkByte. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-4">
              {[
                { icon: <IconLinkedIn />, label: 'LinkedIn' },
                { icon: <IconInstagram />, label: 'Instagram' },
              ].map((s) => (
                <a key={s.label} href="#" aria-label={s.label}
                  className="text-white/35 hover:text-white transition-colors">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
