import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categorias_evento')
export class CategoriaEvento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;
}
