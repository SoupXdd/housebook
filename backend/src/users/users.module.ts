import { Module } from '@nestjs/common';
import { BooksModule } from '../books/books.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [BooksModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
