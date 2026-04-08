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
import { ApproveLoanRequestDto } from './dto/approve-loan-request.dto';
import { CreateLoanRequestDto } from './dto/create-loan-request.dto';
import { LoanRequestsService } from './loan-requests.service';

@ApiTags('loan-requests')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('loan-requests')
export class LoanRequestsController {
  constructor(private readonly loanRequestsService: LoanRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new borrow request for a public book' })
  @ApiBody({ type: CreateLoanRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Loan request created successfully',
  })
  createRequest(
    @GetCurrentUserId() userId: number,
    @Body() dto: CreateLoanRequestDto,
  ) {
    return this.loanRequestsService.createRequest(userId, dto);
  }

  @Get('incoming')
  @ApiOperation({ summary: 'Get incoming borrow requests for current user' })
  @ApiResponse({ status: 200, description: 'Incoming requests loaded' })
  getIncoming(@GetCurrentUserId() userId: number) {
    return this.loanRequestsService.getIncomingRequests(userId);
  }

  @Get('outgoing')
  @ApiOperation({ summary: 'Get outgoing borrow requests for current user' })
  @ApiResponse({ status: 200, description: 'Outgoing requests loaded' })
  getOutgoing(@GetCurrentUserId() userId: number) {
    return this.loanRequestsService.getOutgoingRequests(userId);
  }

  @Patch(':requestId/approve')
  @ApiOperation({ summary: 'Approve a borrow request and create a loan' })
  @ApiBody({ type: ApproveLoanRequestDto })
  @ApiResponse({ status: 200, description: 'Request approved successfully' })
  approveRequest(
    @GetCurrentUserId() userId: number,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: ApproveLoanRequestDto,
  ) {
    return this.loanRequestsService.approveRequest(userId, requestId, dto);
  }

  @Patch(':requestId/reject')
  @ApiOperation({ summary: 'Reject a borrow request' })
  @ApiResponse({ status: 200, description: 'Request rejected successfully' })
  rejectRequest(
    @GetCurrentUserId() userId: number,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.loanRequestsService.rejectRequest(userId, requestId);
  }
}
