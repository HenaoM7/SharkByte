import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body,
  UseGuards, Req, ForbiddenException, BadRequestException, NotFoundException,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Appointment, AppointmentDocument } from '../internal/schemas/appointment.schema';

class CreateAppointmentDto {
  @IsString() clientPhone: string;
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsString() clientEmail?: string;
  @IsOptional() @IsString() service?: string;
  @IsOptional() @IsString() employeeName?: string;
  @IsString() appointmentDate: string;      // YYYY-MM-DD
  @IsString() appointmentTime: string;      // HH:MM
  @IsOptional() @IsString() appointmentEndTime?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() calEventId?: string;
}

class UpdateAppointmentDto {
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsString() clientEmail?: string;
  @IsOptional() @IsString() service?: string;
  @IsOptional() @IsString() employeeName?: string;
  @IsOptional() @IsString() appointmentDate?: string;
  @IsOptional() @IsString() appointmentTime?: string;
  @IsOptional() @IsString() appointmentEndTime?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() calEventId?: string;
}

@ApiTags('Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin', 'owner', 'viewer')
@Controller('api/v1/appointments')
export class AppointmentsController {
  constructor(
    @InjectModel(Appointment.name) private appointmentModel: Model<AppointmentDocument>,
  ) {}

  private assertOwnership(user: any, tenantId: string) {
    if (user.role === 'super_admin' || user.role === 'admin') return;
    if (user.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a este tenant.');
  }

  @Get()
  @ApiOperation({ summary: 'Listar citas del tenant' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Req() req: any,
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    this.assertOwnership(req.user, tenantId);
    const filter: any = { tenantId };
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.appointmentModel
        .find(filter)
        .sort({ appointmentDateTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.appointmentModel.countDocuments(filter),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  @Post()
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Crear cita manualmente' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ type: CreateAppointmentDto })
  async create(
    @Req() req: any,
    @Query('tenantId') tenantId: string,
    @Body() body: CreateAppointmentDto,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    this.assertOwnership(req.user, tenantId);

    // Build appointmentDateTime from date + time for time-based queries
    const appointmentDateTime = new Date(`${body.appointmentDate}T${body.appointmentTime}:00`);
    if (isNaN(appointmentDateTime.getTime())) {
      throw new BadRequestException('Fecha u hora de cita inválida');
    }

    return this.appointmentModel.create({
      ...body,
      tenantId,
      appointmentDateTime,
      status: body.status ?? 'confirmed',
    });
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Actualizar cita' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ type: UpdateAppointmentDto })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() body: UpdateAppointmentDto,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    this.assertOwnership(req.user, tenantId);

    const update: any = { ...body };

    // Recalculate appointmentDateTime if date or time changes
    const existing = await this.appointmentModel.findOne({ _id: id, tenantId }).lean();
    if (!existing) throw new NotFoundException('Cita no encontrada');

    const date = body.appointmentDate ?? existing.appointmentDate;
    const time = body.appointmentTime ?? existing.appointmentTime;
    if (body.appointmentDate || body.appointmentTime) {
      update.appointmentDateTime = new Date(`${date}T${time}:00`);
    }

    const result = await this.appointmentModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: update }, { new: true })
      .lean();

    if (!result) throw new NotFoundException('Cita no encontrada');
    return result;
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Eliminar cita' })
  @ApiQuery({ name: 'tenantId', required: true })
  async remove(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    this.assertOwnership(req.user, tenantId);

    const result = await this.appointmentModel.findOneAndDelete({ _id: id, tenantId });
    if (!result) throw new NotFoundException('Cita no encontrada');
    return { ok: true, deleted: id };
  }
}
