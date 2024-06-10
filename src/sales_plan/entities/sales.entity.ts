import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Sales {
  @PrimaryColumn()
  id: number;

  @Column()
  product: string;

  @Column()
  manager: string;

  @Column()
  payedPrice: string;

  @Column()
  date: string;

  @Column({ nullable: true })
  tags: string;
}
