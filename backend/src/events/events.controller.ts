import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventoDto, CreateZonaDto, UpdateEventoDto, UpdateZonaDto } from './dto/events.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly events: EventsService) {}

  @Get()
  findAll() {
    return this.events.findCategorias();
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  // Para el dropdown en cascada: GET /events?categoryId=1
  @Get()
  findAll(@Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number) {
    return this.events.findEventos(categoryId);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateEventoDto) {
    return this.events.createEvento(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventoDto) {
    return this.events.updateEvento(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.events.removeEvento(id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('zones')
export class ZonesController {
  constructor(private readonly events: EventsService) {}

  // Para el dropdown en cascada: GET /zones?eventId=3
  @Get()
  findAll(@Query('eventId', ParseIntPipe) eventId: number) {
    return this.events.findZonas(eventId);
  }

  @Roles('admin')
  @Post()
  create(@Body() dto: CreateZonaDto) {
    return this.events.createZona(dto);
  }

  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateZonaDto) {
    return this.events.updateZona(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.events.removeZona(id);
  }
}
