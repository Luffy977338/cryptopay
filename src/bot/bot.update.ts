import { OnModuleInit } from '@nestjs/common';
import { Start, Update, Help, Command, Ctx } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import * as QRCode from 'qrcode';
import { TronWeb } from 'tronweb';
import { SchedulerRegistry } from '@nestjs/schedule';

@Update()
export class BotService implements OnModuleInit {
  private bot: Telegraf;

  constructor(private schedulerRegistry: SchedulerRegistry) {
    this.bot = new Telegraf(process.env.BOT_TOKEN);
  }

  async onModuleInit() {
    await this.bot.telegram.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'help', description: 'Show help' },
      { command: 'account', description: 'Show account info' },
    ]);
  }

  @Start()
  async startCommand(@Ctx() ctx: Context) {
    await ctx.reply('Hello!');
  }

  @Help()
  async helpCommand(@Ctx() ctx: Context) {
    await ctx.reply(
      'Available commands:\n/start - Start the bot\n/help - Show help',
    );
  }

  @Command('account')
  async accountCommand(@Ctx() ctx: Context) {
    await ctx.reply('Account command');
  }

  @Command('qr')
  async generateQrCommand(@Ctx() ctx: Context) {
    try {
      const tronWeb = new TronWeb({
        fullHost: 'https://api.trongrid.io',
        headers: { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY },
      });

      const account = await tronWeb.createAccount();
      const walletAddress = account.address.base58;

      // Data to encode in QR
      const qrData = walletAddress;

      const options = {
        errorCorrectionLevel: 'H', // High error correction level
        type: 'image/png',
        width: 300, // Width of the QR code
        margin: 2, // Margin around the QR code
      };

      const qrImageBuffer = await QRCode.toBuffer(qrData, options);

      // Send the QR code and wallet address
      await ctx.replyWithPhoto(
        { source: qrImageBuffer },
        { caption: `Wallet Address: ${walletAddress}` },
      );
    } catch (error) {
      console.error('Error generating QR code or wallet:', error);
      await ctx.reply('Failed to generate QR code or wallet.');
    }
  }

  @Command('create_order')
  async createOrderCommand(@Ctx() ctx: Context) {
    try {
      const tronWeb = new TronWeb({
        fullHost: 'https://api.shasta.trongrid.io', // Use Shasta Testnet
        headers: { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY },
      });

      const account = await tronWeb.createAccount();
      const walletAddress = account.address.base58;

      // Send the wallet address to the user
      await ctx.reply(
        `Please send your payment to the following address: ${walletAddress}`,
      );

      // Schedule a task to check for transactions
      const interval = setInterval(async () => {
        const transactions = await tronWeb.trx.getTransactionsRelated(
          walletAddress,
          'to',
        );

        if (transactions.length > 0) {
          clearInterval(interval);
          this.schedulerRegistry.deleteInterval(walletAddress);
          await ctx.reply('Payment received!');
        }
      }, 60000); // Check every minute

      this.schedulerRegistry.addInterval(walletAddress, interval);

      setTimeout(() => {
        clearInterval(interval);
        this.schedulerRegistry.deleteInterval(walletAddress);
        ctx.reply('No payment received within 30 minutes.');
      }, 1800000); // 30 minutes
    } catch (error) {
      console.error('Error creating order or checking payment:', error);
      await ctx.reply('Failed to create order or check payment.');
    }
  }
}
