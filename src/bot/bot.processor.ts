import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { InjectBot } from 'nestjs-telegraf';
import { PrismaService } from 'src/prisma/prisma.service';
import { TronwebService } from 'src/tronweb/tronweb.service';
import { Telegraf } from 'telegraf';
import { BigNumber } from 'tronweb';

@Processor('walletQueue')
export class BotProcessor {
  constructor(
    @InjectBot() private readonly bot: Telegraf,
    @InjectQueue('walletQueue') private readonly walletQueue: Queue,
    private readonly tronwebService: TronwebService,
    private readonly prismaService: PrismaService,
  ) {}

  @Process('checkTransaction')
  async handleSendMessage(
    job: Job<{ chatId: number; walletAddress: string; userId: number }>,
  ) {
    // return await job.remove();
    console.log('started');
    let { chatId, walletAddress, userId } = job.data;
    let isPaid = false;
    let amount: string | BigNumber = '';

    const currentTime = new Date();

    const order = await this.prismaService.order.findFirst({
      where: {
        userId,
        status: 'pending',
      },
    });

    if (!order) {
      await this.prismaService.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'failed',
        },
      });
      await this.bot.telegram.sendMessage(chatId, `Order not found!`);
      return await job.remove();
    }

    if (order.expiresAt < currentTime) {
      await this.prismaService.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'failed',
        },
      });
      await this.bot.telegram.sendMessage(chatId, `Payment expired!`);
      return await job.remove();
    }

    const params = {
      only_to: 'true',
      only_confirmed: this.tronwebService.isMainnet ? 'true' : 'false',
      limit: 1,
      order_by: 'block_timestamp,desc',
    };
    const headers = {
      'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY,
    };

    try {
      const response = await fetch(
        `https://api.shasta.trongrid.io/v1/accounts/${walletAddress}/transactions/trc20?${new URLSearchParams(
          params as any,
        ).toString()}`,
        {
          method: 'GET',
          headers: headers,
        },
      );
      const transactions = (await response.json()).data;

      console.log(transactions);

      const transaction = transactions[0];

      if (!transaction) {
        await this.bot.telegram.sendMessage(chatId, `Waiting for payment...`);
        await this.walletQueue.add(
          'checkTransaction',
          { chatId, walletAddress, userId },
          { delay: 30000 },
        );
      } else {
        const transactionExists = await this.prismaService.user.findUnique({
          where: {
            id: userId,
            transactionIds: { has: transaction.transaction_id },
          },
        });
        const confirmed = transaction;

        if (!transactionExists) {
          const usdtContractAddress = this.tronwebService.isMainnet
            ? 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
            : 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs';

          if (
            confirmed &&
            transaction.token_info.address === usdtContractAddress
          ) {
            console.log(
              `New confirmed USDT transaction found: ${transaction.txID}`,
            );
            console.log(
              `Amount: ${this.tronwebService.tronWeb.fromSun(
                transaction.value,
              )} USDT`,
            );
            isPaid = true;
            amount = this.tronwebService.tronWeb.fromSun(transaction.value);
          }
        }

        if (isPaid) {
          await this.prismaService.wallet.update({
            where: {
              address: walletAddress,
            },
            data: {
              USDTBalance: { increment: Number(amount) },
            },
          });
          await this.prismaService.order.update({
            where: {
              id: order.id,
            },
            data: {
              status: 'paid',
            },
          });
          await this.prismaService.user.update({
            where: {
              id: userId,
            },
            data: {
              transactionIds: { push: transaction.transaction_id },
              USDTBalance: { increment: Number(amount) },
            },
          });
          await this.bot.telegram.sendMessage(
            chatId,
            `Payment received! ${amount} USDT`,
          );
          return await job.remove();
        } else {
          await this.bot.telegram.sendMessage(chatId, `Waiting for payment...`);
          await this.walletQueue.add(
            'checkTransaction',
            { chatId, walletAddress, userId },
            { delay: 30000 },
          );
        }
      }
    } catch (err) {
      await this.prismaService.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: 'failed',
        },
      });
      console.log(err);
    }
  }
}
