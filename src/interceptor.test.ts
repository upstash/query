import { Redis } from "@upstash/redis";
import { Callback, Event, Interceptor } from "./interceptor";
import { expect, spyOn, test } from "bun:test";

type TestData = { notEmpty: boolean };

test("runs all callbacks", async () => {
  const redis = Redis.fromEnv({ automaticDeserialization: false });

  const callbacks = {
    onCreate: async (_tx, _docs) => {
      // we're not doing anythng with it
    },
    onDelete: async (_tx, _docs) => {
      // we're not doing anythng with it
    },
  } satisfies Record<string, Callback<TestData>>;

  const spyCreateCallback = spyOn(callbacks, "onCreate");
  const spyDeleteCallback = spyOn(callbacks, "onDelete");

  const int = new Interceptor<TestData>();
  for (let i = 0; i < 10; i++) {
    int.listen(Event.CREATE, callbacks.onCreate);
    int.listen(Event.DELETE, callbacks.onDelete);
  }

  for (let i = 0; i < 10; i++) {
    int.emit(Event.CREATE, redis.multi());
    int.emit(Event.UPDATE, redis.multi());
    int.emit(Event.DELETE, redis.multi());
  }

  expect(spyCreateCallback).toHaveBeenCalledTimes(100);
  expect(spyDeleteCallback).toHaveBeenCalledTimes(100);
});

test("removes listener", async () => {
  const redis = Redis.fromEnv({ automaticDeserialization: false });

  const callbacks = {
    onCreate: async (_tx, _docs) => {
      // we're not doing anythng with it
    },
    onDelete: async (_tx, _docs) => {
      // we're not doing anythng with it
    },
  } satisfies Record<string, Callback<TestData>>;

  const spyCreateCallback = spyOn(callbacks, "onCreate");
  const spyDeleteCallback = spyOn(callbacks, "onDelete");

  const int = new Interceptor<TestData>();
  const stop = int.listen(Event.CREATE, callbacks.onCreate);
  int.listen(Event.DELETE, callbacks.onDelete);

  for (let i = 0; i < 10; i++) {
    if (i === 5) {
      stop();
    }
    int.emit(Event.CREATE, redis.multi());
    int.emit(Event.DELETE, redis.multi());
  }

  expect(spyCreateCallback).toHaveBeenCalledTimes(5);
  expect(spyDeleteCallback).toHaveBeenCalledTimes(10);
});
