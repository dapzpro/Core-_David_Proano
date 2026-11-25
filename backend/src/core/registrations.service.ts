import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { isUUID } from 'class-validator';
import { DataSource, In, Not, Repository } from 'typeorm';
import { Inscripcion } from './entities/inscripcion.entity';
import { Resena } from './entities/resena.entity';
import { ZonaEntrada } from '../events/entities/zona-entrada.entity';
import { Evento } from '../events/entities/evento.entity';

@Injectable()
export class RegistrationsService {
  constructor(
    private ds: DataSource,
    @InjectRepository(Inscripcion) private insc: Repository<Inscripcion>,
    @InjectRepository(Resena) private resenas: Repository<Resena>,
    @InjectRepository(Evento) private eventos: Repository<Evento>,
  ) {}

  // Cupos por zona: Confirmada e Ingresada ocupan lugar; EnEspera no.
  async availability(eventoId: number) {
    const evento = await this.eventos.findOne({ where: { id: eventoId }, relations: { zonas: true } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    const rows = await this.insc
      .createQueryBuilder('i')
      .select('i.zonaId', 'zonaId')
      .addSelect(`COUNT(*) FILTER (WHERE i.estado IN ('Confirmada','Ingresada'))`, 'ocupados')
      .addSelect(`COUNT(*) FILTER (WHERE i.estado = 'EnEspera')`, 'enEspera')
      .where('i.eventoId = :eventoId', { eventoId })
      .groupBy('i.zonaId')
      .getRawMany();
    const byZone = new Map(rows.map((r) => [Number(r.zonaId), r]));
    return evento.zonas
      .sort((a, b) => a.id - b.id)
      .map((z) => {
        const r = byZone.get(z.id);
        const ocupados = r ? Number(r.ocupados) : 0;
        return {
          zonaId: z.id,
          nombre: z.nombre,
          aforo: z.aforo,
          precio: z.precio,
          ocupados,
          disponibles: Math.max(z.aforo - ocupados, 0),
          enEspera: r ? Number(r.enEspera) : 0,
        };
      });
  }

  // Inscripción: transacción con bloqueo de la fila de la zona, para NUNCA superar el aforo
  // aunque lleguen muchas peticiones al mismo tiempo.
  async signup(usuarioId: number, zonaId: number) {
    try {
      return await this.ds.transaction(async (m) => {
        const zona = await m.findOne(ZonaEntrada, { where: { id: zonaId }, lock: { mode: 'pessimistic_write' } });
        if (!zona) throw new NotFoundException('La zona no existe');
        const evento = await m.findOne(Evento, { where: { id: zona.eventoId } });
        if (evento.fechaInicio <= new Date()) {
          throw new BadRequestException('Las inscripciones de este evento ya cerraron porque el evento ya inició');
        }
        const dup = await m.findOne(Inscripcion, {
          where: { usuarioId, eventoId: evento.id, estado: Not('Cancelada') },
        });
        if (dup) throw new ConflictException('Ya tienes una inscripción activa en este evento');
        const ocupados = await m.count(Inscripcion, {
          where: { zonaId, estado: In(['Confirmada', 'Ingresada']) },
        });
        const estado = ocupados < zona.aforo ? 'Confirmada' : 'EnEspera';
        return m.save(
          m.create(Inscripcion, {
            token: randomUUID(),
            estado,
            usuarioId,
            zonaId,
            eventoId: evento.id,
            confirmadaAt: estado === 'Confirmada' ? new Date() : null,
            checkedInAt: null,
          }),
        );
      });
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException('Ya tienes una inscripción activa en este evento');
      throw e;
    }
  }

  // Cancelar: si estaba Confirmada, el primero de la lista de espera de la zona pasa a Confirmada
  async cancel(usuarioId: number, id: number) {
    return this.ds.transaction(async (m) => {
      const ref = await m.findOne(Inscripcion, { where: { id, usuarioId } });
      if (!ref) throw new NotFoundException('Inscripción no encontrada');
      await m.findOne(ZonaEntrada, { where: { id: ref.zonaId }, lock: { mode: 'pessimistic_write' } });
      const insc = await m.findOne(Inscripcion, { where: { id, usuarioId } });
      if (insc.estado === 'Cancelada') throw new BadRequestException('La inscripción ya estaba cancelada');
      if (insc.estado === 'Ingresada') throw new BadRequestException('No se puede cancelar una entrada que ya se usó');
      const eraConfirmada = insc.estado === 'Confirmada';
      await m.update(Inscripcion, { id }, { estado: 'Cancelada' });
      let promovido = false;
      if (eraConfirmada) {
        const siguiente = await m.findOne(Inscripcion, {
          where: { zonaId: insc.zonaId, estado: 'EnEspera' },
          order: { id: 'ASC' }, // el id se asigna dentro del bloqueo: refleja el orden real de llegada
        });
        if (siguiente) {
          await m.update(Inscripcion, { id: siguiente.id }, { estado: 'Confirmada', confirmadaAt: new Date() });
          promovido = true;
        }
      }
      return { cancelada: true, promovidoDeListaDeEspera: promovido };
    });
  }

  async mine(usuarioId: number) {
    const list = await this.insc.find({
      where: { usuarioId },
      relations: { evento: true, zona: true },
      order: { createdAt: 'DESC' },
    });
    const ids = list.map((i) => i.id);
    const reviews = ids.length ? await this.resenas.find({ where: { inscripcionId: In(ids) } }) : [];
    const byInsc = new Map(reviews.map((r) => [r.inscripcionId, r]));
    const out = [];
    for (const i of list) {
      let posicion: number | null = null;
      if (i.estado === 'EnEspera') {
        const antes = await this.insc
          .createQueryBuilder('x')
          .where('x.zonaId = :z AND x.estado = :e', { z: i.zonaId, e: 'EnEspera' })
          .andWhere('x.id < :id', { id: i.id })
          .getCount();
        posicion = antes + 1;
      }
      const r = byInsc.get(i.id);
      out.push({
        id: i.id,
        token: i.token,
        estado: i.estado,
        checkedInAt: i.checkedInAt,
        posicionEnEspera: posicion,
        evento: {
          id: i.evento.id,
          nombre: i.evento.nombre,
          ubicacion: i.evento.ubicacion,
          fechaInicio: i.evento.fechaInicio,
          fechaFin: i.evento.fechaFin,
        },
        zona: { id: i.zona.id, nombre: i.zona.nombre, precio: i.zona.precio },
        resena: r
          ? { id: r.id, calificacion: r.calificacion, comentario: r.comentario, estado: r.estado, respuestaAdmin: r.respuestaAdmin }
          : null,
      });
    }
    return out;
  }

  // Control de acceso: cada QR se usa una sola vez. El bloqueo de fila evita que dos
  // escaneos simultáneos del mismo QR entren los dos.
  async checkin(token: string, eventoId: number) {
    if (!isUUID(token)) {
      return { resultado: 'invalida', mensaje: 'El código leído no es una entrada de esta plataforma' };
    }
    return this.ds.transaction(async (m) => {
      const locked = await m.findOne(Inscripcion, { where: { token }, lock: { mode: 'pessimistic_write' } });
      if (!locked) return { resultado: 'invalida', mensaje: 'No existe ninguna entrada con ese código' };
      const full = await m.findOne(Inscripcion, {
        where: { id: locked.id },
        relations: { usuario: true, zona: true, evento: true },
      });
      const base = { titular: full.usuario.name, zona: full.zona.nombre, evento: full.evento.nombre };
      if (full.eventoId !== eventoId) {
        return { resultado: 'otro_evento', ...base, mensaje: `Esta entrada es para otro evento: ${full.evento.nombre}` };
      }
      if (full.estado === 'Cancelada') return { resultado: 'cancelada', ...base, mensaje: 'La inscripción fue cancelada' };
      if (full.estado === 'EnEspera') {
        return { resultado: 'en_espera', ...base, mensaje: 'Sigue en lista de espera: no tiene cupo confirmado' };
      }
      if (full.estado === 'Ingresada') {
        return {
          resultado: 'ya_usada',
          ...base,
          checkedInAt: full.checkedInAt,
          mensaje: 'Esta entrada ya fue usada',
        };
      }
      if (full.evento.fechaFin < new Date()) {
        return { resultado: 'evento_finalizado', ...base, mensaje: 'El evento ya finalizó' };
      }
      const now = new Date();
      await m.update(Inscripcion, { id: full.id }, { estado: 'Ingresada', checkedInAt: now });
      return { resultado: 'valida', ...base, checkedInAt: now, mensaje: 'Ingreso válido' };
    });
  }

  // Para la pantalla del personal de puerta
  async attendance(eventoId: number) {
    const evento = await this.eventos.findOne({ where: { id: eventoId } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    const raw = await this.insc
      .createQueryBuilder('i')
      .select(`COUNT(*) FILTER (WHERE i.estado = 'Ingresada')`, 'ingresados')
      .addSelect(`COUNT(*) FILTER (WHERE i.estado IN ('Confirmada','Ingresada'))`, 'confirmados')
      .where('i.eventoId = :eventoId', { eventoId })
      .getRawOne();
    return { ingresados: Number(raw.ingresados), confirmados: Number(raw.confirmados) };
  }
}
