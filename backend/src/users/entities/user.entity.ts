import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  // admin | user (asistente) | door (personal de puerta) | stakeholder
  @Column({ default: 'user' })
  role: string;

  @Column({ default: false })
  demo: boolean;
}
