import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Processor('messageQueue')
export class HelloProcessor {
  constructor(
    @InjectBot() private readonly bot: Telegraf,
    @InjectQueue('messageQueue') private readonly messageQueue: Queue,
  ) {}

  @Process('sendMessage')
  async handleSendMessage(job: Job<{ chatId: number; count: number }>) {
    const { chatId, count } = job.data;

    await this.bot.telegram.sendMessage(chatId, 'Hello');

    if (count >= 5) {
      await job.remove();
    } else {
      await this.messageQueue.add(
        'sendMessage',
        { chatId, count: count + 1 },
        { delay: 1000 },
      );
    }
  }
}
