import { createHash, randomBytes } from "crypto";

export default function Adapter(config, options = {}) {
  if (!config.AWS) {
    console.error("CONFIG_ADAPTER", "AWS is not defined in adapter config");
    return Promise.reject(new Error("CONFIG_ADAPTER"));
  }

  if (!config.tableName) {
    console.error(
      "CONFIG_ADAPTER",
      "tableName is not defined in adapter config"
    );
    return Promise.reject(new Error("CONFIG_ADAPTER"));
  }

  const TableName = config.tableName;
  const DynamoClient = new config.AWS.DynamoDB.DocumentClient();

  async function getAdapter(appOptions) {
    // console.log(appOptions);
    // Display debug output if debug option enabled
    function _debug(...args) {
      if (appOptions.debug) {
        console.log("[next-auth][debug]", ...args);
      }
    }

    const defaultSessionMaxAge = 30 * 24 * 60 * 60 * 1000;
    const sessionMaxAge =
      appOptions && appOptions.session && appOptions.session.maxAge
        ? appOptions.session.maxAge * 1000
        : defaultSessionMaxAge;
    const sessionUpdateAge =
      appOptions && appOptions.session && appOptions.session.updateAge
        ? appOptions.session.updateAge * 1000
        : 0;

    async function createUser(profile) {
      _debug("createUser", profile);

      const userId = randomBytes(16).toString("hex");
      const now = new Date();
      let item = {
        pk: `USER#${userId}`,
        sk: `USER#${userId}`,
        id: userId,
        type: "USER",
        name: profile.name,
        email: profile.email,
        iamge: profile.image,
        username: profile.username,
        emailVerified: profile.emailVerified
          ? profile.emailVerified.toISOString()
          : null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      if (profile.email) {
        item.GSI1SK = `USER#${profile.email}`;
        item.GSI1PK = `USER#${profile.email}`;
      }

      try {
        const data = await DynamoClient.put({
          TableName,
          Item: item,
        }).promise();

        return item;
      } catch (error) {
        console.error("CREATE_USER", error);
        return Promise.reject(new Error("CREATE_USER"));
      }
    }

    async function getUser(id) {
      _debug("getUser", id);

      try {
        const data = await DynamoClient.get({
          TableName,
          Key: {
            pk: `USER#${id}`,
            sk: `USER#${id}`,
          },
        }).promise();

        return data.Item || null;
      } catch (error) {
        console.error("GET_USER", error);
        return Promise.reject(new Error("GET_USER"));
      }
    }

    async function getUserByEmail(email) {
      _debug("getUserByEmail", email);

      try {
        const data = await DynamoClient.query({
          TableName,
          IndexName: "GSI1",
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
          ExpressionAttributeNames: {
            "#gsi1pk": "GSI1PK",
            "#gsi1sk": "GSI1SK",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": `USER#${email}`,
            ":gsi1sk": `USER#${email}`,
          },
        }).promise();

        return data.Items[0] || null;
      } catch (error) {
        console.error("GET_USER_BY_EMAIL", error);
        return Promise.reject(new Error("GET_USER_BY_EMAIL"));
      }
    }

    async function getUserByProviderAccountId(providerId, providerAccountId) {
      _debug("getUserByProviderAccountId", providerId, providerAccountId);

      try {
        const data = await DynamoClient.query({
          TableName,
          IndexName: "GSI1",
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
          ExpressionAttributeNames: {
            "#gsi1pk": "GSI1PK",
            "#gsi1sk": "GSI1SK",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": `ACCOUNT#${providerAccountId}`,
            ":gsi1sk": `ACCOUNT#${providerId}`,
          },
        }).promise();

        if (!data) return null;
        if (!data.Items.length > 0) return null;

        const user = await DynamoClient.get({
          TableName,
          Key: {
            pk: `USER#${data.Items[0].userId}`,
            sk: `USER#${data.Items[0].userId}`,
          },
        }).promise();

        return user.Item || null;
      } catch (error) {
        console.error("GET_USER_BY_PROVIDER_ACCOUNT_ID", error);
        return Promise.reject(new Error("GET_USER_BY_PROVIDER_ACCOUNT_ID"));
      }
    }

    async function updateUser(user) {
      _debug("updateUser", user);
      return null;
    }

    async function deleteUser(userId) {
      _debug("deleteUser", userId);

      try {
        const deleted = await DynamoClient.delete({
          TableName,
          Key: {
            pk: `USER#${userId}`,
            sk: `USER#${userId}`,
          },
        }).promise();

        return deleted;
      } catch (error) {
        console.error("DELETE_USER_ERROR", error);
        return Promise.reject(new Error("DELETE_USER_ERROR"));
      }
    }

    async function linkAccount(
      userId,
      providerId,
      providerType,
      providerAccountId,
      refreshToken,
      accessToken,
      accessTokenExpires
    ) {
      _debug(
        "linkAccount",
        userId,
        providerId,
        providerType,
        providerAccountId,
        refreshToken,
        accessToken,
        accessTokenExpires
      );

      const now = new Date();

      let item = {
        pk: `USER#${userId}`,
        sk: `ACCOUNT#${providerId}#${providerAccountId}`,
        GSI1SK: `ACCOUNT#${providerId}`,
        GSI1PK: `ACCOUNT#${providerAccountId}`,
        providerId,
        providerAccountId,
        providerType,
        refreshToken,
        accessToken,
        accessTokenExpires,
        type: "ACCOUNT",
        userId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      try {
        const data = await DynamoClient.put({
          TableName,
          Item: item,
        }).promise();

        return item;
      } catch (error) {
        console.error("LINK_ACCOUNT_ERROR", error);
        return Promise.reject(new Error("LINK_ACCOUNT_ERROR"));
      }
    }

    async function unlinkAccount(userId, providerId, providerAccountId) {
      _debug("unlinkAccount", userId, providerId, providerAccountId);
      return null;
    }

    async function createSession(user) {
      _debug("createSession", user);

      let expires = null;
      if (sessionMaxAge) {
        const dateExpires = new Date();
        dateExpires.setTime(dateExpires.getTime() + sessionMaxAge);
        expires = dateExpires.toISOString();
      }

      const sessionToken = randomBytes(32).toString("hex");
      const accessToken = randomBytes(32).toString("hex");

      const now = new Date();

      let item = {
        pk: `USER#${user.id}`,
        sk: `SESSION#${sessionToken}`,
        GSI1SK: `SESSION#${sessionToken}`,
        GSI1PK: `SESSION#${sessionToken}`,
        sessionToken,
        accessToken,
        type: "SESSION",
        userId: user.id,
        expires,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      try {
        const data = await DynamoClient.put({
          TableName,
          Item: item,
        }).promise();

        return item;
      } catch (error) {
        console.error("CREATE_SESSION_ERROR", error);
        return Promise.reject(new Error("CREATE_SESSION_ERROR"));
      }
    }

    async function getSession(sessionToken) {
      _debug("getSession", sessionToken);

      try {
        const data = await DynamoClient.query({
          TableName,
          IndexName: "GSI1",
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
          ExpressionAttributeNames: {
            "#gsi1pk": "GSI1PK",
            "#gsi1sk": "GSI1SK",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": `SESSION#${sessionToken}`,
            ":gsi1sk": `SESSION#${sessionToken}`,
          },
        }).promise();

        const session = data.Items[0] || null;

        if (session && session.expires && new Date() > session.expires) {
          await deleteSession(sessionToken);
          return null;
        }

        return session;
      } catch (error) {
        console.error("GET_SESSION_ERROR", error);
        return Promise.reject(new Error("GET_SESSION_ERROR"));
      }
    }

    async function updateSession(session, force) {
      _debug("updateSession", session);

      try {
        const shouldUpdate =
          sessionMaxAge &&
          (sessionUpdateAge || sessionUpdateAge === 0) &&
          session.expires;
        if (!shouldUpdate && !force) {
          return null;
        }

        // Calculate last updated date, to throttle write updates to database
        // Formula: ({expiry date} - sessionMaxAge) + sessionUpdateAge
        //     e.g. ({expiry date} - 30 days) + 1 hour
        //
        // Default for sessionMaxAge is 30 days.
        // Default for sessionUpdateAge is 1 hour.
        const dateSessionIsDueToBeUpdated = new Date(session.expires);
        dateSessionIsDueToBeUpdated.setTime(
          dateSessionIsDueToBeUpdated.getTime() - sessionMaxAge
        );
        dateSessionIsDueToBeUpdated.setTime(
          dateSessionIsDueToBeUpdated.getTime() + sessionUpdateAge
        );

        // Trigger update of session expiry date and write to database, only
        // if the session was last updated more than {sessionUpdateAge} ago
        const currentDate = new Date();
        if (currentDate < dateSessionIsDueToBeUpdated && !force) {
          return null;
        }

        const newExpiryDate = new Date();
        newExpiryDate.setTime(newExpiryDate.getTime() + sessionMaxAge);

        const data = await DynamoClient.update({
          TableName,
          Key: {
            pk: session.pk,
            sk: session.sk,
          },
          UpdateExpression: "set #expires = :expires, #updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#expires": "expires",
            "#updatedAt": "updatedAt",
          },
          ExpressionAttributeValues: {
            ":expires": newExpiryDate.toISOString(),
            ":updatedAt": new Date().toISOString(),
          },
          ReturnValues: "UPDATED_NEW",
        }).promise();

        return {
          ...session,
          expires: data.Attributes.expires,
          updatedAt: data.Attributes.updatedAt,
        };
      } catch (error) {
        console.error("UPDATE_SESSION_ERROR", error);
        return Promise.reject(new Error("UPDATE_SESSION_ERROR"));
      }
    }

    async function deleteSession(sessionToken) {
      _debug("deleteSession", sessionToken);

      try {
        const data = await DynamoClient.query({
          TableName,
          IndexName: "GSI1",
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
          ExpressionAttributeNames: {
            "#gsi1pk": "GSI1PK",
            "#gsi1sk": "GSI1SK",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": `SESSION#${sessionToken}`,
            ":gsi1sk": `SESSION#${sessionToken}`,
          },
        }).promise();

        if (data?.Items?.length <= 0) return null;

        const infoToDelete = data.Items[0];

        const deleted = await DynamoClient.delete({
          TableName,
          Key: {
            pk: infoToDelete.pk,
            sk: infoToDelete.sk,
          },
        }).promise();

        return deleted;
      } catch (error) {
        console.error("DELETE_SESSION_ERROR", error);
        return Promise.reject(new Error("DELETE_SESSION_ERROR"));
      }
    }

    async function createVerificationRequest(
      identifier,
      url,
      token,
      secret,
      provider
    ) {
      _debug("createVerificationRequest", identifier);
      return null;
    }

    async function getVerificationRequest(identifier, token, secret, provider) {
      _debug("getVerificationRequest", identifier, token);
      return null;
    }

    async function deleteVerificationRequest(
      identifier,
      token,
      secret,
      provider
    ) {
      _debug("deleteVerification", identifier, token);
      return null;
    }

    return {
      createUser,
      getUser,
      getUserByEmail,
      getUserByProviderAccountId,
      updateUser,
      deleteUser,
      linkAccount,
      unlinkAccount,
      createSession,
      getSession,
      updateSession,
      deleteSession,
      createVerificationRequest,
      getVerificationRequest,
      deleteVerificationRequest,
    };
  }

  return {
    getAdapter,
  };
}
