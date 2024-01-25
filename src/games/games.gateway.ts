import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { GamesService } from './games.service';
import { UpdateGameDto } from './dto/update-game.dto';
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

  @SubscribeMessage('identity')
  async identity(@MessageBody() data: number): Promise<number> {
    this.server.emit('identity', data);
    return data;
  }

  @SubscribeMessage('createGame')
  create(@MessageBody() createGameDto: Prisma.GameCreateInput) {
    return this.gamesService.create(createGameDto);
  }

  @SubscribeMessage('findAllGames')
  findAll() {
    return this.gamesService.findAll();
  }

  @SubscribeMessage('findOneGame')
  findOne(@MessageBody() id: number) {
    return this.gamesService.findOne(id);
  }

  @SubscribeMessage('updateGame')
  update(@MessageBody() updateGameDto: UpdateGameDto) {
    return this.gamesService.update(updateGameDto.id, updateGameDto);
  }

  @SubscribeMessage('removeGame')
  remove(@MessageBody() id: number) {
    return this.gamesService.remove(id);
  }
}
