import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Oferta } from './entities/oferta.entity';
import { Stakeholder } from './entities/stakeholder.entity';
import { ValuationService } from './valuation.service';
import { CreateOfertaDto } from './dto';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Oferta) private ofertas: Repository<Oferta>,
    @InjectRepository(Stakeholder) private stakeholders: Repository<Stakeholder>,
    private valuation: ValuationService,
  ) {}

  // El precio y el índice se calculan SIEMPRE en el servidor: el cliente nunca los envía
  async publish(dto: CreateOfertaDto) {
    const st = await this.stakeholders.findOne({ where: { id: dto.stakeholderId } });
    if (!st) throw new BadRequestException('El stakeholder no existe');
    const v = await this.valuation.valuateOne(dto.eventoId);
    if (!v) throw new BadRequestException('Solo se pueden ofertar eventos finalizados');
    if (!v.disponible || v.indiceValor === null) throw new BadRequestException(v.motivo ?? 'No disponible');
    if (v.precioPaquete === null) throw new BadRequestException('El aforo del evento no cae en ningún rango configurado');
    const dup = await this.ofertas.findOne({ where: { eventoId: dto.eventoId, stakeholderId: dto.stakeholderId, estado: 'Publicada' } });
    if (dup) throw new ConflictException('Ya existe una oferta publicada de este evento para ese stakeholder');
    try {
      return await this.ofertas.save(
        this.ofertas.create({
          eventoId: dto.eventoId,
          stakeholderId: dto.stakeholderId,
          indiceValor: v.indiceValor,
          precio: v.precioPaquete,
          estado: 'Publicada',
        }),
      );
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException('Ya existe una oferta publicada de este evento para ese stakeholder');
      throw e;
    }
  }

  private map(o: Oferta) {
    return {
      id: o.id,
      indiceValor: o.indiceValor,
      precio: o.precio,
      estado: o.estado,
      createdAt: o.createdAt,
      respondedAt: o.respondedAt,
      evento: { id: o.evento.id, nombre: o.evento.nombre, fechaInicio: o.evento.fechaInicio },
      stakeholder: { id: o.stakeholder.id, empresa: o.stakeholder.empresa },
    };
  }

  async all() {
    const list = await this.ofertas.find({ relations: { evento: true, stakeholder: true }, order: { createdAt: 'DESC' } });
    return list.map((o) => this.map(o));
  }

  async mine(usuarioId: number) {
    const st = await this.stakeholders.findOne({ where: { usuarioId } });
    if (!st) return [];
    const list = await this.ofertas.find({ where: { stakeholderId: st.id }, relations: { evento: true, stakeholder: true }, order: { createdAt: 'DESC' } });
    return list.map((o) => this.map(o));
  }

  async respond(usuarioId: number, id: number, accion: string) {
    const st = await this.stakeholders.findOne({ where: { usuarioId } });
    if (!st) throw new ForbiddenException('Tu usuario no tiene perfil de stakeholder');
    const o = await this.ofertas.findOne({ where: { id, stakeholderId: st.id } });
    if (!o) throw new NotFoundException('Oferta no encontrada');
    if (o.estado !== 'Publicada') throw new BadRequestException('Esta oferta ya fue respondida');
    await this.ofertas.update(id, { estado: accion === 'aceptar' ? 'Aceptada' : 'Rechazada', respondedAt: new Date() });
    return this.ofertas.findOne({ where: { id } });
  }
}
