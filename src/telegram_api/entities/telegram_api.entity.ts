import { Manager } from 'src/managers/entities/manager.entity';
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'telegram_client' })
export class TelegramApi {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  chat_id: string;

  @Column()
  name: string;

  @Column()
  username: string;

  @Column({ default: false })
  authorization?: boolean;

  @Column({ nullable: true })
  manager?: string;

  @Column({default: 'manager'})
  role: 'manager' | 'admin';
}
