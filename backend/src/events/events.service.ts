import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaEvento } from './entities/categoria-evento.entity';
import { Evento } from './entities/evento.entity';
import { ZonaEntrada } from './entities/zona-entrada.entity';
import { CreateEventoDto, CreateZonaDto, UpdateEventoDto, UpdateZonaDto } from './dto/events.dto';

@Injectable()
export class EventsService implements OnModuleInit {
  constructor(
    @InjectRepository(CategoriaEvento) private categorias: Repository<CategoriaEvento>,
    @InjectRepository(Evento) private eventos: Repository<Evento>,
    @InjectRepository(ZonaEntrada) private zonas: Repository<ZonaEntrada>,
  ) {}

  // Carga las categorías la primera vez que arranca el backend
  async onModuleInit() {
    if ((await this.categorias.count()) === 0) {
      const nombres = ['Concierto', 'Teatro', 'Deportes', 'Conferencia'];
      await this.categorias.save(nombres.map((nombre) => this.categorias.create({ nombre })));
    }
  }

  // ---------- Reglas de negocio (se validan SIEMPRE aquí, en el backend) ----------

  private assertFechas(inicio: Date, fin: Date) {
    if (fin <= inicio) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }

  // Dato sensible del core: el aforo y el precio alimentan la ocupación y la oferta
  // de patrocinio. Si el evento ya empezó, ya no se pueden alterar.
  private assertNoIniciado(evento: Evento) {
    if (evento.fechaInicio <= new Date()) {
      throw new BadRequestException(
        'El evento ya inició: no se pueden modificar sus datos ni sus zonas, porque las métricas de ocupación dependen del aforo',
      );
    }
  }

  private async assertNombreZonaLibre(eventoId: number, nombre: string) {
    const existe = await this.zonas.findOne({ where: { eventoId, nombre } });
    if (existe) throw new ConflictException('Ya existe una zona con ese nombre en este evento');
  }

  // ---------- Categorías ----------

  findCategorias() {
    return this.categorias.find({ order: { nombre: 'ASC' } });
  }

  private async getCategoria(id: number) {
    const categoria = await this.categorias.findOne({ where: { id } });
    if (!categoria) throw new BadRequestException('La categoría no existe');
    return categoria;
  }

  // ---------- Eventos ----------

  findEventos(categoriaId?: number) {
    return this.eventos.find({
      where: categoriaId ? { categoriaId } : {},
      relations: { categoria: true, artistas: true },
      order: { fechaInicio: 'ASC' },
    });
  }

  async getEvento(id: number) {
    const evento = await this.eventos.findOne({ where: { id } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    return evento;
  }

  async createEvento(dto: CreateEventoDto) {
    const inicio = new Date(dto.fechaInicio);
    const fin = new Date(dto.fechaFin);
    this.assertFechas(inicio, fin);
    if (inicio <= new Date()) {
      throw new BadRequestException('El evento debe comenzar en el futuro');
    }
    await this.getCategoria(dto.categoriaId);
    return this.eventos.save(this.eventos.create({ ...dto, fechaInicio: inicio, fechaFin: fin }));
  }

  async updateEvento(id: number, dto: UpdateEventoDto) {
    const evento = await this.getEvento(id);
    this.assertNoIniciado(evento);
    const inicio = dto.fechaInicio ? new Date(dto.fechaInicio) : evento.fechaInicio;
    const fin = dto.fechaFin ? new Date(dto.fechaFin) : evento.fechaFin;
    this.assertFechas(inicio, fin);
    if (dto.categoriaId) await this.getCategoria(dto.categoriaId);
    await this.eventos.update(id, { ...dto, fechaInicio: inicio, fechaFin: fin });
    return this.getEvento(id);
  }

  async removeEvento(id: number) {
    const evento = await this.getEvento(id);
    this.assertNoIniciado(evento);
    await this.eventos.delete(id);
    return { deleted: true };
  }

  // ---------- Zonas de entrada ----------

  findZonas(eventoId: number) {
    return this.zonas.find({ where: { eventoId }, order: { id: 'ASC' } });
  }

  private async getZona(id: number) {
    const zona = await this.zonas.findOne({ where: { id } });
    if (!zona) throw new NotFoundException('Zona no encontrada');
    return zona;
  }

  async createZona(dto: CreateZonaDto) {
    const evento = await this.getEvento(dto.eventoId);
    this.assertNoIniciado(evento);
    await this.assertNombreZonaLibre(dto.eventoId, dto.nombre);
    return this.zonas.save(this.zonas.create(dto));
  }

  async updateZona(id: number, dto: UpdateZonaDto) {
    const zona = await this.getZona(id);
    this.assertNoIniciado(await this.getEvento(zona.eventoId));
    if (dto.nombre && dto.nombre !== zona.nombre) {
      await this.assertNombreZonaLibre(zona.eventoId, dto.nombre);
    }
    await this.zonas.update(id, dto);
    return this.getZona(id);
  }

  async removeZona(id: number) {
    const zona = await this.getZona(id);
    this.assertNoIniciado(await this.getEvento(zona.eventoId));
    await this.zonas.delete(id);
    return { deleted: true };
  }
}
