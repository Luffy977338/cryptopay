import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { HelloProcessor } from './hello.processor';
import { HelloUpdate } from './hello.update';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'messageQueue',
    }),
  ],
  providers: [HelloUpdate, HelloProcessor],
})
export class HelloModule {}
