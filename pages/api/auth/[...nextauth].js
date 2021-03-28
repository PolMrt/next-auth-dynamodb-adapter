import AWS from "aws-sdk";
import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import customTestAdapter from "../../../utils/adapter";

AWS.config.update({
  accessKeyId: process.env.NEXT_AUTH_AWS_ACCESS_KEY,
  secretAccessKey: process.env.NEXT_AUTH_AWS_SECRET_KEY,
  region: process.env.NEXT_AUTH_AWS_REGION,
});

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    // ...add more providers here
  ],
  adapter: customTestAdapter({
    AWS,
    tableName: "next-auth-test",
  }),

  // A database is optional, but required to persist accounts in a database
  // database: process.env.DATABASE_URL,
  debug: true,
});
