import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ArtistsService } from './artists.service';
import { RegistrationsService } from './registrations.service';
import { ReviewsService } from './reviews.service';
import { ValuationService } from './valuation.service';
import { OffersService } from './offers.service';
import { StaffService } from './staff.service';
import { DemoService } from './demo.service';
import {
  CheckinDto, CreateArtistaDto, CreateOfertaDto, CreateRegistrationDto, CreateResenaDto, CreateStaffDto,
  ModerateResenaDto, RespondOfertaDto, SetEventArtistsDto, SetRangosDto, UpdateArtistaDto, ValuationQueryDto,
} from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ArtistsController {
  constructor(private s: ArtistsService) {}

  @Get('artists')
  findAll() {
    return this.s.findAll();
  }

  @Roles('admin')
  @Post('artists')
  create(@Body() dto: CreateArtistaDto) {
    return this.s.create(dto);
  }

  @Roles('admin')
  @Patch('artists/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateArtistaDto) {
    return this.s.update(id, dto);
  }

  @Roles('admin')
  @Delete('artists/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.s.remove(id);
  }

  @Roles('admin')
  @Put('events/:id/artists')
  setEventArtists(@Param('id', ParseIntPipe) id: number, @Body() dto: SetEventArtistsDto) {
    return this.s.setEventArtists(id, dto.artistaIds);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('registrations')
export class RegistrationsController {
  constructor(private s: RegistrationsService) {}

  @Get('availability')
  availability(@Query('eventId', ParseIntPipe) eventId: number) {
    return this.s.availability(eventId);
  }

  @Roles('user')
  @Post()
  signup(@Req() req: any, @Body() dto: CreateRegistrationDto) {
    return this.s.signup(req.user.id, dto.zonaId);
  }

  @Roles('user')
  @Get('mine')
  mine(@Req() req: any) {
    return this.s.mine(req.user.id);
  }

  @Roles('user')
  @Patch(':id/cancel')
  cancel(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.s.cancel(req.user.id, id);
  }

  @Roles('door', 'admin')
  @Post('checkin')
  checkin(@Body() dto: CheckinDto) {
    return this.s.checkin(dto.token.trim(), dto.eventoId);
  }

  @Roles('door', 'admin')
  @Get('attendance')
  attendance(@Query('eventId', ParseIntPipe) eventId: number) {
    return this.s.attendance(eventId);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private s: ReviewsService) {}

  @Roles('user')
  @Post()
  create(@Req() req: any, @Body() dto: CreateResenaDto) {
    return this.s.create(req.user.id, dto);
  }

  @Get('event/:eventoId')
  byEvent(@Param('eventoId', ParseIntPipe) eventoId: number) {
    return this.s.approvedByEvent(eventoId);
  }

  @Roles('admin')
  @Get()
  adminList(@Query('estado') estado?: string) {
    return this.s.adminList(['Pendiente', 'Aprobada', 'Rechazada'].includes(estado) ? estado : undefined);
  }

  @Roles('admin')
  @Patch(':id/moderate')
  moderate(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: ModerateResenaDto) {
    return this.s.moderate(req.user.id, id, dto);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('valuation')
export class ValuationController {
  constructor(private s: ValuationService) {}

  @Roles('admin', 'stakeholder')
  @Get('events')
  events(@Query() q: ValuationQueryDto) {
    return this.s.events(q.from, q.to);
  }

  @Roles('admin', 'stakeholder')
  @Get('artists')
  artists() {
    return this.s.artists();
  }

  @Roles('admin', 'stakeholder')
  @Get('ranges')
  ranges() {
    return this.s.getRangos();
  }

  @Roles('admin')
  @Put('ranges')
  setRanges(@Body() dto: SetRangosDto) {
    return this.s.setRangos(dto.rangos);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('offers')
export class OffersController {
  constructor(private s: OffersService) {}

  @Roles('admin')
  @Post()
  publish(@Body() dto: CreateOfertaDto) {
    return this.s.publish(dto);
  }

  @Roles('admin')
  @Get()
  all() {
    return this.s.all();
  }

  @Roles('stakeholder')
  @Get('mine')
  mine(@Req() req: any) {
    return this.s.mine(req.user.id);
  }

  @Roles('stakeholder')
  @Patch(':id/respond')
  respond(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: RespondOfertaDto) {
    return this.s.respond(req.user.id, id, dto.accion);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller()
export class AdminController {
  constructor(private staff: StaffService, private demo: DemoService) {}

  @Get('staff')
  list() {
    return this.staff.list();
  }

  @Post('staff')
  create(@Body() dto: CreateStaffDto) {
    return this.staff.create(dto);
  }

  @Get('staff/stakeholders')
  stakeholders() {
    return this.staff.listStakeholders();
  }

  @Get('demo')
  demoStatus() {
    return this.demo.status();
  }

  @Post('demo')
  demoSeed() {
    return this.demo.seed();
  }

  @Delete('demo')
  demoClear() {
    return this.demo.clear();
  }
}
