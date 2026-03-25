import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { GoogleIntegration } from './google-integration.schema';

const GOOGLE_TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const GOOGLE_AUTH_URL   = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_USERINFO   = 'https://www.googleapis.com/oauth2/v2/userinfo';
const CALENDAR_BASE     = 'https://www.googleapis.com/calendar/v3';
const SHEETS_BASE       = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_BASE        = 'https://www.googleapis.com/drive/v3';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

// ─── Encryption helpers ───────────────────────────────────────────────────────

function getEncKey(config: ConfigService): Buffer {
  const hex = config.get<string>('GOOGLE_ENCRYPTION_KEY');
  if (!hex || hex.length < 64) throw new Error('GOOGLE_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  return Buffer.from(hex.slice(0, 64), 'hex');
}

function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(stored: string, key: Buffer): string {
  const [ivHex, encrypted] = stored.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class GoogleIntegrationService {
  private readonly logger = new Logger(GoogleIntegrationService.name);

  constructor(
    @InjectModel(GoogleIntegration.name)
    private model: Model<GoogleIntegration>,
    private config: ConfigService,
  ) {}

  private get clientId() { return this.config.get<string>('GOOGLE_CLIENT_ID'); }
  private get clientSecret() { return this.config.get<string>('GOOGLE_CLIENT_SECRET'); }
  private get redirectUri() { return this.config.get<string>('GOOGLE_REDIRECT_URI'); }
  private get frontendUrl() { return this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173'; }

  // ─── Auth URL ─────────────────────────────────────────────────────────────

  getAuthUrl(tenantId: string): string {
    if (!this.clientId || !this.redirectUri) {
      throw new BadRequestException('Google OAuth no está configurado en este servidor. Contacta al administrador.');
    }
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',      // force refresh_token on every auth
      state: tenantId,
    });
    return `${GOOGLE_AUTH_URL}?${params}`;
  }

  // ─── OAuth Callback ───────────────────────────────────────────────────────

  async handleCallback(code: string, state: string): Promise<string> {
    const tenantId = state;

    // Exchange authorization code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      this.logger.error(`Token exchange failed for tenant ${tenantId}: ${err}`);
      throw new BadRequestException('Error al intercambiar el código de autorización con Google');
    }

    const tokens: any = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Get user email
    const userRes = await fetch(GOOGLE_USERINFO, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo: any = userRes.ok ? await userRes.json() : {};

    const key = getEncKey(this.config);
    const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000);

    await this.model.findOneAndUpdate(
      { tenantId },
      {
        tenantId,
        googleEmail: userInfo.email ?? '',
        accessToken: encrypt(access_token, key),
        ...(refresh_token && { refreshToken: encrypt(refresh_token, key) }),
        tokenExpiry,
        isConnected: true,
        connectedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    this.logger.log(`Google connected for tenant ${tenantId} (${userInfo.email})`);
    return `${this.frontendUrl}/app/integrations?google=connected`;
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  async getStatus(tenantId: string) {
    const doc = await this.model.findOne({ tenantId }).lean();
    if (!doc || !doc.isConnected) {
      return { connected: false };
    }
    return {
      connected: true,
      googleEmail: doc.googleEmail,
      calendarId: doc.calendarId,
      spreadsheetId: doc.spreadsheetId,
      spreadsheetUrl: doc.spreadsheetUrl,
      connectedAt: doc.connectedAt,
    };
  }

  // ─── Disconnect ───────────────────────────────────────────────────────────

  async disconnect(tenantId: string): Promise<void> {
    await this.model.findOneAndUpdate({ tenantId }, {
      isConnected: false,
      accessToken: null,
      refreshToken: null,
      googleEmail: null,
      tokenExpiry: null,
    });
    this.logger.log(`Google disconnected for tenant ${tenantId}`);
  }

  // ─── Update config ────────────────────────────────────────────────────────

  async updateConfig(tenantId: string, calendarId?: string, spreadsheetId?: string): Promise<void> {
    await this.model.findOneAndUpdate(
      { tenantId },
      { ...(calendarId && { calendarId }), ...(spreadsheetId && { spreadsheetId }) },
      { upsert: true },
    );
  }

  // ─── Internal token access ────────────────────────────────────────────────

  async getDecryptedTokens(tenantId: string) {
    const doc = await this.model.findOne({ tenantId }).lean();
    if (!doc || !doc.isConnected) throw new NotFoundException(`Integración Google no conectada para ${tenantId}`);

    const key = getEncKey(this.config);
    let accessToken = decrypt(doc.accessToken, key);

    // Auto-refresh if expired (or within 5 minutes of expiry)
    if (doc.tokenExpiry && new Date(doc.tokenExpiry).getTime() < Date.now() + 5 * 60 * 1000) {
      if (!doc.refreshToken) throw new BadRequestException('Token expirado y sin refresh token — reconecta Google');
      accessToken = await this.refreshAccessToken(tenantId, decrypt(doc.refreshToken, key));
    }

    return {
      accessToken,
      calendarId: doc.calendarId || 'primary',
      spreadsheetId: doc.spreadsheetId,
      googleEmail: doc.googleEmail,
    };
  }

  private async refreshAccessToken(tenantId: string, refreshToken: string): Promise<string> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) throw new BadRequestException('No se pudo renovar el token de Google — reconecta la cuenta');

    const data: any = await res.json();
    const key = getEncKey(this.config);
    const tokenExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000);

    await this.model.findOneAndUpdate({ tenantId }, {
      accessToken: encrypt(data.access_token, key),
      tokenExpiry,
    });

    this.logger.log(`Access token refreshed for tenant ${tenantId}`);
    return data.access_token;
  }

  // ─── Google Calendar Operations ───────────────────────────────────────────

  async createCalendarEvent(tenantId: string, event: {
    summary: string;
    description?: string;
    startDateTime: string;  // ISO 8601
    endDateTime: string;    // ISO 8601
    attendeeEmail?: string;
    timeZone?: string;
  }) {
    const { accessToken, calendarId } = await this.getDecryptedTokens(tenantId);
    const timeZone = event.timeZone || 'America/Bogota';

    const body: any = {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.startDateTime, timeZone },
      end:   { dateTime: event.endDateTime,   timeZone },
    };
    if (event.attendeeEmail) body.attendees = [{ email: event.attendeeEmail }];

    const res = await fetch(`${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`Error creando evento en Calendar: ${err}`);
    }

    const created: any = await res.json();
    this.logger.log(`Calendar event created: ${created.id} for tenant ${tenantId}`);
    return { eventId: created.id, htmlLink: created.htmlLink };
  }

  async updateCalendarEvent(tenantId: string, eventId: string, update: {
    summary?: string;
    description?: string;
    startDateTime?: string;
    endDateTime?: string;
    timeZone?: string;
    status?: string;
  }) {
    const { accessToken, calendarId } = await this.getDecryptedTokens(tenantId);
    const timeZone = update.timeZone || 'America/Bogota';

    const body: any = {};
    if (update.summary) body.summary = update.summary;
    if (update.description) body.description = update.description;
    if (update.startDateTime) body.start = { dateTime: update.startDateTime, timeZone };
    if (update.endDateTime)   body.end   = { dateTime: update.endDateTime,   timeZone };
    if (update.status) body.status = update.status;

    const res = await fetch(`${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`Error actualizando evento en Calendar: ${err}`);
    }

    return res.json();
  }

  async deleteCalendarEvent(tenantId: string, eventId: string): Promise<void> {
    const { accessToken, calendarId } = await this.getDecryptedTokens(tenantId);

    const res = await fetch(`${CALENDAR_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok && res.status !== 404) {
      const err = await res.text();
      throw new BadRequestException(`Error eliminando evento: ${err}`);
    }
  }

  // ─── Google Sheets Operations ─────────────────────────────────────────────

  async ensureSpreadsheet(tenantId: string): Promise<string> {
    const doc = await this.model.findOne({ tenantId }).lean();
    if (doc?.spreadsheetId) return doc.spreadsheetId;

    const { accessToken } = await this.getDecryptedTokens(tenantId);

    const res = await fetch(SHEETS_BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        properties: { title: 'SharkByte - Agenda de Citas' },
        sheets: [{
          properties: { title: 'Citas', sheetId: 0 },
          data: [{
            startRow: 0,
            startColumn: 0,
            rowData: [{
              values: ['Fecha', 'Hora', 'Nombre', 'Teléfono', 'Servicio', 'Estado', 'Empleado', 'EventoCalendarId', 'FechaCreación']
                .map((v) => ({ userEnteredValue: { stringValue: v } })),
            }],
          }],
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`Error creando spreadsheet: ${err}`);
    }

    const created: any = await res.json();
    const spreadsheetId = created.spreadsheetId;
    const spreadsheetUrl = created.spreadsheetUrl;

    await this.model.findOneAndUpdate({ tenantId }, { spreadsheetId, spreadsheetUrl });
    this.logger.log(`Spreadsheet created: ${spreadsheetId} for tenant ${tenantId}`);
    return spreadsheetId;
  }

  async readSheetRows(tenantId: string, phone?: string): Promise<string[][]> {
    const spreadsheetId = await this.ensureSpreadsheet(tenantId);
    const { accessToken } = await this.getDecryptedTokens(tenantId);

    const res = await fetch(
      `${SHEETS_BASE}/${spreadsheetId}/values/Citas!A:I`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) return [];

    const data: any = await res.json();
    const rows: string[][] = (data.values || []).slice(1); // skip header

    if (!phone) return rows;
    // Col D (index 3) = telefono, Col F (index 5) = estado
    return rows.filter(r => r[3] === phone && r[5] !== 'Cancelada');
  }

  async appendSheetRow(tenantId: string, row: {
    fecha: string;
    hora: string;
    nombre: string;
    telefono: string;
    servicio: string;
    estado: string;
    empleado?: string;
    eventoCalendarId?: string;
    fechaCreacion?: string;
  }) {
    const spreadsheetId = await this.ensureSpreadsheet(tenantId);
    const { accessToken } = await this.getDecryptedTokens(tenantId);

    const values = [[
      row.fecha,
      row.hora,
      row.nombre,
      row.telefono,
      row.servicio,
      row.estado,
      row.empleado ?? '',
      row.eventoCalendarId ?? '',
      row.fechaCreacion ?? new Date().toISOString().split('T')[0],
    ]];

    const res = await fetch(
      `${SHEETS_BASE}/${spreadsheetId}/values/Citas!A:I:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`Error escribiendo en Sheets: ${err}`);
    }

    return res.json();
  }

  async updateSheetRow(tenantId: string, calEventId: string, update: {
    fecha?: string;
    hora?: string;
    nombre?: string;
    telefono?: string;
    servicio?: string;
    estado?: string;
    empleado?: string;
    eventoCalendarId?: string;
  }) {
    const spreadsheetId = await this.ensureSpreadsheet(tenantId);
    const { accessToken } = await this.getDecryptedTokens(tenantId);

    // Read all rows to find the one with matching calEventId
    const readRes = await fetch(
      `${SHEETS_BASE}/${spreadsheetId}/values/Citas!A:I`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!readRes.ok) throw new BadRequestException('Error leyendo Sheets para actualizar');

    const data: any = await readRes.json();
    const rows: string[][] = data.values || [];
    // New schema: calEventId at col H (index 7). Old schema: calEventId at col G (index 6).
    const calIdPattern = /^[a-z0-9_]{10,}$/;
    const rowIndex = rows.findIndex((r, i) => {
      if (i === 0) return false;
      // new schema: r[7] = calEventId
      if (r[7] === calEventId) return true;
      // old schema: r[6] = calEventId (matches pattern, no employee column)
      if (calIdPattern.test(r[6] || '') && r[6] === calEventId) return true;
      return false;
    });

    if (rowIndex === -1) {
      this.logger.warn(`[Sheets] updateSheetRow: calEventId ${calEventId} no encontrado`);
      return { ok: false, message: 'Fila no encontrada' };
    }

    const existing = rows[rowIndex];
    const newRow = [
      update.fecha      ?? existing[0] ?? '',
      update.hora       ?? existing[1] ?? '',
      update.nombre     ?? existing[2] ?? '',
      update.telefono   ?? existing[3] ?? '',
      update.servicio   ?? existing[4] ?? '',
      update.estado     ?? existing[5] ?? '',
      update.empleado   ?? existing[6] ?? '',
      update.eventoCalendarId ?? existing[7] ?? calEventId,
      existing[8] ?? new Date().toISOString().split('T')[0],
    ];

    // rowIndex+1 because Sheets rows are 1-indexed, +1 for the header
    const range = `Citas!A${rowIndex + 1}:I${rowIndex + 1}`;
    const updateRes = await fetch(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [newRow] }),
      },
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new BadRequestException(`Error actualizando fila en Sheets: ${err}`);
    }

    this.logger.log(`[Sheets] Fila actualizada: ${range} para calEventId=${calEventId}`);
    return updateRes.json();
  }

  async fixSheetHeader(tenantId: string): Promise<{ ok: boolean }> {
    const spreadsheetId = await this.ensureSpreadsheet(tenantId);
    const { accessToken } = await this.getDecryptedTokens(tenantId);
    const headers = ['Fecha', 'Hora', 'Nombre', 'Teléfono', 'Servicio', 'Estado', 'Empleado', 'EventoCalendarId', 'FechaCreación'];
    const res = await fetch(
      `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent('Citas!A1:I1')}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [headers] }),
      },
    );
    if (!res.ok) throw new BadRequestException(`Error actualizando header: ${await res.text()}`);
    this.logger.log(`[Sheets] Header reparado para ${tenantId}`);
    return { ok: true };
  }

  async clearSheetRows(tenantId: string): Promise<{ cleared: number }> {
    const spreadsheetId = await this.ensureSpreadsheet(tenantId);
    const { accessToken } = await this.getDecryptedTokens(tenantId);

    // Read current rows to count them
    const readRes = await fetch(
      `${SHEETS_BASE}/${spreadsheetId}/values/Citas!A:I`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data: any = await readRes.json();
    const rows: string[][] = data.values || [];
    const dataRows = rows.length - 1; // exclude header
    if (dataRows <= 0) return { cleared: 0 };

    // Clear all data rows (keep row 1 = header)
    const clearRes = await fetch(
      `${SHEETS_BASE}/${spreadsheetId}/values/Citas!A2:I${rows.length}:clear`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: '{}',
      },
    );
    if (!clearRes.ok) {
      const err = await clearRes.text();
      throw new BadRequestException(`Error limpiando Sheets: ${err}`);
    }
    this.logger.log(`[Sheets] ${dataRows} filas eliminadas para ${tenantId}`);
    return { cleared: dataRows };
  }
}
