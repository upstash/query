import { Redis } from "@upstash/redis";
import { Collection } from "./collection";
import { Json } from "./encoding";
import { Document } from "./types";
import { describe, expect, test } from "bun:test";

describe("prefix", () => {
  test("should return the correct key prefix", () => {
    const name = crypto.randomUUID();
    const collection = new Collection({
      name,
      redis: Redis.fromEnv(),
    });

    // Expected prefix based on the test configuration
    const expectedPrefix = `@upstash/query:collection:${name}`;

    // Call the prefix method and expect it to match the expected prefix
    expect(collection.prefix()).toBe(expectedPrefix);
  });
});

describe("documentKey", () => {
  const name = crypto.randomUUID();
  const collection = new Collection({
    name,
    redis: Redis.fromEnv(),
  });
  // Define a table of test cases with inputs and expected outputs
  const testCases: { documentId: string; want: string }[] = [
    { documentId: "123", want: `@upstash/query:collection:${name}:123` },
    {
      documentId: "document:id/with.special_chars",
      want: `@upstash/query:collection:${name}:document:id/with.special_chars`,
    },
    { documentId: "", want: `@upstash/query:collection:${name}:` },
    // Add more test cases as needed
  ];

  // Iterate over the test cases and run the tests
  testCases.forEach((tc) => {
    test(`should return the correct document key for input '${tc.documentId}'`, () => {
      // Call the documentKey method with the input
      const result = collection.documentKey(tc.documentId);

      // Expect the result to match the expected output
      expect(result).toBe(tc.want);
    });
  });
});

describe("set", () => {
  test("does not overwrite existing document", async () => {
    const collection = new Collection({
      name: crypto.randomUUID(),
      redis: Redis.fromEnv({ automaticDeserialization: false }),
    });
    const documentId = crypto.randomUUID();
    const testData = { value: "test" };

    await collection.set(documentId, testData);

    // I hate this as much as you, but I couldn't get it to work with `.throws`
    let thrown = false;
    await collection.set(documentId, { value: "updated" }).catch(() => {
      thrown = true;
    });
    expect(thrown).toBeTrue();
  });

  test("does not update a non-existent document", async () => {
    const collection = new Collection({
      name: crypto.randomUUID(),
      redis: Redis.fromEnv({ automaticDeserialization: false }),
    });

    // I hate this as much as you, but I couldn't get it to work with `.throws`
    let thrown = false;
    await collection.update(crypto.randomUUID(), { value: "test" }).catch(() => {
      thrown = true;
    });
    expect(thrown).toBeTrue();
  });

  test("should set and retrieve a document", async () => {
    const collection = new Collection({
      name: crypto.randomUUID(),
      redis: Redis.fromEnv({ automaticDeserialization: false }),
      encoderDecoder: new Json(),
    });
    const documentId = crypto.randomUUID();
    const testData = { value: "test" };

    // Call the set method
    await collection.set(documentId, testData);

    const retrieved = await collection.get(documentId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toEqual(documentId);
    expect(retrieved!.data).toEqual(testData);
    expect(retrieved!.ts).toBeLessThan(Date.now());
  });
});

describe("get", () => {
  test("should return null for a non-existent document", async () => {
    const collection = new Collection({
      name: crypto.randomUUID(),
      redis: Redis.fromEnv({ automaticDeserialization: false }),
      encoderDecoder: new Json({ debug: true }),
    });
    const documentId = "123";

    const retrieved = await collection.get(documentId);
    expect(retrieved).toBeNull();
  });
});

describe("list", () => {
  describe("when the collection is empty", async () => {
    test("should return an empty list", async () => {
      const name = crypto.randomUUID();
      const collection = new Collection({
        name,
        redis: Redis.fromEnv({ automaticDeserialization: false }),
        encoderDecoder: new Json(),
      });

      const list = await collection.list();
      expect(list.length).toBe(0);
    });
  });

  test("should return all documents in the collection", async () => {
    const name = crypto.randomUUID();
    const collection = new Collection({
      name,
      redis: Redis.fromEnv({ automaticDeserialization: false }),
      encoderDecoder: new Json(),
    });

    const createdDocuments: Omit<Document<{ x: number }>, "ts">[] = [];
    for (let i = 0; i < 10; i++) {
      const id = crypto.randomUUID();
      const data = { x: i };

      await collection.set(id, data);
      createdDocuments.push({ id, data });

      const list = await collection.list();
      expect(list.length).toBe(createdDocuments.length);

      for (const doc of createdDocuments) {
        const foundDocument = list.find((d) => doc.id === d.id);
        expect(foundDocument).toBeDefined();
        expect(foundDocument!.id).toEqual(doc.id);
        expect(foundDocument!.data).toEqual(doc.data);
      }
    }
  });

  test("should not return null elements", async () => {
    const collection = new Collection<{ value: string }>({
      name: crypto.randomUUID(),
      redis: Redis.fromEnv({ automaticDeserialization: false }),
      encoderDecoder: new Json(),
    });

    const documentIds = new Array(10).fill(null).map(() => crypto.randomUUID());
    for (const id of documentIds) {
      await collection.set(id, { value: crypto.randomUUID() });
    }

    for (const foundDocument of await collection.list()) {
      expect(foundDocument).not.toBeNull();
    }

    for (const id of documentIds) {
      await collection.delete(id);
    }

    const list = await collection.list();
    expect(list.length).toBe(0);
  });
});

describe("delete", () => {
  describe("when the document does not exist", async () => {
    test("should not fail", async () => {
      const name = crypto.randomUUID();
      const collection = new Collection({
        name,
        redis: Redis.fromEnv({ automaticDeserialization: false }),
        encoderDecoder: new Json(),
      });

      await collection.delete("does-not-exist");
    });
  });
  test("should delete the document", async () => {
    const name = crypto.randomUUID();
    const collection = new Collection({
      name,
      redis: Redis.fromEnv({ automaticDeserialization: false }),
      encoderDecoder: new Json(),
    });
    const documentId = "123";
    const testData = { value: "test" };

    // Call the set method
    await collection.set(documentId, testData);

    const retrieved = await collection.get(documentId);
    expect(retrieved).not.toBeNull();

    await collection.delete(documentId);
    const retrievedAfterDeletion = await collection.get(documentId);
    expect(retrievedAfterDeletion).toBeNull();
  });
});
