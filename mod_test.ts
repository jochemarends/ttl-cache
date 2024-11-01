import { assertEquals, assertRejects } from "@std/assert";
import { Cache } from "./mod.ts";

Deno.test(function testSet() {
    const cache = new Cache<string, number>();

    assertEquals(cache.set("a", 0), true);
    assertEquals(cache.get("a"), 0);

    assertEquals(cache.get("b"), undefined);
    assertEquals(cache.set("b", 0), true);
    assertEquals(cache.get("b"), 0);

    assertEquals(cache.set("b", 1), false);
    assertEquals(cache.get("b"), 1);
    assertEquals(cache.get("a"), 0);

    assertEquals(cache.get("c"), undefined);
});

Deno.test(async function testFetch() {
    const cache = new Cache<number, string>({
        ttl: 1_000, // one second
    });

    cache.set(0, "foo");
    assertEquals(cache.get(0), "foo");
    await new Promise(resolve => setTimeout(resolve, 1_000))
    assertEquals(cache.contains(0), false);
    assertEquals(cache.get(0), undefined);
});

Deno.test(function testCompare() {
    const cache = new Cache<string, string>({
        compare: (a: string, b: string): boolean => {
            return a.toLowerCase() === b.toLowerCase();
        },
    });

    cache.set("Hello", "World")
    assertEquals(cache.contains("hello"), true);
});

Deno.test(async function testFetch() {
    const square = (n: number) => n * n;

    let cache = new Cache<number, number>({
        fetch: (n: number): Promise<number> => {
            return Promise.resolve(square(n));
        },
    });

    assertEquals(await cache.fetch(1), 1);

    cache = new Cache<number, number>();
    assertRejects(async () => await cache.fetch(1));
});

