import "reflect-metadata";
import { auth, toNodeHandler } from "@epl-fellows-platform/auth";
import { createContext } from "@epl-fellows-platform/api/context";
import { appRouter } from "@epl-fellows-platform/api/routers/index";
import { env } from "@epl-fellows-platform/env/server";
import { NestFactory } from "@nestjs/core";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    credentials: true,
  });

  const expressApp = app.getHttpAdapter().getInstance();

  // Better Auth (Express 5 named wildcard)
  expressApp.all("/api/auth/*splat", toNodeHandler(auth));

  // tRPC — mount on Express directly (Nest forRoutes breaks under Express 5)
  expressApp.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  await app.listen(3000);
  console.log("Server is running on http://localhost:3000");
}

bootstrap();
