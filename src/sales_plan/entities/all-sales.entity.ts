import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'all-sales' })
export class AllSales {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  idAzatGc: number;

  @Column({ nullable: true })
  profit: string;

  @Column({ nullable: true })
  managerName: string;

  @Column({ nullable: true })
  tags: string;
}
