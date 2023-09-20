import { expect, test, describe, Test } from "bun:test";
import { Collection } from "./collection";
import { Redis } from "@upstash/redis";

describe("match", () => {
    describe("when the collection is empty", () => {
        test("returns empty", async () => {
            type Data = { x: string }
            const c = new Collection<Data>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
            const i = c.createIndex({ name: crypto.randomUUID(), terms: ["x"] })

            const matches = await i.match({ x: "hello" })
            expect(matches.length).toBe(0)
        })
    })

    test("returns only matched ", async () => {
        type Data = { x: string }
        const c = new Collection<Data>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
        const i = c.createIndex({ name: crypto.randomUUID(), terms: ["x"] })


        for (let i = 0; i < 10; i++) {
            await c.set(crypto.randomUUID(), { x: i.toString() })
        }


        const matches = await i.match({ x: "2" })
        expect(matches.length).toBe(1)
        expect(matches[0].data).toEqual({ x: "2" })

    })



    describe("after the document was deleted", () => {

        test("does not return match ", async () => {
            type Data = { x: string }
            const c = new Collection<Data>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
            const i = c.createIndex({ name: crypto.randomUUID(), terms: ["x"] })


            for (let i = 0; i < 10; i++) {
                await c.set(crypto.randomUUID(), { x: i.toString() })
            }




            const matches = await i.match({ x: "2" })
            expect(matches.length).toBe(1)
            expect(matches[0].data).toEqual({ x: "2" })

            for (const d of await c.list()) {
                await c.delete(d.id)
            }


            const matchesAfterDeletion = await i.match({ x: "2" })
            expect(matchesAfterDeletion.length).toBe(0)

        })
    })

    describe("complex objects", () => {
        type TestData = { s: string, n: number, b: boolean, nested: { s: string, n: number, b: boolean } }



        function generateSeed(n = 10): { id: string, data: TestData }[] {
            return new Array(n).fill(null).map(() => ({
                id: crypto.randomUUID(), data: {
                    s: crypto.randomUUID(),
                    n: Math.random(),
                    b: Math.random() > 0.5,
                    nested: {
                        s: crypto.randomUUID(),
                        n: Math.random(),
                        b: Math.random() > 0.5
                    }
                }
            }))

        }




        describe("string", async () => {
            describe("empty collection", () => {
                test("returns empty", async () => {
                    const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                    const i = c.createIndex({ name: crypto.randomUUID(), terms: ["s"] })

                    const matches = await i.match({ s: "abc" })
                    expect(matches.length).toEqual(0)

                })
            })

            test("returns matches", async () => {
                const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                const i = c.createIndex({ name: crypto.randomUUID(), terms: ["s"] })

                const seed = generateSeed()
                for (const s of seed) {
                    await c.set(s.id, s.data)
                }


                const expectedMatches = seed.filter(v => v.data.s === seed[0].data.s)
                const matches = await i.match({ s: seed[0].data.s })
                expect(matches.length).toEqual(expectedMatches.length)
                for (const e of expectedMatches) {
                    const matched = matches.find(m => m.id === e.id)
                    expect(matched).toBeDefined()
                    expect(matched?.data).toEqual(e.data)
                }

            })


        })
        describe("nested.string", async () => {
            describe("empty collection", () => {
                test("returns empty", async () => {
                    const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                    const i = c.createIndex({ name: crypto.randomUUID(), terms: ["nested.s"] })

                    const matches = await i.match({ "nested.s": true })
                    expect(matches.length).toEqual(0)

                })
            })

            test("returns matches", async () => {
                const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                const i = c.createIndex({ name: crypto.randomUUID(), terms: ["nested.s"] })

                const seed = generateSeed()
                for (const s of seed) {
                    await c.set(s.id, s.data)
                }


                const expectedMatches = seed.filter(v => v.data.nested.s === seed[0].data.nested.s)
                const matches = await i.match({ "nested.s": seed[0].data.nested.s })
                expect(matches.length).toEqual(expectedMatches.length)
                for (const e of expectedMatches) {
                    const matched = matches.find(m => m.id === e.id)
                    expect(matched).toBeDefined()
                    expect(matched?.data).toEqual(e.data)
                }

            })
        })
        describe("number", async () => {
            describe("empty collection", () => {
                test("returns empty", async () => {
                    const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                    const i = c.createIndex({ name: crypto.randomUUID(), terms: ["n"] })

                    const matches = await i.match({ n: 2 })
                    expect(matches.length).toEqual(0)

                })
            })
            test("returns matches", async () => {
                const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                const i = c.createIndex({ name: crypto.randomUUID(), terms: ["n"] })

                const seed = generateSeed()
                for (const s of seed) {
                    await c.set(s.id, s.data)
                }


                const expectedMatches = seed.filter(v => v.data.n === seed[0].data.n)
                const matches = await i.match({ n: seed[0].data.n })
                expect(matches.length).toEqual(expectedMatches.length)
                for (const e of expectedMatches) {
                    const matched = matches.find(m => m.id === e.id)
                    expect(matched).toBeDefined()
                    expect(matched?.data).toEqual(e.data)
                }

            })



        })
        describe("nested.number", async () => {
            describe("empty collection", () => {
                test("returns empty", async () => {
                    const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                    const i = c.createIndex({ name: crypto.randomUUID(), terms: ["nested.n"] })

                    const matches = await i.match({ "nested.n": true })
                    expect(matches.length).toEqual(0)

                })
            })

            test("returns matches", async () => {
                const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                const i = c.createIndex({ name: crypto.randomUUID(), terms: ["nested.n"] })

                const seed = generateSeed()
                for (const s of seed) {
                    await c.set(s.id, s.data)
                }


                const expectedMatches = seed.filter(v => v.data.nested.n === seed[0].data.nested.n)
                const matches = await i.match({ "nested.n": seed[0].data.nested.n })
                expect(matches.length).toEqual(expectedMatches.length)
                for (const e of expectedMatches) {
                    const matched = matches.find(m => m.id === e.id)
                    expect(matched).toBeDefined()
                    expect(matched?.data).toEqual(e.data)
                }

            })
        })
        describe("boolean", async () => {
            describe("empty collection", () => {
                test("returns empty", async () => {
                    const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                    const i = c.createIndex({ name: crypto.randomUUID(), terms: ["b"] })

                    const matches = await i.match({ b: true })
                    expect(matches.length).toEqual(0)

                })
            })

            test("returns matches", async () => {
                const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                const i = c.createIndex({ name: crypto.randomUUID(), terms: ["b"] })

                const seed = generateSeed()
                for (const s of seed) {
                    await c.set(s.id, s.data)
                }


                const expectedMatches = seed.filter(v => v.data.b === seed[0].data.b)
                const matches = await i.match({ b: seed[0].data.b })
                expect(matches.length).toEqual(expectedMatches.length)
                for (const e of expectedMatches) {
                    const matched = matches.find(m => m.id === e.id)
                    expect(matched).toBeDefined()
                    expect(matched?.data).toEqual(e.data)
                }

            })
        })

        describe("nested.boolean", async () => {
            describe("empty collection", () => {
                test("returns empty", async () => {
                    const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                    const i = c.createIndex({ name: crypto.randomUUID(), terms: ["nested.b"] })

                    const matches = await i.match({ "nested.b": true })
                    expect(matches.length).toEqual(0)

                })
            })

            test("returns matches", async () => {
                const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                const i = c.createIndex({ name: crypto.randomUUID(), terms: ["nested.b"] })

                const seed = generateSeed()
                for (const s of seed) {
                    await c.set(s.id, s.data)
                }


                const expectedMatches = seed.filter(v => v.data.nested.b === seed[0].data.nested.b)
                const matches = await i.match({ "nested.b": seed[0].data.nested.b })
                expect(matches.length).toEqual(expectedMatches.length)
                for (const e of expectedMatches) {
                    const matched = matches.find(m => m.id === e.id)
                    expect(matched).toBeDefined()
                    expect(matched?.data).toEqual(e.data)
                }

            })
        })

        describe("compound terms", async () => {
            describe("empty collection", () => {
                test("returns empty", async () => {
                    const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                    const i = c.createIndex({ name: crypto.randomUUID(), terms: ["b", "s", "n"] })

                    const matches = await i.match({ b: true, s: "s", n: 1 })
                    expect(matches.length).toEqual(0)

                })
            })

            test("returns matches", async () => {
                const c = new Collection<TestData>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
                const i = c.createIndex({ name: crypto.randomUUID(), terms: ["b", "s", "n"] })

                const seed = generateSeed()
                for (const s of seed) {
                    await c.set(s.id, s.data)
                }


                const expectedMatches = seed.filter(v => v.data.s === seed[0].data.s)
                const matches = await i.match({ b: seed[0].data.b, s:seed[0].data.s, n:seed[0].data.n })
                expect(matches.length).toEqual(expectedMatches.length)
                for (const e of expectedMatches) {
                    const matched = matches.find(m => m.id === e.id)
                    expect(matched).toBeDefined()
                    expect(matched?.data).toEqual(e.data)
                }

            })
        })


    })



    describe("updating a document", () => {


        test("no longer match after the term changed", async () => {
            const c = new Collection<{ value: string }>({ name: crypto.randomUUID(), redis: Redis.fromEnv({ automaticDeserialization: false }) })
            const i = c.createIndex({ name: crypto.randomUUID(), terms: ["value"] })
        })
    })
})