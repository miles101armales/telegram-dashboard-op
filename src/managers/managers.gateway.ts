import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: 'http://192.168.0.78:5173', // разрешить запросы с этого адреса
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ManagersGateway {
  @WebSocketServer()
  server: Server;

  // Метод для отправки обновлений всем клиентам
  notifyClients() {
    this.server.emit('updateLeaderboard');
  }
}
