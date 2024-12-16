import { OnModuleInit } from '@nestjs/common';
import {
  Start,
  Update,
  Help,
  Command,
  Ctx,
  InjectBot,
  Action,
} from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import * as QRCode from 'qrcode';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { TronwebService } from 'src/tronweb/tronweb.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';

@Update()
export class BotService implements OnModuleInit {
  constructor(
    @InjectBot() private bot: Telegraf,
    @InjectQueue('walletQueue') private readonly walletQueue: Queue,
    private readonly tronwebService: TronwebService,
    private readonly prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    await this.bot.telegram.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'help', description: 'Show help' },
      { command: 'account', description: 'Show account info' },
      { command: 'create_order', description: 'Create a new order' },
    ]);
  }

  @Start()
  async startCommand(@Ctx() ctx: Context) {
    let user = await this.prismaService.user.findUnique({
      where: { telegramId: ctx.from.id.toString() },
    });

    if (!user) {
      const wallet = await this.tronwebService.tronWeb.createAccount();

      const algorithm = 'aes-256-cbc';
      const secretKey = process.env.AES_SECRET_KEY;
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv(
        algorithm,
        Buffer.from(secretKey),
        iv,
      );
      let encrypted = cipher.update(
        wallet.privateKey.toString(),
        'utf8',
        'hex',
      );
      encrypted += cipher.final('hex');

      await this.prismaService.wallet.create({
        data: {
          address: wallet.address.base58,
          privateKey: `${iv.toString('hex')}:${encrypted}`,
        },
      });

      user = await this.prismaService.user.create({
        data: {
          telegramId: ctx.from.id.toString(),
          wallet: wallet.address.base58,
        },
      });
    }
    await ctx.reply(`Hello, ${ctx.from.first_name}!`);
    console.log(user);
  }

  @Help()
  async helpCommand(@Ctx() ctx: Context) {
    await ctx.reply(
      'Available commands:\n/start - Start the bot\n/help - Show help',
    );
  }

  @Command('account')
  async accountCommand(@Ctx() ctx: Context) {
    const user = await this.prismaService.user.findUnique({
      where: { telegramId: ctx.from.id.toString() },
    });

    if (!user) {
      await ctx.reply('User not found');
      return;
    }

    await ctx.reply(
      `Address: ${user.wallet}\nBalance: ${user.USDTBalance} USDT`,
    );
  }

  @Command('create_order')
  async createOrderCommand(@Ctx() ctx: Context) {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { telegramId: ctx.from.id.toString() },
      });

      if (!user) {
        await ctx.reply('User not found');
        return;
      }

      const walletAddress = user.wallet;

      if (!walletAddress) {
        await ctx.reply('Wallet address not found');
        return;
      }

      const qrData = walletAddress;

      const options = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
      };

      const qrImageBuffer = await QRCode.toBuffer(qrData, options);

      let order = await this.prismaService.order.findFirst({
        where: {
          userId: user.id,
          status: 'pending',
        },
      });

      if (order) {
        await ctx.reply('Order already exists');
        await ctx.replyWithPhoto(
          { source: qrImageBuffer },
          {
            caption: `Please send your payment to the following address: ${walletAddress}\nTime left: ${Math.floor(
              (order.expiresAt.getTime() - Date.now()) / 1000 / 60,
            )
              .toString()
              .padStart(2, '0')}:${Math.floor(
              ((order.expiresAt.getTime() - Date.now()) / 1000) % 60,
            )
              .toString()
              .padStart(2, '0')}`,
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Refresh', callback_data: 'refresh_time' }],
                [{ text: 'Address', callback_data: 'copy_address' }],
              ],
            },
          },
        );
        return;
      }

      order = await this.prismaService.order.create({
        data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 10),
        },
      });

      await ctx.replyWithPhoto(
        { source: qrImageBuffer },
        {
          caption: `Please send your payment to the following address: ${walletAddress}\n${
            order.status === 'paid'
              ? 'Status: Paid'
              : order.expiresAt.getTime() - Date.now() > 0
                ? `Time left: ${Math.floor(
                    (order.expiresAt.getTime() - Date.now()) / 1000 / 60,
                  )
                    .toString()
                    .padStart(2, '0')}:${Math.floor(
                    ((order.expiresAt.getTime() - Date.now()) / 1000) % 60,
                  )
                    .toString()
                    .padStart(2, '0')}`
                : 'Status: Expired'
          }`,
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Refresh', callback_data: 'refresh_time' }],
              [{ text: 'Address', callback_data: 'copy_address' }],
            ],
          },
        },
      );

      await this.walletQueue.add(
        'checkTransaction',
        {
          chatId: ctx.chat.id,
          walletAddress,
          userId: user.id,
        },
        { delay: 30000 },
      );
    } catch (error) {
      console.error('Error creating order or checking payment:', error);
      await ctx.reply('Failed to create order or check payment.');
    }
  }

  @Action('copy_address')
  async copyAddressAction(@Ctx() ctx: Context) {
    const message = ctx.callbackQuery.message;

    if ('caption' in message) {
      const addressMatch = message.caption.match(/address: (\S+)/);
      if (addressMatch) {
        const walletAddress = addressMatch[1];
        await ctx.reply(`${walletAddress}`);
      } else {
        await ctx.reply('Address not found in the message.');
      }
    } else {
      await ctx.reply('No caption found in the message.');
    }

    await ctx.answerCbQuery();
  }

  @Action('refresh_time')
  async refreshTimeAction(@Ctx() ctx: Context) {
    const user = await this.prismaService.user.findUnique({
      where: { telegramId: ctx.from.id.toString() },
    });

    if (!user) {
      const newCaption = `Please send your payment to the following address: ${user.wallet}\nStatus: Expired`;

      await ctx.editMessageCaption(newCaption);
      await ctx.answerCbQuery();
      return;
    }

    const order = await this.prismaService.order.findFirst({
      where: {
        userId: user.id,
        status: 'pending',
      },
    });

    if (!order) {
      const newCaption = `Please send your payment to the following address: ${user.wallet}\nStatus: Expired`;

      await ctx.editMessageCaption(newCaption);
      await ctx.answerCbQuery();
      return;
    }

    const timeLeftMinutes = Math.floor(
      (order.expiresAt.getTime() - Date.now()) / 1000 / 60,
    )
      .toString()
      .padStart(2, '0');
    const timeLeftSeconds = Math.floor(
      ((order.expiresAt.getTime() - Date.now()) / 1000) % 60,
    )
      .toString()
      .padStart(2, '0');

    const newCaption = `Please send your payment to the following address: ${user.wallet}\n${
      order.status === 'paid'
        ? 'Status: Paid'
        : order.expiresAt.getTime() - Date.now() > 0
          ? `Time left: ${timeLeftMinutes}:${timeLeftSeconds}`
          : 'Status: Expired'
    }`;

    // Check if the message has a caption and if the new caption is different
    if (
      'caption' in ctx.callbackQuery.message &&
      ctx.callbackQuery.message.caption !== newCaption
    ) {
      await ctx.editMessageCaption(newCaption, {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Refresh', callback_data: 'refresh_time' }],
            [{ text: 'Address', callback_data: 'copy_address' }],
          ],
        },
      });
    }

    await ctx.answerCbQuery();
  }
}
