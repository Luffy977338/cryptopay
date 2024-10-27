// src/tasks/tasks.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Cron } from '@nestjs/schedule';
import { Job } from 'bull';
import { Context } from 'telegraf';

@Processor('hello')
export class HelloProcessor {
  @Process()
  async handleHello(job: Job) {
    try {
      const {
        duration,
        chatId,
        ctx,
      }: { duration: number; chatId: number; ctx: Context } = job.data;
      console.log('Processing job:', job.id); // Log job ID
      // Use chatId to send a message
      await ctx.telegram.sendMessage(chatId, 'Hello!');
      job.progress(100); // Indicate job completion
      return {};
    } catch (error) {
      console.error('Error processing job:', error); // Log any errors
      throw error; // Re-throw error to handle it elsewhere
    }
  }
}
