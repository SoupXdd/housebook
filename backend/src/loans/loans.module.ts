import { Module } from '@nestjs/common';
import { LoanRequestsController } from './loan-requests.controller';
import { LoanRequestsService } from './loan-requests.service';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  controllers: [LoansController, LoanRequestsController],
  providers: [LoansService, LoanRequestsService],
  exports: [LoansService, LoanRequestsService],
})
export class LoansModule {}
