import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Artista } from '../../core/entities/artista.entity';
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

  // Tabla intermedia eventos_artistas (N:M)
  @ManyToMany(() => Artista)
  @JoinTable({ name: 'eventos_artistas' })
  artistas: Artista[];

  // Inicio de la venta de entradas: sirve para medir la rapidez de agotamiento
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ default: false })
  demo: boolean;
}
