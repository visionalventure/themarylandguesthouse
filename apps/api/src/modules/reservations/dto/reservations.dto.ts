import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsInt, IsNumber, IsEnum, IsDateString, IsArray,
  ValidateNested, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ReservationStatusEnum {
  PENDING = 'PENDING',
  RESERVED = 'RESERVED',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  WAITLISTED = 'WAITLISTED',
}

export class ReservationRoomInputDto {
  @ApiProperty() @IsString() roomId: string;
}

export class ReservationRoomsDto {
  @ApiProperty({ type: [ReservationRoomInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationRoomInputDto)
  create: ReservationRoomInputDto[];
}

export class CreateReservationDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsString() guestId: string;
  @ApiProperty() @IsDateString() checkIn: string;
  @ApiProperty() @IsDateString() checkOut: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) adults?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) children?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) source?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ReservationStatusEnum) status?: ReservationStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() specialRequests?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) depositAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() depositMethod?: string;
  @ApiPropertyOptional({ type: ReservationRoomsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ReservationRoomsDto)
  rooms?: ReservationRoomsDto;
}

export class UpdateReservationDto extends PartialType(CreateReservationDto) {}

export class CancelReservationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class HoldRoomDto {
  @ApiProperty() @IsString() roomId: string;
  @ApiProperty() @IsString() propertyId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guestId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) holdMinutes?: number;
}

export class ReservationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() propertyId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ReservationStatusEnum) status?: ReservationStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsDateString() checkIn?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() checkOut?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() guestName?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CalendarQueryDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsDateString() startDate: string;
  @ApiProperty() @IsDateString() endDate: string;
}
