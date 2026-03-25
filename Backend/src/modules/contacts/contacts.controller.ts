import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Req, ForbiddenException, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin', 'owner', 'viewer')
@Controller('api/v1/contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  private assertOwnership(user: any, tenantId: string) {
    if (user.role === 'super_admin' || user.role === 'admin') return;
    if (user.tenantId !== tenantId) throw new ForbiddenException('No tienes acceso a este tenant.');
  }

  @Get()
  @ApiOperation({ summary: 'Listar contactos del tenant' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Req() req: any,
    @Query('tenantId') tenantId: string,
    @Query('search') search?: string,
    @Query('tag') tag?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    this.assertOwnership(req.user, tenantId);
    return this.contactsService.findAll(tenantId, { search, tag, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener contacto por ID' })
  @ApiQuery({ name: 'tenantId', required: true })
  findOne(@Req() req: any, @Param('id') id: string, @Query('tenantId') tenantId: string) {
    this.assertOwnership(req.user, tenantId);
    return this.contactsService.findOne(tenantId, id);
  }

  @Post()
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Crear contacto' })
  create(@Req() req: any, @Body() dto: CreateContactDto) {
    this.assertOwnership(req.user, dto.tenantId);
    return this.contactsService.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Actualizar contacto' })
  @ApiQuery({ name: 'tenantId', required: true })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateContactDto,
  ) {
    this.assertOwnership(req.user, tenantId);
    return this.contactsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('super_admin', 'admin', 'owner')
  @ApiOperation({ summary: 'Eliminar contacto' })
  @ApiQuery({ name: 'tenantId', required: true })
  remove(@Req() req: any, @Param('id') id: string, @Query('tenantId') tenantId: string) {
    this.assertOwnership(req.user, tenantId);
    return this.contactsService.remove(tenantId, id);
  }
}
