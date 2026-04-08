import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUserId } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoansService } from './loans.service';

@ApiTags('loans')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a manual loan for a book in current user library',
  })
  @ApiBody({ type: CreateLoanDto })
  @ApiResponse({ status: 201, description: 'Loan created successfully' })
  createLoan(@GetCurrentUserId() userId: number, @Body() dto: CreateLoanDto) {
    return this.loansService.createLoan(userId, dto);
  }

  @Get('outgoing')
  @ApiOperation({ summary: 'Get current user outgoing loans' })
  @ApiResponse({ status: 200, description: 'Outgoing loans loaded' })
  getOutgoing(@GetCurrentUserId() userId: number) {
    return this.loansService.getOutgoingLoans(userId);
  }

  @Get('incoming')
  @ApiOperation({ summary: 'Get current user incoming loans' })
  @ApiResponse({ status: 200, description: 'Incoming loans loaded' })
  getIncoming(@GetCurrentUserId() userId: number) {
    return this.loansService.getIncomingLoans(userId);
  }

  @Patch(':loanId/return')
  @ApiOperation({ summary: 'Mark a loan as returned' })
  @ApiResponse({ status: 200, description: 'Loan marked as returned' })
  returnLoan(
    @GetCurrentUserId() userId: number,
    @Param('loanId', ParseIntPipe) loanId: number,
  ) {
    return this.loansService.returnLoan(userId, loanId);
  }
}
