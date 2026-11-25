import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('stakeholders')
export class Stakeholder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  empresa: string;

  @Column()
  sector: string;

  @Column()
  contacto: string;

  @Column()
  usuarioId: number;

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;
}
