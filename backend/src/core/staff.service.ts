import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Stakeholder } from './entities/stakeholder.entity';
import { CreateStaffDto } from './dto';

@Injectable()
export class StaffService {
  constructor(
    private users: UsersService,
    @InjectRepository(Stakeholder) private stakeholders: Repository<Stakeholder>,
  ) {}

  list() {
    return this.users.findStaff();
  }

  async create(dto: CreateStaffDto) {
    const user = await this.users.createWithRole(dto, dto.role);
    if (dto.role === 'stakeholder') {
      await this.stakeholders.save(
        this.stakeholders.create({
          empresa: dto.empresa.trim(),
          sector: dto.sector.trim(),
          contacto: dto.contacto.trim(),
          usuarioId: user.id,
        }),
      );
    }
    return user;
  }

  async listStakeholders() {
    const list = await this.stakeholders.find({ relations: { usuario: true }, order: { empresa: 'ASC' } });
    return list.map((s) => ({ id: s.id, empresa: s.empresa, sector: s.sector, contacto: s.contacto, usuario: { name: s.usuario.name, email: s.usuario.email } }));
  }
}
