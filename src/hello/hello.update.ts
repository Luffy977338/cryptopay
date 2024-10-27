import { Cron, CronExpression } from '@nestjs/schedule';
import { Command, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

let isCronActive = false; // Flag to control Cron task
let savedCtx: Context | null = null; // Variable to store context

@Update()
export class HelloService {
  // Изменяем расписание на каждую секунду
  @Cron(CronExpression.EVERY_SECOND)
  async scheduledHello() {
    if (isCronActive && savedCtx) {
      console.log('Cron task is active'); // Log to check if the task is active
      // Отправляем сообщение каждую секунду, если флаг активен
      await savedCtx.reply('Hello!');
    }
  }

  @Command('hello')
  async helloCommand(@Ctx() ctx: Context) {
    // Сохраняем контекст и активируем флаг для запуска Cron задачи
    savedCtx = ctx;
    isCronActive = true;
    console.log('Cron task activated'); // Log to confirm activation
    await ctx.reply('Cron task activated!');
  }
}
