import path from "node:path";
import { cors } from "@elysiajs/cors";
import { cron } from "@elysiajs/cron";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Elysia } from "elysia";
import activity from "./activity";
import db from "./database";
import project from "./project";
import task from "./task";
import user from "./user";
import { validateSessionToken } from "./user/controllers/validate-session-token";
import purgeData from "./utils/purge-demo-data";
import setDemoUser from "./utils/set-demo-user";
import workspace from "./workspace";
import workspaceUser from "./workspace-user";

const isDemoMode = process.env.DEMO_MODE === "true";

const app = new Elysia()
  .state("userEmail", "")
  .use(cors({
    origin: ["https://kaneo-web.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposeHeaders: ["Set-Cookie"]
  }))
  .use(user)
  .use(
    cron({
      name: "purge-demo-data",
      pattern: "30 * * * *",
      run: async () => {
        const isDemoMode = process.env.DEMO_MODE === "true";

        if (isDemoMode) {
          console.log("Purging demo data");
          await purgeData();
        }
      },
    })
  )
  .derive(async ({ cookie: { session }, set }) => {
    let currentUser = null;
    
    if (isDemoMode) {
      if (!session?.value) {
        await setDemoUser(set);
      }

      const { user, session: validatedSession } = await validateSessionToken(
        session.value ?? ""
      );

      if (!user || !validatedSession) {
        await setDemoUser(set);
      } else {
        currentUser = user;
      }
    } else {
      if (session?.value) {
        const { user } = await validateSessionToken(session.value);
        currentUser = user;
      }
    }
    
    return {
      user: currentUser,
      userEmail: currentUser?.email ?? ""
    };
  })
  .get("/me", async ({ user }) => {
    return { user };
  })
  .use(workspace)
  .use(project)
  .use(task)
  .use(workspaceUser)
  .use(activity)
  .onError(({ code, error }) => {
    switch (code) {
      case "VALIDATION":
        return error.all;
      default:
        if (error instanceof Error) {
          return {
            name: error.name,
            message: error.message,
          };
        }
    }
  })
  .listen(1337);

export type App = typeof app;

migrate(db, {
  migrationsFolder: path.join(__dirname, "../drizzle"),
});

console.log(`🏃 Kaneo is running at ${app.server?.url}`);
