import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('artistas')
export class Artista {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ type: 'text', default: '' })
  descripcion: string;

  @Column({ default: false })
  demo: boolean;
}
