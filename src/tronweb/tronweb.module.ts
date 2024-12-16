import { Module } from '@nestjs/common';
import { TronwebService } from './tronweb.service';

@Module({
  imports: [],
  providers: [TronwebService],
  exports: [TronwebService],
})
export class TronwebModule {}
