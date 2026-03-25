import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

class BusinessHours {
  timezone: string;
  schedule: Array<{
    day: string;
    open: string;
    close: string;
    isOpen: boolean;
  }>;
}

class CatalogItem {
  name: string;
  description?: string;
  price?: number;
  category?: string;
  available: boolean;
}

class FaqItem {
  question: string;
  answer: string;
}

class HumanAgent {
  name: string;
  phone: string;
  available: boolean;
}

class AppointmentEmployee {
  name: string;
  calendarId: string;   // Google Calendar ID específico del empleado (vacío = usa el calendario principal)
  available: boolean;
  services: string[];   // Servicios que presta (vacío = todos)
}

class AppointmentConfig {
  enabled: boolean;
  serviceDurationMinutes: number;  // Duración por defecto de la cita (minutos)
  services: string[];               // Lista de servicios disponibles
  employees: AppointmentEmployee[]; // Empleados que prestan el servicio
}

class Automations {
  sales: boolean;
  support: boolean;
  reservations: boolean;
  payments: boolean;
  alerts: boolean;
}

class PaymentConfig {
  accountNumber: string;
  accountType: string;   // savings | checking
  bankName: string;
  accountHolder: string;
  confirmationMethod: string; // manual | automatic
  qrImageUrl: string;    // URL pública de la imagen QR de pago
}

class SalesConfig {
  requireCustomerName: boolean;    // Pedir nombre completo al cliente
  requireCustomerAddress: boolean; // Pedir dirección de entrega
  requireCustomerId: boolean;      // Pedir cédula/documento de identidad
  deliveryType: string;            // pickup | delivery | both
  deliveryFee: number;             // Costo de domicilio (0 = gratis)
  minimumOrderAmount: number;      // Monto mínimo de pedido (0 = sin mínimo)
  confirmationInstructions: string; // Instrucciones extra para la IA al confirmar venta
}

class BusinessAddress {
  street: string;    // Dirección principal (Calle, Carrera, Av., etc.)
  city: string;      // Ciudad
  state: string;     // Departamento o Estado
  reference: string; // Punto de referencia (frente al parque, local 203, etc.)
  postalCode: string;
}

@Schema({ timestamps: true, collection: 'tenant_configs' })
export class TenantConfig extends Document {
  // Vínculo al tenant
  @Prop({ required: true, unique: true })
  tenantId: string;

  // Identidad del negocio
  @Prop({ default: '' })
  businessName: string;

  @Prop({ default: '' })
  businessType: string; // restaurante, tienda, servicio, clínica, etc.

  @Prop({ default: '' })
  businessTypeCustom: string; // Detalle cuando businessType === 'otro'

  @Prop({ default: 'Colombia' })
  country: string;

  @Prop({ default: '' })
  targetAudience: string; // descripción del cliente ideal

  @Prop({ default: '' })
  agentName: string; // Nombre del agente IA (cómo se presenta a clientes)

  @Prop({ default: 'COP' })
  currency: string; // Moneda principal: COP, USD, MXN, etc.

  @Prop({ default: '' })
  teamSize: string; // Tamaño del equipo: "1", "2-5", "6-20", etc.

  // Comunicación
  @Prop({ default: '' })
  welcomeMessage: string;

  @Prop({ default: 'amigable' })
  tone: string; // formal, informal, amigable, profesional

  @Prop({ default: 'es' })
  language: string;

  @Prop({ type: [String], default: [] })
  prohibitedWords: string[];

  // Operaciones
  @Prop({ type: Object, default: { timezone: 'America/Bogota', schedule: [] } })
  businessHours: BusinessHours;

  @Prop({ default: 'En este momento estamos fuera de horario. Te responderemos pronto.' })
  outOfHoursMessage: string;

  // Catálogo / Menú
  @Prop({ type: [Object], default: [] })
  catalog: CatalogItem[];

  // FAQs
  @Prop({ type: [Object], default: [] })
  faq: FaqItem[];

  // Respuestas automáticas (trigger → respuesta)
  @Prop({ type: Object, default: {} })
  autoResponses: Record<string, string>;

  // Comportamiento de la IA
  @Prop({ default: '' })
  aiInstructions: string; // Prompt base para el agente

  @Prop({ type: [String], default: [] })
  allowedActions: string[]; // lo que la IA puede hacer

  @Prop({ type: [String], default: [] })
  restrictions: string[]; // lo que la IA NO puede decir ni prometer

  // Automatizaciones habilitadas
  @Prop({
    type: Object,
    default: { sales: false, support: false, reservations: false, payments: false, alerts: false },
  })
  automations: Automations;

  // Contacto y ubicación
  @Prop({ default: '' })
  location: string; // Campo legacy — usar businessAddress para datos estructurados

  @Prop({
    type: Object,
    default: () => ({ street: '', city: '', state: '', reference: '', postalCode: '' }),
  })
  businessAddress: BusinessAddress;

  @Prop({ type: [String], default: [] })
  paymentMethods: string[];

  // Configuración de pagos bancarios
  @Prop({
    type: Object,
    default: () => ({
      accountNumber: '',
      accountType: 'savings',
      bankName: '',
      accountHolder: '',
      confirmationMethod: 'manual',
      qrImageUrl: '',
    }),
  })
  paymentConfig: PaymentConfig;

  // Configuración de ventas y datos del cliente
  @Prop({
    type: Object,
    default: () => ({
      requireCustomerName: false,
      requireCustomerAddress: false,
      requireCustomerId: false,
      deliveryType: 'both',
      deliveryFee: 0,
      minimumOrderAmount: 0,
      confirmationInstructions: '',
    }),
  })
  salesConfig: SalesConfig;

  // Agentes humanos para escalamiento
  @Prop({ type: [Object], default: [] })
  humanAgents: HumanAgent[];

  // Configuración de agendamiento con empleados
  @Prop({
    type: Object,
    default: () => ({ enabled: false, serviceDurationMinutes: 60, services: [], employees: [] }),
  })
  appointmentConfig: AppointmentConfig;

  // Link al catálogo externo (Google Drive, etc.)
  @Prop({ default: '' })
  catalogDriveUrl: string;

  // Meta
  @Prop({ default: false })
  isComplete: boolean;

  @Prop({ default: 1 })
  version: number;
}

export const TenantConfigSchema = SchemaFactory.createForClass(TenantConfig);
