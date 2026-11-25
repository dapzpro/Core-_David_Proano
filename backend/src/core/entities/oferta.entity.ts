import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Evento } from '../../events/entities/evento.entity';
import { Stakeholder } from './stakeholder.entity';

@Entity('ofertas_patrocinio')
@Index('uq_oferta_publicada', ['eventoId', 'stakeholderId'], { unique: true, where: `"estado" = 'Publicada'` })
export class Oferta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float' })
  indiceValor: number;

  @Column({ type: 'float' })
  precio: number;

  // Publicada | Aceptada | Rechazada
  @Column({ default: 'Publicada' })
  estado: string;

  @Column()
  eventoId: number;

  @ManyToOne(() => Evento, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventoId' })
  evento: Evento;

  @Column()
  stakeholderId: number;

  @ManyToOne(() => Stakeholder, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stakeholderId' })
  stakeholder: Stakeholder;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;
}
