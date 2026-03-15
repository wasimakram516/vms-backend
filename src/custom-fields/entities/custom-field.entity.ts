import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InputType } from '../../common/enums/input-type.enum.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('custom_fields')
export class CustomField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  fieldKey: string;

  @Column()
  label: string;

  @Column({ type: 'enum', enum: InputType })
  inputType: InputType;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  optionsJson: string[];

  @ManyToOne(() => User, { nullable: true })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  updatedBy: User;

  @Column({ nullable: true })
  updatedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
