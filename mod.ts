export type FetchStrategy<Key, Value, Context> = (key: Key, ctx: Context) => Promise<Value>;

export type CompareStrategy<Key> = (a: Key, b: Key) => boolean;

export interface Clock {
    now(): number;
}

export type Options<Key, Value, Context> = {
    clock: Clock;

    /**
     * Time to live in milliseconds.
     */
    ttl: number;

    fetch?: FetchStrategy<Key, Value, Context>;

    compare: CompareStrategy<Key>;
};

function defaultOptions<Key, Value, Context>(): Options<Key, Value, Context> {
    return {
        clock: Date,
        ttl: Infinity,
        compare: Object.is,
    };
}

export type Entry<Key, Value> = {
    key: Key;
    value: Value;

    /**
     * Yes, this is a real word.
     */
    expiry: number;
};

/**
 * A small Time-to-Live (TTL) Cache implementation.
 */
export class Cache<Key, Value, Context = void> {
    private readonly options: Options<Key, Value, Context>;
    private readonly entries: Array<Entry<Key, Value>> = [];
    private static readonly npos = -1; 

    constructor(options?: Partial<Options<Key, Value, Context>>) {
        this.options = { ...defaultOptions(), ...options };
    }

    private findIndex(key: Key): number {
        const index = this.entries.findIndex(entry => this.options.compare(entry.key, key));
        // Works without the following check as long as `Cache.npos` equals -1
        return (index !== -1) ? index : Cache.npos;
    }

    private expired(key: Key): boolean {
        const index = this.findIndex(key);
        if (index != Cache.npos) {
            return this.entries[index].expiry <= this.options.clock.now();
        }
        return false;
    };
    
    private expire(key: Key, expiry: number = this.options.clock.now()): boolean {
        const index = this.findIndex(key);
        if (index != Cache.npos) {
            this.entries[index].expiry = expiry;
            return true;
        }
        return false;
    };

    private tidy(): void {
        for (let index = 0; index < this.entries.length; ++index) {
            if (this.entries[index].expiry <= this.options.clock.now()) {
                this.entries.splice(index, 1);
            }
        }
    }

    private add(key: Key, value: Value) {
        this.entries.push({
            key: key,
            value: value,
            expiry: this.options.clock.now() + this.options.ttl,
        });
    }

    get(key: Key): Value | undefined {
        this.tidy();
        const index = this.findIndex(key);
        if (index !== Cache.npos) {
            return this.entries[index].value;
        }
        return undefined;
    }

    contains(key: Key): boolean {
        this.tidy();
        return this.get(key) !== undefined;
    }

    async fetch(key: Key, ctx: Context): Promise<Value> {
        this.tidy();
        let value = this.get(key);
        if (value === undefined) {
            if (this.options.fetch === undefined) {
                throw new Error("attempt to call `Cache.fetch` without providing a `Options.fetch` function");
            }
            value = await this.options.fetch(key, ctx);
            this.add(key, value);
        }
        return value
    }

    set(key: Key, value: Value): boolean {
        const index = this.findIndex(key)
        if (index !== Cache.npos) {
            const entry = this.entries[index];
            entry.value = value;
            entry.expiry = this.options.clock.now() + this.options.ttl;
            return false;
        }
        this.add(key, value);
        return true;
    }

    remove(key: Key): boolean {
        const index = this.findIndex(key);
        if (index !== Cache.npos) {
            this.entries.splice(index, 1);
            return true;
        }
        return false;
    }
}

