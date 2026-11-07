import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { CategoriesController, EventsController, ZonesController } from './events.controller';
import { CategoriaEvento } from './entities/categoria-evento.entity';
import { Evento } from './entities/evento.entity';
import { ZonaEntrada } from './entities/zona-entrada.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CategoriaEvento, Evento, ZonaEntrada])],
  controllers: [CategoriesController, EventsController, ZonesController],
  providers: [EventsService],
})
export class EventsModule {}
