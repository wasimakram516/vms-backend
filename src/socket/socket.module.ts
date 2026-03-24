import { Global, Module } from '@nestjs/common';
import { SocketService } from './socket.service.js';
import { SocketGateway } from './socket.gateway.js';
import { RegistrationsSocket } from './registrations.socket.js';

@Global()
@Module({
  providers: [SocketService, SocketGateway, RegistrationsSocket],
  exports: [SocketService, RegistrationsSocket],
})
export class SocketModule {}
