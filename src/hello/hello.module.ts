import { Module } from '@nestjs/common';
import { HelloService } from './hello.update';
import { BullModule } from '@nestjs/bull';
import { HelloProcessor } from './hello.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'hello',
    }),
  ],
  providers: [HelloService, HelloProcessor],
})
export class HelloModule {}
