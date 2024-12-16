import { Module } from '@nestjs/common';
import { BotService } from './bot.update';
import { BotProcessor } from './bot.processor';
import { BullModule } from '@nestjs/bull';
import { TronwebModule } from 'src/tronweb/tronweb.module';
import { TronwebService } from 'src/tronweb/tronweb.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'walletQueue',
    }),
    TronwebModule,
  ],
  providers: [BotService, BotProcessor, TronwebService, PrismaService],
})
export class BotModule {}
