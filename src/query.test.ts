import { faker } from "@faker-js/faker";
import { Redis } from "@upstash/redis";
import { Query } from "./query";
import { expect, test } from "bun:test";

test("minimal example", async () => {
  type User = {
    id: string;
    name: string;
    organization: string;
    email: string;
  };

  /**
   * Initialize the client
   */
  const q = new Query({
    redis: Redis.fromEnv({ automaticDeserialization: false }),
  });

  /**
   * Create your first collection.
   *
   * Please make sure you're passing in a type to take full advantage of @upstash/query
   */
  const users = q.createCollection<User>(crypto.randomUUID());

  /**
   * Create a searchable index on the collection and specify which terms we are filtering by
   * terms are fully typed as long as you have defined a custom type when creating the collection
   */
  const usersByOrganization = users.createIndex({
    name: "users_by_organization",
    terms: ["organization"],
  });

  const chronark: User = {
    id: "chronark",
    name: "Andreas Thomas",
    organization: "Upstash",
    email: "andreas@upstash.com",
  };
  // Create and store your first user
  await users.set("chronark", chronark);

  // Let's generate some more users
  for (let i = 0; i < 10; i++) {
    const user: User = {
      id: crypto.randomUUID(),
      name: faker.person.fullName(),
      organization: faker.company.name(),
      email: faker.internet.email(),
    };
    await users.set(user.id, user);
  }

  /**
   * Now we can use the previously created index to query by organization
   */
  const upstashEmployees = await usersByOrganization.match({ organization: "Upstash" });
  /**
   * [
   *     {
   *         id: "chronark",
   *         ts: 000, // the timestamp when created or last updated
   *         data: {
   *             id: "chronark",
   *             name: "Andreas Thomas",
   *             organization: "Upstash",
   *             email: "andreas@upstash.com"
   *         }
   *     }
   * ]
   */

  /**
   * In this case we know that there's just 1 match
   */
  expect(upstashEmployees.length).toBe(1);
  expect(upstashEmployees[0].id).toEqual("chronark");
  expect(upstashEmployees[0].data).toEqual(chronark);
});
