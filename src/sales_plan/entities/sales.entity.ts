import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Sales {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  idAzatGc: number;

  @Column({ nullable: true })
  productName: string;

  @Column({ nullable: true })
  managerName: string;

  @Column({ nullable: true })
  profit: string;

  @Column({ nullable: true })
  payedAt: string;

  @Column({ nullable: true })
  tags: string;
}
