import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/user.entity';
import { Evento } from '../events/entities/evento.entity';
import { ZonaEntrada } from '../events/entities/zona-entrada.entity';
import { CategoriaEvento } from '../events/entities/categoria-evento.entity';
import { Artista } from './entities/artista.entity';
import { Inscripcion } from './entities/inscripcion.entity';
import { Resena } from './entities/resena.entity';
import { Stakeholder } from './entities/stakeholder.entity';
import { RangoAforo } from './entities/rango-aforo.entity';
import { Oferta } from './entities/oferta.entity';
import { ArtistsService } from './artists.service';
import { RegistrationsService } from './registrations.service';
import { ReviewsService } from './reviews.service';
import { ValuationService } from './valuation.service';
import { OffersService } from './offers.service';
import { StaffService } from './staff.service';
import { DemoService } from './demo.service';
import {
  AdminController, ArtistsController, OffersController, RegistrationsController, ReviewsController, ValuationController,
} from './core.controllers';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([User, Evento, ZonaEntrada, CategoriaEvento, Artista, Inscripcion, Resena, Stakeholder, RangoAforo, Oferta]),
  ],
  controllers: [ArtistsController, RegistrationsController, ReviewsController, ValuationController, OffersController, AdminController],
  providers: [ArtistsService, RegistrationsService, ReviewsService, ValuationService, OffersService, StaffService, DemoService],
})
export class CoreModule {}
