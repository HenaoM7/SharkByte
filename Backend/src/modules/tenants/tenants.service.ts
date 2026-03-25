import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Tenant, TenantStatus } from './tenants.schema';
import { Subscription } from '../billing/schemas/subscription.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { QueryTenantsDto } from './dto/query-tenants.dto';
import { PlansService } from '../plans/plans.service';
import { PaginatedResult } from '../../common/dto/pagination.dto';

interface RequestingUser {
  role: string;
  userId?: string;
}

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    @InjectConnection() private connection: Connection,
    private plansService: PlansService,
    private config: ConfigService,
  ) {}

  async create(dto: CreateTenantDto, userId?: string): Promise<Tenant> {
    const exists = await this.tenantModel.findOne({ phone: dto.phone });
    if (exists) throw new ConflictException('Este número de WhatsApp ya está registrado');

    const plan = await this.plansService.findByName(dto.planName || 'free');
    const tenantId = `tenant_${dto.phone.replace(/\D/g, '')}`;

    // Todos los tenants inician inactivos — la activación requiere pago confirmado
    const tenant = await this.tenantModel.create({
      tenantId,
      name: dto.name,
      phone: dto.phone,
      email: dto.email.toLowerCase(),
      plan: plan._id,
      config: dto.config || {},
      status: 'inactive',
      isActive: false,
      ...(userId && { userId }),
    });

    return tenant.populate('plan');
  }

  async setOwner(tenantId: string, userId: string): Promise<void> {
    await this.tenantModel.updateOne({ tenantId }, { userId });
  }

  async findAll(query?: QueryTenantsDto, requestingUser?: RequestingUser): Promise<PaginatedResult<Tenant>> {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: any = { deletedAt: null };

    // Los owners solo ven sus propios tenants
    if (requestingUser?.role === 'owner' && requestingUser.userId) {
      filter.userId = requestingUser.userId;
    }

    if (query?.search) {
      const q = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape ReDoS
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { tenantId: { $regex: q, $options: 'i' } },
      ];
    }

    if (query?.status) filter.status = query.status;

    const sortField = query?.sortBy ?? 'createdAt';
    const sortDir = query?.sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.tenantModel
        .find(filter)
        .populate('plan', '-__v')
        .select('-__v -evolutionInstance.apiKey -googleCredentials.privateKey')
        .sort({ [sortField]: sortDir } as any)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.tenantModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantModel
      .findOne({ tenantId, deletedAt: null })
      .populate('plan', '-__v');
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    return tenant;
  }

  async findByPhone(phone: string): Promise<Tenant> {
    const tenant = await this.tenantModel
      .findOne({ phone, deletedAt: null })
      .populate('plan', '-__v');
    if (!tenant) throw new NotFoundException(`Tenant con phone ${phone} no encontrado`);
    return tenant;
  }

  async findByInstance(instanceName: string): Promise<Tenant | null> {
    return this.tenantModel
      .findOne({ 'evolutionInstance.instanceName': instanceName, deletedAt: null })
      .populate('plan', '-__v');
  }

  async updateConfig(tenantId: string, config: Record<string, any>): Promise<Tenant> {
    const tenant = await this.tenantModel
      .findOneAndUpdate({ tenantId, deletedAt: null }, { $set: { config } }, { new: true })
      .populate('plan', '-__v');
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    return tenant;
  }

  private async setWebhook(instanceName: string, apiUrl?: string, apiKey?: string): Promise<void> {
    const isDev = this.config.get<string>('NODE_ENV') !== 'production';
    const rawUrl = apiUrl?.trim() || this.config.get<string>('EVOLUTION_API_URL') || 'http://localhost:8080';
    const resolvedUrl = (isDev ? rawUrl.replace('eco_evolution', 'localhost') : rawUrl).replace(/\/$/, '');
    const resolvedKey = apiKey?.trim() || this.config.get<string>('EVOLUTION_API_KEY') || '';
    const webhookUrl = this.config.get<string>('N8N_WEBHOOK_URL') || 'http://eco_n8n:5678/webhook/whatsapp-inbound';

    try {
      const res = await fetch(`${resolvedUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: resolvedKey },
        body: JSON.stringify({
          webhook: {
            url: webhookUrl,
            enabled: true,
            events: ['MESSAGES_UPSERT'],
            webhookByEvents: false,
            webhookBase64: false,
          },
        }),
      });
      if (res.ok) {
        this.logger.log(`Webhook configurado: ${instanceName} → ${webhookUrl}`);
      } else {
        const err = await res.json().catch(() => ({}));
        this.logger.warn(`Webhook setup warning for '${instanceName}': ${JSON.stringify(err)}`);
      }
    } catch (err: any) {
      this.logger.warn(`No se pudo configurar webhook para '${instanceName}': ${err?.message}`);
    }
  }

  async updateEvolutionInstance(
    tenantId: string,
    data: { instanceName?: string; status?: string; apiUrl?: string; apiKey?: string },
  ): Promise<Tenant> {
    // Merge con los campos existentes (no sobreescribir apiKey si no se envía)
    const update: any = {};
    if (data.instanceName !== undefined) update['evolutionInstance.instanceName'] = data.instanceName;
    if (data.status !== undefined) update['evolutionInstance.status'] = data.status;
    if (data.apiUrl !== undefined) update['evolutionInstance.apiUrl'] = data.apiUrl;
    if (data.apiKey !== undefined) update['evolutionInstance.apiKey'] = data.apiKey;

    const tenant = await this.tenantModel
      .findOneAndUpdate(
        { tenantId, deletedAt: null },
        { $set: update },
        { new: true },
      )
      .populate('plan', '-__v');
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);

    // Auto-configure webhook when linking an instance
    if (data.instanceName?.trim()) {
      await this.setWebhook(data.instanceName, data.apiUrl, data.apiKey);
    }

    return tenant;
  }

  async activate(tenantId: string): Promise<Tenant> {
    const existing = await this.tenantModel.findOne({ tenantId, deletedAt: null });
    if (!existing) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);

    // Permite activar si el tenant tiene credenciales propias (apiUrl + apiKey)
    // O si ya tiene una instancia creada vía QR (usa las credenciales globales del servidor)
    const hasOwnCredentials = !!(
      existing.evolutionInstance?.apiUrl?.trim() &&
      existing.evolutionInstance?.apiKey?.trim()
    );
    const hasInstance = !!(existing.evolutionInstance?.instanceName?.trim());

    if (!hasOwnCredentials && !hasInstance) {
      throw new BadRequestException(
        'No se puede activar el tenant: conecta WhatsApp vía QR o configura las credenciales de Evolution API primero.',
      );
    }

    const tenant = await this.tenantModel
      .findOneAndUpdate(
        { tenantId, deletedAt: null },
        { isActive: true, status: 'active' },
        { new: true },
      )
      .populate('plan', '-__v');
    return tenant;
  }

  async updateStatus(tenantId: string, status: TenantStatus): Promise<Tenant> {
    const isActive = status === 'active';
    const tenant = await this.tenantModel
      .findOneAndUpdate(
        { tenantId, deletedAt: null },
        { status, isActive },
        { new: true },
      )
      .populate('plan', '-__v');
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    return tenant;
  }

  async updatePlan(tenantId: string, planName: string): Promise<Tenant> {
    const plan = await this.plansService.findByName(planName);
    const tenant = await this.tenantModel
      .findOneAndUpdate({ tenantId, deletedAt: null }, { plan: plan._id }, { new: true })
      .populate('plan', '-__v');
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);

    // Sincronizar el estado de la suscripción con el plan asignado
    if (planName === 'pro' || planName === 'enterprise') {
      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + (planName === 'enterprise' ? 12 : 1));
      await this.subscriptionModel.findOneAndUpdate(
        { tenantId },
        {
          tenantId,
          status: 'authorized',
          planName,
          currentPeriodStart: now,
          currentPeriodEnd: end,
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
        { upsert: true },
      );
    } else if (planName === 'free') {
      // Cancelar suscripción existente al regresar a free
      await this.subscriptionModel.findOneAndUpdate(
        { tenantId, status: { $in: ['authorized', 'pending', 'paused'] } },
        { status: 'cancelled', canceledAt: new Date() },
      );
    }

    return tenant;
  }

  async deactivate(tenantId: string): Promise<{ ok: boolean }> {
    const tenant = await this.tenantModel.findOneAndUpdate(
      { tenantId, deletedAt: null },
      { isActive: false, status: 'inactive' },
      { new: true },
    );
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    return { ok: true };
  }

  async softDelete(tenantId: string): Promise<{ ok: boolean }> {
    const tenant = await this.tenantModel.findOneAndUpdate(
      { tenantId, deletedAt: null },
      { deletedAt: new Date(), isActive: false, status: 'cancelled' },
      { new: true },
    );
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    return { ok: true };
  }

  async hardDelete(tenantId: string): Promise<{ ok: boolean; deleted: Record<string, number> }> {
    const tenant = await this.tenantModel.findOne({ tenantId });
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);

    const db = this.connection.db;
    const deleted: Record<string, number> = {};

    // 1. Borrar archivos en DO Spaces (best-effort, no bloquea si falla)
    try {
      await this.deleteDoSpacesFiles(tenantId);
    } catch (err) {
      this.logger.warn(`hardDelete ${tenantId}: DO Spaces cleanup parcial — ${err.message}`);
    }

    // 2. Eliminar de cada colección relacionada
    const collections: Array<[string, Record<string, any>]> = [
      ['tenant_configs',      { tenantId }],
      ['products',            { tenantId }],
      ['sales',               { tenantId }],
      ['google_integrations', { tenantId }],
      ['catalog_pdfs',        { tenantId }],
      ['automation_rules',    { tenantId }],
      ['subscriptions',       { tenantId }],
    ];

    for (const [col, filter] of collections) {
      try {
        const res = await db.collection(col).deleteMany(filter);
        if (res.deletedCount > 0) deleted[col] = res.deletedCount;
      } catch (err) {
        this.logger.warn(`hardDelete ${tenantId}: no pudo borrar ${col} — ${err.message}`);
      }
    }

    // 3. Limpiar referencia tenantId del usuario owner
    try {
      await db.collection('users').updateMany({ tenantId }, { $unset: { tenantId: '' } });
    } catch (err) {
      this.logger.warn(`hardDelete ${tenantId}: no pudo limpiar users — ${err.message}`);
    }

    // 4. Eliminar el tenant (definitivo)
    await this.tenantModel.deleteOne({ tenantId });
    deleted['tenants'] = 1;

    this.logger.log(`hardDelete completado para ${tenantId}: ${JSON.stringify(deleted)}`);
    return { ok: true, deleted };
  }

  private async deleteDoSpacesFiles(tenantId: string): Promise<void> {
    const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3').catch(() => null as any);
    if (!S3Client) return; // SDK no instalado

    const region    = this.config.get('DO_SPACES_REGION') || 'nyc3';
    const endpoint  = this.config.get('DO_SPACES_ENDPOINT') || `https://${region}.digitaloceanspaces.com`;
    const bucket    = this.config.get('DO_SPACES_BUCKET');
    const accessKey = this.config.get('DO_SPACES_KEY');
    const secretKey = this.config.get('DO_SPACES_SECRET');
    if (!bucket || !accessKey) return;

    const s3 = new S3Client({ region, endpoint, credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } });

    const prefix = `tenants/${tenantId}/`;
    let token: string | undefined;
    do {
      const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
      if (list.Contents?.length) {
        await s3.send(new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: list.Contents.map((o) => ({ Key: o.Key })) },
        }));
        this.logger.log(`DO Spaces: eliminados ${list.Contents.length} archivos de ${prefix}`);
      }
      token = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (token);
  }

  async updateGoogleCredentials(
    tenantId: string,
    data: {
      enabled?: boolean;
      clientEmail?: string;
      privateKey?: string;
      spreadsheetId?: string;
      sheetName?: string;
      calendarId?: string;
    },
  ): Promise<Tenant> {
    const update: any = {};
    if (data.enabled       !== undefined) update['googleCredentials.enabled']       = data.enabled;
    if (data.clientEmail   !== undefined) update['googleCredentials.clientEmail']   = data.clientEmail;
    if (data.privateKey    !== undefined) update['googleCredentials.privateKey']    = data.privateKey;
    if (data.spreadsheetId !== undefined) update['googleCredentials.spreadsheetId'] = data.spreadsheetId;
    if (data.sheetName     !== undefined) update['googleCredentials.sheetName']     = data.sheetName;
    if (data.calendarId    !== undefined) update['googleCredentials.calendarId']    = data.calendarId;

    const tenant = await this.tenantModel
      .findOneAndUpdate({ tenantId, deletedAt: null }, { $set: update }, { new: true })
      .populate('plan', '-__v');
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado`);
    return tenant;
  }

  async restore(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantModel
      .findOneAndUpdate(
        { tenantId, deletedAt: { $ne: null } },
        { deletedAt: null, status: 'inactive', isActive: false },
        { new: true },
      )
      .populate('plan', '-__v');
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} no encontrado o no está eliminado`);
    return tenant;
  }
}
