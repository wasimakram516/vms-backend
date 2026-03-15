import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Registration } from '../../registrations/entities/registration.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { ActivityType } from '../../common/enums/activity-type.enum.js';

@Entity('registration_activity_logs')
export class RegistrationActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Registration, { onDelete: 'CASCADE' })
  registration: Registration;

  @Column()
  registrationId: string;

  @ManyToOne(() => User, { nullable: true })
  actorUser: User;

  @Column({ nullable: true })
  actorUserId: string;

  @Column({ type: 'enum', enum: ActivityType })
  activityType: ActivityType;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

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
