import {
  Controller, Get, Patch, Param, Query, Body, UseGuards, Req, ForbiddenException,
  DefaultValuePipe, ParseIntPipe, Sse, BadRequestException, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConversationsService, conversationEmitter } from './conversations.service';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin', 'owner', 'viewer')
@Controller('api/v1/conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  private assertOwnership(user: any, tenantId: string) {
    if (user.role === 'super_admin' || user.role === 'admin') return;
    if (user.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a este tenant.');
  }

  @Get()
  @ApiOperation({ summary: 'Listar conversaciones del tenant' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'status', required: false, enum: ['open', 'closed', 'escalated'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Req() req: any,
    @Query('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number = 30,
  ) {
    this.assertOwnership(req.user, tenantId);
    return this.conversationsService.findAll(tenantId, { status, page, limit });
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Mensajes de una conversación' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMessages(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    this.assertOwnership(req.user, tenantId);
    return this.conversationsService.getMessages(id, { page, limit });
  }

  @Patch(':id/assign')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Asignar conversación a un agente' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ schema: { properties: { assignedTo: { type: 'string' } }, required: ['assignedTo'] } })
  async assign(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body('assignedTo') assignedTo: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    if (!assignedTo) throw new BadRequestException('assignedTo es requerido');
    this.assertOwnership(req.user, tenantId);
    const result = await this.conversationsService.assign(id, tenantId, assignedTo);
    if (!result) throw new NotFoundException('Conversación no encontrada');
    return result;
  }

  @Patch(':id/status')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Cambiar estado de una conversación' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiBody({ schema: { properties: { status: { type: 'string', enum: ['open', 'closed', 'escalated'] } }, required: ['status'] } })
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body('status') status: string,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId es requerido');
    if (!['open', 'closed', 'escalated'].includes(status)) {
      throw new BadRequestException('status debe ser open, closed o escalated');
    }
    this.assertOwnership(req.user, tenantId);
    const result = await this.conversationsService.updateStatus(id, tenantId, status);
    if (!result) throw new NotFoundException('Conversación no encontrada');
    return result;
  }

  // Server-Sent Events — real-time updates for the chat view
  @Sse('stream')
  @ApiOperation({ summary: 'SSE stream de nuevos mensajes por tenant' })
  @ApiQuery({ name: 'tenantId', required: true })
  stream(@Query('tenantId') tenantId: string, @Req() req: Request): Observable<any> {
    return new Observable((observer) => {
      const handler = (data: any) => {
        if (data.tenantId === tenantId) {
          observer.next({ data: JSON.stringify(data) });
        }
      };
      conversationEmitter.on('new_message', handler);
      req.on('close', () => {
        conversationEmitter.off('new_message', handler);
        observer.complete();
      });
    });
  }
}
