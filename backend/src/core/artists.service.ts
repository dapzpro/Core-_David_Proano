import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Artista } from './entities/artista.entity';
import { Evento } from '../events/entities/evento.entity';
import { CreateArtistaDto, UpdateArtistaDto } from './dto';

@Injectable()
export class ArtistsService {
  constructor(
    @InjectRepository(Artista) private artistas: Repository<Artista>,
    @InjectRepository(Evento) private eventos: Repository<Evento>,
  ) {}

  findAll() {
    return this.artistas.find({ order: { nombre: 'ASC' } });
  }

  private async get(id: number) {
    const a = await this.artistas.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Artista no encontrado');
    return a;
  }

  private async assertNombreLibre(nombre: string, exceptId?: number) {
    const existe = await this.artistas.findOne({ where: { nombre } });
    if (existe && existe.id !== exceptId) throw new ConflictException('Ya existe un artista con ese nombre');
  }

  async create(dto: CreateArtistaDto) {
    const nombre = dto.nombre.trim();
    await this.assertNombreLibre(nombre);
    return this.artistas.save(this.artistas.create({ nombre, descripcion: dto.descripcion ?? '' }));
  }

  async update(id: number, dto: UpdateArtistaDto) {
    await this.get(id);
    if (dto.nombre) {
      dto.nombre = dto.nombre.trim();
      await this.assertNombreLibre(dto.nombre, id);
    }
    await this.artistas.update(id, dto);
    return this.get(id);
  }

  async remove(id: number) {
    await this.get(id);
    await this.artistas.delete(id);
    return { deleted: true };
  }

  // Asigna los artistas de un evento (tabla N:M eventos_artistas)
  async setEventArtists(eventoId: number, artistaIds: number[]) {
    const evento = await this.eventos.findOne({ where: { id: eventoId }, relations: { artistas: true } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (evento.fechaInicio <= new Date()) {
      throw new BadRequestException('El evento ya inició: no se pueden cambiar sus artistas, porque la popularidad se calcula con ellos');
    }
    const ids = [...new Set(artistaIds)];
    const artistas = ids.length ? await this.artistas.find({ where: { id: In(ids) } }) : [];
    if (artistas.length !== ids.length) throw new BadRequestException('Alguno de los artistas no existe');
    evento.artistas = artistas;
    await this.eventos.save(evento);
    return artistas;
  }
}
