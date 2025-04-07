import { TelegramApi } from 'src/telegram_api/entities/telegram_api.entity';
import {
  Column,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Manager {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true, default: 0, type: 'integer' })
  monthly_sales: number;

  @Column({ nullable: true })
  personal_monthly_goal: string;

  @Column({ nullable: true, type: 'integer' })
  salary: number;

  @Column({ nullable: true })
  team: string;

  @Column({ nullable: true, type: 'integer' })
  quantityOfSales: number;

  @Column({ nullable: true, type: 'integer' })
  avgPayedPrice: number;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;
}
