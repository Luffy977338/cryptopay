import { Injectable } from '@nestjs/common';
import { TronWeb } from 'tronweb';

@Injectable()
export class TronwebService {
  public isMainnet = process.env.TRON_NETWORK_URL === 'https://api.trongrid.io';

  tronWeb = new TronWeb({
    fullHost: process.env.TRON_NETWORK_URL,
    headers: { 'TRON-PRO-API-KEY': process.env.TRONGRID_API_KEY },
  });
}
