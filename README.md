# DynamoDB next-auth

This project is currently work in progress. I'm trying to add DynamoDB as a Next-Auth database adapter.

I've gone with a single table design. This project is an application of what I'm currently learning with [Alex DeBrie's book](https://www.dynamodbbook.com/). If you to learn more about DynamoDB you definitely should take a look at it !

![Next-auth data schema][https://raw.githubusercontent.com/polmrt/next-auth-dynamodb-adapter/main/_github/img/schema.png]

## State of the project

Work in progress.

Here is a detailed view of what needs to be done in order to have a working adapter :

- [x] createUser
- [ ] getUser (done but need to be tested)
- [x] getUserByEmail
- [x] getUserByProviderAccountId
- [ ] updateUser
- [ ] deleteUser
- [x] linkAccount
- [ ] unlinkAccount
- [x] createSession
- [x] getSession
- [x] updateSession
- [ ] deleteSession
- [ ] createVerificationRequest
- [ ] getVerificationRequest
- [ ] deleteVerificationRequest
