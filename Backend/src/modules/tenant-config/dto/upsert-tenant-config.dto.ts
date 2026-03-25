import { IsOptional, IsString, IsArray, IsObject, ValidateNested, IsBoolean, IsNumber, IsIn, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class CatalogItemDto {
  @IsString() @MaxLength(200) name: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsBoolean() available: boolean;
}

class FaqItemDto {
  @IsString() @MaxLength(300) question: string;
  @IsString() @MaxLength(1000) answer: string;
}

class HumanAgentDto {
  @IsString() @MaxLength(100) name: string;
  @IsString() @MaxLength(30) phone: string;
  @IsBoolean() available: boolean;
}

class PaymentConfigDto {
  @IsOptional() @IsString() @MaxLength(50) accountNumber?: string;
  @IsOptional() @IsIn(['savings', 'checking']) accountType?: string;
  @IsOptional() @IsString() @MaxLength(100) bankName?: string;
  @IsOptional() @IsString() @MaxLength(100) accountHolder?: string;
  @IsOptional() @IsIn(['manual', 'automatic']) confirmationMethod?: string;
  @IsOptional() @IsString() @MaxLength(500) qrImageUrl?: string;
}

class SalesConfigDto {
  @IsOptional() @IsBoolean() requireCustomerName?: boolean;
  @IsOptional() @IsBoolean() requireCustomerAddress?: boolean;
  @IsOptional() @IsBoolean() requireCustomerId?: boolean;
  @IsOptional() @IsIn(['pickup', 'delivery', 'both']) deliveryType?: string;
  @IsOptional() @IsNumber() @Min(0) deliveryFee?: number;
  @IsOptional() @IsNumber() @Min(0) minimumOrderAmount?: number;
  @IsOptional() @IsString() @MaxLength(1000) confirmationInstructions?: string;
}

class BusinessAddressDto {
  @IsOptional() @IsString() @MaxLength(200) street?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(300) reference?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
}

class AppointmentEmployeeDto {
  @IsString() @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(200) calendarId?: string;
  @IsBoolean() available: boolean;
  @IsOptional() @IsArray() services?: string[];
}

class AppointmentConfigDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsNumber() @Min(15) @Max(480) serviceDurationMinutes?: number;
  @IsOptional() @IsArray() services?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentEmployeeDto)
  employees?: AppointmentEmployeeDto[];
}

export class UpsertTenantConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) businessName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) businessType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) businessTypeCustom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) targetAudience?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) agentName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) teamSize?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) welcomeMessage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) tone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) language?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() prohibitedWords?: string[];

  @ApiPropertyOptional() @IsOptional() @IsObject() businessHours?: {
    timezone: string;
    schedule: Array<{ day: string; open: string; close: string; isOpen: boolean }>;
  };
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) outOfHoursMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogItemDto)
  catalog?: CatalogItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faq?: FaqItemDto[];

  @ApiPropertyOptional() @IsOptional() @IsObject() autoResponses?: Record<string, string>;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(8000) aiInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() allowedActions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() restrictions?: string[];

  @ApiPropertyOptional() @IsOptional() @IsObject() automations?: {
    sales: boolean; support: boolean; reservations: boolean; payments: boolean; alerts: boolean;
  };

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessAddressDto)
  businessAddress?: BusinessAddressDto;

  @ApiPropertyOptional() @IsOptional() @IsArray() paymentMethods?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) catalogDriveUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AppointmentConfigDto)
  appointmentConfig?: AppointmentConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentConfigDto)
  paymentConfig?: PaymentConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SalesConfigDto)
  salesConfig?: SalesConfigDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HumanAgentDto)
  humanAgents?: HumanAgentDto[];
}
