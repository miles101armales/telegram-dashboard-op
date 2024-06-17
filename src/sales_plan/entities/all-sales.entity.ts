import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'all-sales' })
export class AllSales {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  idAzatGc: number;

  @Column()
  profit: string;

  @Column({ nullable: true })
  managerName: string;
}
