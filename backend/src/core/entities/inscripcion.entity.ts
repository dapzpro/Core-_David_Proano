import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ZonaEntrada } from '../../events/entities/zona-entrada.entity';
import { Evento } from '../../events/entities/evento.entity';

// Un usuario solo puede tener UNA inscripción activa por evento (la base de datos lo garantiza)
@Entity('inscripciones')
@Index('uq_inscripcion_activa', ['usuarioId', 'eventoId'], { unique: true, where: `"estado" <> 'Cancelada'` })
export class Inscripcion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true })
  token: string;

  // Confirmada | EnEspera | Ingresada | Cancelada
  @Column({ default: 'Confirmada' })
  estado: string;

  @Column({ type: 'timestamptz', nullable: true })
  checkedInAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  confirmadaAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column()
  usuarioId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column()
  zonaId: number;

  @ManyToOne(() => ZonaEntrada, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zonaId' })
  zona: ZonaEntrada;

  @Column()
  eventoId: number;

  @ManyToOne(() => Evento, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventoId' })
  evento: Evento;
}
