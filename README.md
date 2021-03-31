# DynamoDB next-auth

This project is here to test my pr for a [next-auth dynamodb adapter](https://github.com/nextauthjs/adapters/pull/44).

I've gone with a single table design. This project is an application of what I'm currently learning with [Alex DeBrie's book](https://www.dynamodbbook.com/). If you to learn more about DynamoDB you definitely should take a look at it !

<p align="center">
    <img src="https://raw.githubusercontent.com/polmrt/next-auth-dynamodb-adapter/master/.github/img/schema.png" alt="Next-auth data schema">
</p>
(This schema has an error: verification_reqest have no connection with users, they are a separete entity)

## DynamoDB configuration required

You need a table with as partition key `pk` and as sort key `sk`. Your table also need a global secondary index names `GSI1` with `GSI1PK` as partition key and `GSI1SK` as sorting key. You can set whatever you want as the table name and the billing method.

You need to add these environment variables to a `.env.local` file :

- `GITHUB_ID` Github oauth app id
- `GITHUB_SECRET` Github oauth app secret
- `EMAIL_SERVER` Email server
- `EMAIL_FROM` Email from
- `NEXT_AUTH_AWS_ACCESS_KEY` AWS IAM access key
- `NEXT_AUTH_AWS_SECRET_KEY` AWS IAM secret key
- `NEXT_AUTH_AWS_REGION` AWS region

Note that Github and Email are only used as providers for testing purpose.
AWS secret start with `NEXT_AUTH` in order to not conflict with [Vercel's reserved environment variables](https://vercel.com/docs/environment-variables#reserved-environment-variables).

## State of the project

All functions needed for an adapter in Next-Auth have been done. I'm now testing different scenarios to see if everythings work. Also, need to clean the code before PR.

Here is a detailed view of what needs to be done in order to have a working adapter :

- [x] createUser
- [x] getUser
- [x] getUserByEmail
- [x] getUserByProviderAccountId
- [x] updateUser
- [x] deleteUser
- [x] linkAccount
- [x] unlinkAccount
- [x] createSession
- [x] getSession
- [x] updateSession
- [x] deleteSession
- [x] createVerificationRequest
- [x] getVerificationRequest
- [x] deleteVerificationRequest
