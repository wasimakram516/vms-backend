import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { UserNdaAcceptance } from '../../nda-templates/entities/user-nda-acceptance.entity.js';
import { BadgeTemplate } from '../../badge-templates/entities/badge-template.entity.js';
import { QrTemplate } from '../../qr-templates/entities/qr-template.entity.js';
import { RegistrationStatus } from '../../common/enums/registration-status.enum.js';
import { RegistrationFieldValue } from './registration-field-value.entity.js';

@Entity('registrations')
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => UserNdaAcceptance, { nullable: true })
  ndaAcceptance: UserNdaAcceptance;

  @Column({ nullable: true })
  ndaAcceptanceId: string;

  @ManyToOne(() => BadgeTemplate, { nullable: true })
  badgeTemplate: BadgeTemplate;

  @Column({ nullable: true })
  badgeTemplateId: string;

  @ManyToOne(() => QrTemplate, { nullable: true })
  qrTemplate: QrTemplate;

  @Column({ nullable: true })
  qrTemplateId: string;

  @Column({ type: 'date' })
  requestedDate: string;

  @Column({ type: 'time' })
  requestedTimeFrom: string;

  @Column({ type: 'time' })
  requestedTimeTo: string;

  @Column({ type: 'date', nullable: true })
  approvedDate: string;

  @Column({ type: 'time', nullable: true })
  approvedTimeFrom: string;

  @Column({ type: 'time', nullable: true })
  approvedTimeTo: string;

  @Column({ nullable: true })
  purposeOfVisit: string;

  @Column({ type: 'enum', enum: RegistrationStatus, default: RegistrationStatus.Pending })
  status: RegistrationStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @ManyToOne(() => User, { nullable: true })
  approvedByUser: User;

  @Column({ nullable: true })
  approvedByUserId: string;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ unique: true, nullable: true })
  qrToken: string;

  @Column({ type: 'timestamp', nullable: true })
  checkedInAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkedOutAt: Date;

  @OneToMany(() => RegistrationFieldValue, (value) => value.registration, { cascade: true })
  fieldValues: RegistrationFieldValue[];

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
