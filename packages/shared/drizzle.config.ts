import { defineConfig } from "drizzle-kit";
import "./src/loadEnv.ts";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "./data/aif.sqlite",
  },
});
