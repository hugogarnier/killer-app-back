import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class GamesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createGameDto: Prisma.GameCreateInput) {
    const gameNameFound = await this.databaseService.game.findUnique({
      where: {
        name: createGameDto.name,
      },
    });
    if (gameNameFound) {
      return 'This name already exists.';
    }

    const gameCodeFound = await this.findGameByCode(createGameDto.code);
    if (gameCodeFound) {
      return 'This code already exists.';
    }

    return this.databaseService.game.create({ data: createGameDto });
  }

  async findAll() {
    return this.databaseService.game.findMany();
  }

  async findOne(code: string) {
    const gameFound = await this.findGameByCode(code);
    if (!gameFound) {
      return 'This game does not exist.';
    }
    return gameFound;
  }

  async update(code: string, updateGameDto: Prisma.GameUpdateInput) {
    const gameFound = await this.findGameByCode(code);
    if (!gameFound) {
      return 'This game does not exist.';
    }
    return this.databaseService.game.update({
      where: {
        code,
      },
      data: updateGameDto,
    });
  }

  async remove(code: string) {
    const gameFound = await this.findGameByCode(code);
    if (!gameFound) {
      return 'This game does not exist.';
    }
    return this.databaseService.game.delete({
      where: {
        code,
      },
    });
  }

  async joinGame(data: { code: string; user: Prisma.UserCreateInput }) {
    const code = data.code;
    const user = data.user;
    const randomNumber = Math.floor(Math.random() * 100);

    const gameFound = await this.findGameByCode(code);
    if (!gameFound) {
      return 'This game does not exist.';
    }
    const playerFound = await this.databaseService.player.findUnique({
      where: {
        userId: user.id,
      },
    });
    if (playerFound) {
      return 'This player already exists in this game';
    }

    return this.databaseService.player.create({
      data: {
        code,
        randomNumber,
        userId: user.id,
        gameId: gameFound.id,
        action: '',
        alive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: 'PLAYER',
        player_to_kill_id: null,
        confirmKill: false,
        isWinner: false,
        waitingConfirmationKill: false,
      },
    });
  }

  async startGame(code: string) {
    const gameFound = await this.findGameByCode(code);
    if (!gameFound) {
      return 'This game does not exist.';
    }

    return this.databaseService.game.update({
      data: {
        started: true,
      },
      where: {
        code,
      },
    });
  }

  async findGameByCode(code: string) {
    return this.databaseService.game.findUnique({
      where: {
        code,
      },
    });
  }
}
