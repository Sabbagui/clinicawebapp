import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.warn('Warning: Could not connect to database during initialization:', error.message);
      console.warn('Database operations will be attempted at runtime.');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
