<div align="center">
    <h1 align="center">@upstash/query</h1>
    <h5>Search for Upstash Redis</h5>
</div>

<div align="center">
  <a href="https://upstash.com?ref=@upstash/query">upstash.com</a>
</div>
<br/>

> [!NOTE]  
> **This project is in the Experimental Stage.**
> 
> We declare this project experimental to set clear expectations for your usage. There could be known or unknown bugs, the API could evolve, or the project could be discontinued if it does not find community adoption. While we cannot provide professional support for experimental projects, we’d be happy to hear from you if you see value in this project!


`@upstash/query` offers secondary indexing and search capabilities for Upstash Redis. It is fully managed by Upstash and scales automatically.

This library is tested well but not yet production ready. We are looking for feedback: Please open an issue if you have any questions or suggestions.

## Features
- [x] **E2E Typesafe**: Fully typed API with TypeScript generics to offer the best developer experience.
- [x] **Secondary Indexing**: Create indexes on your data and query them with a simple API.
- [ ] **Range Queries**: Query your data with range queries. Either numeric or lexicographic.


## Quickstart

```ts
import { Redis } from "@upstash/redis";
// import { Redis } from "@upstash/redis/cloudflare"; // for Cloudflare Workers
// import { Redis } from "@upstash/redis/fastly"; // for Fastly Compute@Edge
import { Query } from "@upstash/query";

/**
 * Define a custom type for your documents
 */
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
    redis: Redis.fromEnv({ automaticDeserialization: false }), // <- important to turn it off as @upstash/query handles deserialization itself
  });

  /**
   * Create your first collection.
   *
   * Please make sure you're passing in a type to take full advantage of @upstash/query
   */
  const users = q.createCollection<User>("users");

  /**
   * Create a searchable index on the collection and specify which terms we are filtering by
   * terms are fully typed as long as you have defined a custom type when creating the collection
   */
  const usersByOrganization = users.createIndex({
    name: "users_by_organization",
    terms: ["organization"],
  });

  const user: User = {
    id: "chronark",
    name: "Andreas Thomas",
    organization: "Upstash",
    email: "andreas@upstash.com",
  };
  // Create and store your first user
  await users.set("documentId", user);



  /**
   * Now we can use the previously created index to query by organization
   */
  const upstashEmployees = await usersByOrganization.match({ organization: "Upstash" });
  /**
   * [
   *     {
   *         id: "documentId",
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
  ```


