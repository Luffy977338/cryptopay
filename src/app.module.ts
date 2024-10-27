import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrderService } from './order/order.service';
import { OrderModule } from './order/order.module';
import { PrismaService } from './prisma/prisma.service';
import { WalletModule } from './wallet/wallet.module';
import { HelloModule } from './hello/hello.module';
import { BullModule } from '@nestjs/bull';
import { TelegrafModule } from 'nestjs-telegraf';

@Module({
  imports: [
    BotModule,
    ConfigModule,
    OrderModule,
    WalletModule,
    HelloModule,
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    ConfigModule.forRoot(),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get('BOT_TOKEN'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [ConfigService, AppService, OrderService, PrismaService],
})
export class AppModule {}
