import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateEventoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  ubicacion: string;

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsOptional()
  @IsBoolean()
  accesibilidad?: boolean;

  @IsInt()
  categoriaId: number;
}

export class UpdateEventoDto extends PartialType(CreateEventoDto) {}

export class CreateZonaDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  aforo: number;

  @IsNumber()
  @Min(0)
  precio: number;

  @IsInt()
  eventoId: number;
}

export class UpdateZonaDto extends PartialType(OmitType(CreateZonaDto, ['eventoId'] as const)) {}
