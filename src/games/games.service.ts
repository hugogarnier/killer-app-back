import { Injectable } from '@nestjs/common';
import { UpdateGameDto } from './dto/update-game.dto';
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

    const gameCodeFound = await this.databaseService.game.findUnique({
      where: {
        code: createGameDto.code,
      },
    });
    if (gameCodeFound) {
      return 'This code already exists.';
    }

    return this.databaseService.game.create({ data: createGameDto });
  }

  findAll() {
    return this.databaseService.game.findMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} game`;
  }

  update(id: number, updateGameDto: UpdateGameDto) {
    return `This action updates a #${id} game`;
  }

  remove(id: number) {
    return `This action removes a #${id} game`;
  }
}
