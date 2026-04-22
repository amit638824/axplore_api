import { config } from "dotenv";
config({ path: ".env.dev" });

export default {
  datasource: {
    url: process.env.DATABASE_URL,
  },
};