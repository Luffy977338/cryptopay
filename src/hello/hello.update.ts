import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Command, Ctx, Update } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Update()
export class HelloUpdate {
  constructor(@InjectQueue('messageQueue') private messageQueue: Queue) {}

  @Command('hello')
  async helloCommand(@Ctx() ctx: Context) {
    const chatId = ctx.chat.id;
    await this.messageQueue.add(
      'sendMessage',
      { chatId, count: 1 },
      { delay: 1000 },
    );
  }
}
