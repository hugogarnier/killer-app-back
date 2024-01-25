// menu.controller.ts
// Import necessary modules and dependencies
import { Controller, Post, Body } from '@nestjs/common';
import { CreateMenuDto } from './dto/create-menu.dto';
import { MenuService } from './menu.service';
import { Menu } from './entities/menus.entity';

@Controller('menu') // Define the base route for this controller
export class MenuController {
  constructor(private readonly menuService: MenuService) {} // Inject the MenuService instance

  @Post() // Handle HTTP POST requests to create a menu
  create(@Body() createMenuDto: CreateMenuDto): Promise<Menu> {
    return this.menuService.create(createMenuDto);
  }
}
