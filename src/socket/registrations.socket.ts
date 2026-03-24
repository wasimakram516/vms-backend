import { Injectable } from '@nestjs/common';
import { SocketService } from './socket.service.js';

@Injectable()
export class RegistrationsSocket {
  constructor(private readonly socketService: SocketService) {}

  emitNewRegistration(registration: unknown): void {
    this.socketService.emitUpdate('registration:new', registration);
  }

  emitRegistrationUpdated(registration: unknown): void {
    this.socketService.emitUpdate('registration:updated', registration);
  }
}
