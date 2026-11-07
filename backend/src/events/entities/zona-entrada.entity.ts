import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Evento } from './evento.entity';

@Entity('zonas_entrada')
@Unique(['eventoId', 'nombre'])
export class ZonaEntrada {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ type: 'int' })
  aforo: number;

  @Column({ type: 'float' })
  precio: number;

  @Column()
  eventoId: number;

  @ManyToOne(() => Evento, (evento) => evento.zonas, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventoId' })
  evento: Evento;
}
