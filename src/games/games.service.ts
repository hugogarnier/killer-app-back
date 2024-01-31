import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@prisma/client';
import { actions } from '../constants';

@Injectable()
export class GamesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createGameDto: Prisma.GameCreateInput) {
    const gameNameFound = await this.databaseService.game.findFirst({
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

  async findAllGamesByUserId(userId: string) {
    const playerGames = await this.databaseService.player.findMany({
      where: {
        userId,
      },
      select: {
        gameId: true,
      },
    });

    const filteredGames = await this.databaseService.game.findMany({
      where: {
        OR: [
          {
            admin: userId,
          },
          {
            id: {
              in: playerGames.map((playerGame) => playerGame.gameId),
            },
          },
        ],
      },
    });

    return filteredGames;
  }

  async findOne(code: string) {
    const gameFound = await this.findGameByCode(code);
    if (!gameFound) {
      return 'This game does not exist.';
    }

    const players = await this.findPlayersByCode(code);

    return { gameFound, players };
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
    const playerFound = await this.databaseService.player.findFirst({
      where: {
        AND: [
          {
            code,
          },
          {
            userId: user.id,
          },
        ],
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

    const players = await this.findPlayersByCode(code);

    let userIndex = 0;
    const tabRandomNumber: number[] = [];

    const parsedPlayers = players.map((player) => {
      let randomNumber = Math.floor(Math.random() * (actions.length ?? 0));
      if (randomNumber && tabRandomNumber.includes(randomNumber)) {
        randomNumber = Math.floor(Math.random() * (actions.length ?? 0));
      }
      tabRandomNumber.push(randomNumber);

      if (players.length - 1 === userIndex) {
        player.player_to_kill_id = players[0].userId;
        player.action = actions[randomNumber]
          ? actions[randomNumber].action
          : '';

        return player;
      } else {
        player.player_to_kill_id = players[userIndex + 1].userId;
        player.action = actions[randomNumber]
          ? actions[randomNumber].action
          : '';
        userIndex++;
        return player;
      }
    });

    const updatedPlayers = await Promise.all(
      parsedPlayers.map(async (player) => {
        return this.databaseService.player.update({
          where: {
            id: player.id,
          },
          data: {
            player_to_kill_id: player.player_to_kill_id,
            action: player.action,
          },
        });
      }),
    );

    const updatedGame = await this.databaseService.game.update({
      where: {
        code,
      },
      data: {
        started: true,
      },
    });

    return { updatedGame, updatedPlayers };
  }

  async killPlayer(data: { code: string; userId: string }) {
    const gameFound = await this.findGameByCode(data.code);
    if (!gameFound) {
      return 'This game does not exist.';
    }

    if (gameFound.ended) {
      const winners = await this.isWinner(data.code);

      if (winners.length === 1) {
        return { gameEnded: gameFound.ended, winners };
      }
      return 'This game is already ended.';
    }

    const playerFound = await this.findPlayerByCodeAndUserId(
      data.code,
      data.userId,
    );

    if (!playerFound) {
      return 'This player does not exist.';
    }

    if (!playerFound.alive) {
      return 'This player is already dead.';
    }

    const playerToKillFound = await this.findPlayerByCodeAndUserId(
      data.code,
      playerFound.player_to_kill_id,
    );

    if (!playerToKillFound) {
      return 'This player to kill does not exist.';
    }

    if (!playerToKillFound.alive) {
      return 'This player to kill is already dead.';
    }

    const updatedPlayer = await this.databaseService.player.update({
      where: {
        id: playerFound.id,
      },
      data: {
        action: playerToKillFound.action,
        player_to_kill_id: playerToKillFound.player_to_kill_id,
        waitingConfirmationKill: true,
      },
    });

    const updatedPlayerKilled = await this.databaseService.player.update({
      where: {
        id: playerToKillFound.id,
      },
      data: {
        alive: false,
        waitingConfirmationKill: true,
        killedBy: playerFound.userId,
      },
    });

    const winners = await this.isWinner(data.code);

    if (winners.length < 2) {
      await this.databaseService.game.update({
        where: {
          code: data.code,
        },
        data: {
          ended: true,
        },
      });
      await this.databaseService.player.updateMany({
        where: {
          code: data.code,
        },
        data: {
          isWinner: true,
        },
      });

      return { updatedPlayer };
    }

    return { updatedPlayer, updatedPlayerKilled };
  }

  async confirmKill(data: { code: string; userId: string }) {
    const playerKilled = await this.findPlayerByCodeAndUserId(
      data.code,
      data.userId,
    );

    if (!playerKilled) {
      return 'This player does not exist.';
    }

    if (!playerKilled.waitingConfirmationKill) {
      return 'This player is not waiting for confirmation.';
    }

    const killer = await this.findPlayerByCodeAndUserId(
      data.code,
      playerKilled.killedBy,
    );

    if (!killer) {
      return 'This player does not exist.';
    }

    const updatedKiller = await this.databaseService.player.update({
      where: {
        id: killer.id,
      },
      data: {
        waitingConfirmationKill: false,
      },
    });

    const updatedPlayerKilled = await this.databaseService.player.update({
      where: {
        id: playerKilled.id,
      },
      data: {
        waitingConfirmationKill: false,
        confirmKill: true,
      },
    });

    return { updatedKiller, updatedPlayerKilled };
  }

  async findGameByCode(code: string) {
    return this.databaseService.game.findUnique({
      where: {
        code,
      },
    });
  }

  async findPlayersByCode(code: string) {
    return this.databaseService.player.findMany({
      orderBy: {
        randomNumber: 'asc',
      },
      where: {
        code,
      },
    });
  }

  async isWinner(code: string) {
    return this.databaseService.player.findMany({
      where: {
        AND: [
          {
            code,
          },
          {
            alive: true,
          },
        ],
      },
    });
  }

  async findPlayerByCodeAndUserId(code: string, userId: string) {
    return this.databaseService.player.findFirst({
      where: {
        AND: [
          {
            code,
          },
          {
            userId,
          },
        ],
      },
    });
  }
}
