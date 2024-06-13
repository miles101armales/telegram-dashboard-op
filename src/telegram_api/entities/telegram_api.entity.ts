import { Manager } from 'src/managers/entities/manager.entity';
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'telegram_client' })
export class TelegramApi {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chat_id: number;

  @Column()
  name: string;

  @Column()
  username: string;

  @Column({ default: false })
  authorization?: boolean;

  @Column({ nullable: true })
  @OneToOne(() => Manager, (manager) => manager.telegram)
  manager?: string;
}
