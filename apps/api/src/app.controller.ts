import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// VI: Controller suc khoe toi thieu de kiem tra backend chay truoc khi them nghiep vu.
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
