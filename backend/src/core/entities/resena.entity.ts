import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Evento } from '../../events/entities/evento.entity';
import { Inscripcion } from './inscripcion.entity';

@Entity('resenas')
export class Resena {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  calificacion: number;

  @Column({ type: 'text', default: '' })
  comentario: string;

  // Pendiente | Aprobada | Rechazada
  @Column({ default: 'Pendiente' })
  estado: string;

  @Column({ type: 'text', nullable: true })
  respuestaAdmin: string | null;

  // OneToOne = una sola reseña por inscripción (restricción única en la BD)
  @Column()
  inscripcionId: number;

  @OneToOne(() => Inscripcion, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inscripcionId' })
  inscripcion: Inscripcion;

  @Column()
  eventoId: number;

  @ManyToOne(() => Evento, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventoId' })
  evento: Evento;

  @Column({ type: 'int', nullable: true })
  moderadaPorId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'moderadaPorId' })
  moderadaPor: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
