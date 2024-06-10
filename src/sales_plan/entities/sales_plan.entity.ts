import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SalesPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  plan: string;

  @Column()
  month: string;
}
