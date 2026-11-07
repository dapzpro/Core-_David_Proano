import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CategoriaEvento } from './categoria-evento.entity';
import { ZonaEntrada } from './zona-entrada.entity';

@Entity('eventos')
export class Evento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre: string;

  @Column({ type: 'text', default: '' })
  descripcion: string;

  @Column()
  ubicacion: string;

  @Column({ type: 'timestamptz' })
  fechaInicio: Date;

  @Column({ type: 'timestamptz' })
  fechaFin: Date;

  @Column({ default: 'Programado' })
  estado: string;

  @Column({ default: false })
  accesibilidad: boolean;

  @Column()
  categoriaId: number;

  @ManyToOne(() => CategoriaEvento, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'categoriaId' })
  categoria: CategoriaEvento;

  @OneToMany(() => ZonaEntrada, (zona) => zona.evento)
  zonas: ZonaEntrada[];
}
