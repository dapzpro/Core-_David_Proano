import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Resena } from './entities/resena.entity';
import { Inscripcion } from './entities/inscripcion.entity';
import { CreateResenaDto, ModerateResenaDto } from './dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Resena) private resenas: Repository<Resena>,
    @InjectRepository(Inscripcion) private insc: Repository<Inscripcion>,
  ) {}

  // Solo reseña quien realmente ingresó (check-in por QR) y solo una vez por inscripción
  async create(usuarioId: number, dto: CreateResenaDto) {
    const insc = await this.insc.findOne({ where: { id: dto.inscripcionId, usuarioId } });
    if (!insc) throw new NotFoundException('Inscripción no encontrada');
    if (insc.estado !== 'Ingresada') {
      throw new BadRequestException('Solo puedes reseñar eventos a los que realmente ingresaste (con check-in por QR)');
    }
    const existe = await this.resenas.findOne({ where: { inscripcionId: insc.id } });
    if (existe) throw new ConflictException('Ya reseñaste este evento');
    try {
      return await this.resenas.save(
        this.resenas.create({
          inscripcionId: insc.id,
          eventoId: insc.eventoId,
          calificacion: dto.calificacion,
          comentario: dto.comentario?.trim() ?? '',
          estado: 'Pendiente',
        }),
      );
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException('Ya reseñaste este evento');
      throw e;
    }
  }

  // Reseñas aprobadas de un evento, visibles para todos (solo el primer nombre del autor)
  async approvedByEvent(eventoId: number) {
    const list = await this.resenas.find({
      where: { eventoId, estado: 'Aprobada' },
      relations: { inscripcion: { usuario: true } },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return list.map((r) => ({
      id: r.id,
      calificacion: r.calificacion,
      comentario: r.comentario,
      respuestaAdmin: r.respuestaAdmin,
      createdAt: r.createdAt,
      autor: (r.inscripcion?.usuario?.name ?? 'Asistente').split(' ')[0],
    }));
  }

  async adminList(estado?: string) {
    const list = await this.resenas.find({
      where: estado ? { estado } : {},
      relations: { evento: true, inscripcion: { usuario: true } },
      order: { createdAt: 'DESC' },
      take: 200,
    });
    return list.map((r) => ({
      id: r.id,
      calificacion: r.calificacion,
      comentario: r.comentario,
      estado: r.estado,
      respuestaAdmin: r.respuestaAdmin,
      createdAt: r.createdAt,
      evento: { id: r.evento.id, nombre: r.evento.nombre },
      autor: r.inscripcion?.usuario?.name ?? 'Asistente',
    }));
  }

  async moderate(adminId: number, id: number, dto: ModerateResenaDto) {
    const r = await this.resenas.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Reseña no encontrada');
    await this.resenas.update(id, {
      estado: dto.estado,
      respuestaAdmin: dto.respuestaAdmin?.trim() || null,
      moderadaPorId: adminId,
    });
    return this.resenas.findOne({ where: { id } });
  }
}
