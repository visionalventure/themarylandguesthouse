import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString } from 'class-validator';

export class RunAuditDto {
  @ApiProperty() @IsString() propertyId: string;
  @ApiProperty() @IsDateString() auditDate: string;
}
