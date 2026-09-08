import "reflect-metadata";
import { auth, toNodeHandler } from "@epl-fellows-platform/auth";
import { createContext } from "@epl-fellows-platform/api/context";
import { appRouter } from "@epl-fellows-platform/api/routers/index";
import { env } from "@epl-fellows-platform/env/server";
import { NestFactory } from "@nestjs/core";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { AppModule } from "./app.module";
import { assertEmailConfiguration } from "./lib/email";
import { assertMfaSchema } from "@epl-fellows-platform/auth/mfa-schema";
import { transactionalDb } from "@epl-fellows-platform/db";
import { assertTenantAdminAssignments } from "@epl-fellows-platform/db/tenant-admin-migration";
import { assertAuditSchema } from "@epl-fellows-platform/db/audit-schema";
import { requestAuditContext, withAuditContext } from "@epl-fellows-platform/db/audit";

async function bootstrap() {
  assertEmailConfiguration();
  await assertMfaSchema(transactionalDb);
  await assertAuditSchema(transactionalDb);
  await assertTenantAdminAssignments(transactionalDb);
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    credentials: true,
  });

  const expressApp = app.getHttpAdapter().getInstance();
  if (env.TRUSTED_PROXY_CIDRS.length) expressApp.set("trust proxy", env.TRUSTED_PROXY_CIDRS);

  expressApp.use((req: { ip?: string; socket: { remoteAddress?: string }; headers: Record<string, string | undefined> }, _res: unknown, next: () => void) => {
    const context = requestAuditContext({ ip: req.ip ?? req.socket.remoteAddress, userAgent: req.headers["user-agent"], source: "web" });
    withAuditContext(context, next);
  });

  // Better Auth (Express 5 named wildcard)
  expressApp.use("/api/auth", (req: { headers: Record<string, unknown>; ip?: string; socket: { remoteAddress?: string } }, _res: unknown, next: () => void) => {
    // Overwrite client-supplied values. Express trusts only the socket unless a
    // deployment explicitly configures a trusted reverse proxy.
    req.headers["x-epl-client-ip"] = req.ip ?? req.socket.remoteAddress ?? "unknown";
    next();
  });
  expressApp.all("/api/auth/*splat", toNodeHandler(auth));

  // tRPC — mount on Express directly (Nest forRoutes breaks under Express 5)
  expressApp.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}

bootstrap();
