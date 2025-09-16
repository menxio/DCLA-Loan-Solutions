import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Collection } from '../../collections/entities/collection.entity';

@Entity()
export class Center {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column()
  collectionDay: string;

  @OneToMany(() => Collection, (collection) => collection.center)
  collections: Collection[];

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  leader: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
