import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Registration } from './registration.entity.js';
import { CustomField } from '../../custom-fields/entities/custom-field.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('registration_field_values')
export class RegistrationFieldValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Registration, (reg) => reg.fieldValues, { onDelete: 'CASCADE' })
  registration: Registration;

  @Column()
  registrationId: string;

  @ManyToOne(() => CustomField, { eager: true, onDelete: 'CASCADE' })
  customField: CustomField;

  @Column()
  customFieldId: string;

  @Column({ type: 'jsonb' })
  value: any;

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
