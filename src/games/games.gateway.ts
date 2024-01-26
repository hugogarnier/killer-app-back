import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { GamesService } from './games.service';
import { Server } from 'socket.io';
import { Prisma } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GamesGateway {
  constructor(private readonly gamesService: GamesService) {}

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('createGame')
  create(@MessageBody() createGameDto: Prisma.GameCreateInput) {
    return this.gamesService.create(createGameDto);
  }

  @SubscribeMessage('findAllGames')
  findAll() {
    return this.gamesService.findAll();
  }

  @SubscribeMessage('findOneGame')
  findOne(@MessageBody() code: string) {
    return this.gamesService.findOne(code);
  }

  @SubscribeMessage('updateGame')
  update(@MessageBody() updateGameDto: Prisma.GameUpdateInput) {
    if (typeof updateGameDto.code === 'string') {
      return this.gamesService.update(updateGameDto.code, updateGameDto);
    } else {
      throw new Error('Invalid code type. Expected a string.');
    }
  }

  @SubscribeMessage('removeGame')
  remove(@MessageBody() code: string) {
    return this.gamesService.remove(code);
  }

  @SubscribeMessage('joinGame')
  joinGame(
    @MessageBody() data: { code: string; user: Prisma.UserCreateInput },
  ) {
    return this.gamesService.joinGame(data);
  }

  @SubscribeMessage('startGame')
  startGame(@MessageBody() code: string) {
    return this.gamesService.startGame(code);
  }
}
