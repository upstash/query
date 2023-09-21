<div align="center">
    <h1 align="center">@upstash/query</h1>
    <h5>Search for Upstash Redis</h5>
</div>

<div align="center">
  <a href="https://upstash.com?ref=@upstash/query">upstash.com</a>
</div>
<br/>


`@upstash/query` offers secondary indexing and search capabilities for Upstash Redis. It is fully managed by Upstash and scales automatically.

## Features
- [x] **E2E Typesafe**: Fully typed API with TypeScript generics to offer the best developer experience.
- [x] **Secondary Indexing**: Create indexes on your data and query them with a simple API.
- [ ] **Range Queries**: Query your data with range queries. Either numeric or lexicographic.


## Quickstart

```ts
import { Redis } from "@upstash/redis";
// import { Redis } from "@upstash/redis/cloudflare"; // for Cloudflare Workers
// import { Redis } from "@upstash/redis/fastly"; // for Fastly Compute@Edge
import { Query } from "./query";

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



## API Reference

### Query

#### `constructor(options: QueryOptions)`

#### `.createCollection(name: string)`

Create a new collection by giving it a name and document type.

```ts
const users = q.createCollection<User>("users");
```


### Collection


#### `.set(id: string, data: T): Promise<void>`

Insert a new document to the collection.
This will throw an error if the document already exists.


```ts
await users.set(userId, user)
```

#### `.get(id: string): Promise<Document<T> | null>`
Get a document by id.

```ts
const document = await users.get(userId)
// {
//     id: userId,
//     ts: 000, // the timestamp when created or last updated
//     data: {} // the data you have stored
// }
```

#### `.delete(id: string): Promise<void>`

Delete a document by id.

```ts
await users.delete(userId)
```

#### `.update(id: string, data: T): Promise<void>`

Update a document by id.
This will throw an error if the document does not exist.

```ts
user.name = "New Name"
await users.update(userId, user)
```

#### `.createIndex(options: CreateIndexOptions<T>): Index<T>`
Create a new index on the collection.
The terms field will be strongly typed depending on the type you have passed in when creating the collection.

```ts
const usersByOrganization = users.createIndex({
    name: "users_by_organization",
    terms: ["organization"],
});
```

### Index

#### `.match(query): Promise<Document<T>[]>`

Search for matches in the index.
The `query` argument is strongly typed depending on the terms you have passed in when creating the index.

```ts
const upstashEmployees = await usersByOrganization.match({ 
    organization: "Upstash" 
  });
```
