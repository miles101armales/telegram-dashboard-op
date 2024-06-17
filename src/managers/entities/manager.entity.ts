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

  @Column({ nullable: true })
  monthly_sales: number;

  @Column({ nullable: true })
  personal_monthly_goal: string;

  @Column({ nullable: true })
  salary: number;

  @Column({ nullable: true })
  team: string;

  @Column({ nullable: true })
  quantityOfSales: number;

  @Column({ nullable: true })
  avgPayedPrice: number;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;
}
