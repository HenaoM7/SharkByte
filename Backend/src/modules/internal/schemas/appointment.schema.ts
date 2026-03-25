import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AppointmentDocument = Appointment & Document;

@Schema({ collection: 'appointments', timestamps: true })
export class Appointment {
  @Prop({ required: true }) tenantId: string;
  @Prop({ required: true }) clientPhone: string;
  @Prop() clientName: string;
  @Prop() clientEmail: string;
  @Prop() service: string;
  @Prop() employeeName: string;

  // Fecha y hora de la cita (para cálculo de recordatorios)
  @Prop({ required: true }) appointmentDate: string;   // YYYY-MM-DD
  @Prop({ required: true }) appointmentTime: string;   // HH:MM
  @Prop() appointmentEndTime: string;                  // HH:MM
  @Prop({ type: Date, required: true }) appointmentDateTime: Date; // para queries de tiempo

  @Prop({ default: 'confirmed' }) status: string; // confirmed | cancelled
  @Prop() calEventId: string;                     // Google Calendar event ID

  // Recordatorios
  @Prop({ default: false }) reminder24hSent: boolean;
  @Prop({ default: false }) reminder1hSent: boolean;

  // Evolution API para enviar WhatsApp
  @Prop() evolutionApiUrl: string;
  @Prop() evolutionApiKey: string;

  createdAt: Date;
  updatedAt: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Index para queries de recordatorios
AppointmentSchema.index({ appointmentDateTime: 1, status: 1 });
AppointmentSchema.index({ tenantId: 1, clientPhone: 1 });
