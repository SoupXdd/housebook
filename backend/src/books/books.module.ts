import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { PrismaModule } from '../prisma/prisma.module';
import {
  HttpClient,
  LookupCache,
  OpenLibraryProvider,
  LitResProvider,
} from './providers';

@Module({
  imports: [PrismaModule],
  controllers: [BooksController],
  providers: [
    HttpClient,
    LookupCache,

    OpenLibraryProvider,
    LitResProvider,

    BooksService,
  ],
  exports: [BooksService],
})
export class BooksModule {}
