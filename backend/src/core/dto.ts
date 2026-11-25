import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreateUserDto } from '../users/dto/create-user.dto';

export class CreateArtistaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
export class UpdateArtistaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}

export class SetEventArtistsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  artistaIds: number[];
}

export class CreateRegistrationDto {
  @IsInt()
  zonaId: number;
}

export class CheckinDto {
  @IsString()
  @MaxLength(200)
  token: string;

  @IsInt()
  eventoId: number;
}

export class CreateResenaDto {
  @IsInt()
  inscripcionId: number;

  @IsInt()
  @Min(1)
  @Max(5)
  calificacion: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}

export class ModerateResenaDto {
  @IsIn(['Aprobada', 'Rechazada'])
  estado: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  respuestaAdmin?: string;
}

export class RangoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  nombre: string;

  @IsInt()
  @Min(0)
  minAforo: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxAforo?: number | null;

  @IsNumber()
  @Min(0)
  tarifaBase: number;
}

export class SetRangosDto {
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => RangoDto)
  rangos: RangoDto[];
}

export class ValuationQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateOfertaDto {
  @IsInt()
  eventoId: number;

  @IsInt()
  stakeholderId: number;
}

export class RespondOfertaDto {
  @IsIn(['aceptar', 'rechazar'])
  accion: string;
}

export class CreateStaffDto extends CreateUserDto {
  @IsIn(['admin', 'door', 'stakeholder'])
  role: string;

  @ValidateIf((o) => o.role === 'stakeholder')
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  empresa?: string;

  @ValidateIf((o) => o.role === 'stakeholder')
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  sector?: string;

  @ValidateIf((o) => o.role === 'stakeholder')
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  contacto?: string;
}
