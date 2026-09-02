import { Module } from "@nestjs/common";

/**
 * tRPC is mounted on the Express instance in `src/index.ts`
 * (Nest MiddlewareConsumer path matching is unreliable on Express 5).
 */
@Module({})
export class TrpcModule {}
