import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'exports' })
export class GetcourseApi {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  export_id: number;

  @Column()
  status: 'creating' | 'exported' | 'bad_export_id';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
