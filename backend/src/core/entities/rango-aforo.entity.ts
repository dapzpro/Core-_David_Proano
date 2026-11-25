import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Categorías de aforo configurables por el admin (ej. Pequeño, Mediano, Masivo)
@Entity('rangos_aforo')
export class RangoAforo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ type: 'int' })
  minAforo: number;

  // null = sin límite superior
  @Column({ type: 'int', nullable: true })
  maxAforo: number | null;

  @Column({ type: 'float' })
  tarifaBase: number;
}
