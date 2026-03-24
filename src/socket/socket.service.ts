import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class SocketService {
  private readonly logger = new Logger(SocketService.name);
  private io: Server | null = null;

  setIo(io: Server): void {
    this.io = io;
  }

  emitUpdate(event: string, data: unknown): void {
    if (!this.io) {
      this.logger.warn(`Socket not initialised — cannot emit "${event}"`);
      return;
    }
    this.io.emit(event, data);
  }

  emitToRoom(room: string, event: string, data: unknown): void {
    if (!this.io) {
      this.logger.warn(`Socket not initialised — cannot emit "${event}" to room "${room}"`);
      return;
    }
    this.io.to(room).emit(event, data);
  }
}
