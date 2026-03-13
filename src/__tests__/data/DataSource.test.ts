import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpDataSource } from "../../lib/data/DataSource";

const fetchMock = vi.fn();
global.fetch = fetchMock as typeof fetch;

const eventSourceCtor = vi.fn();
const createdEventSources: MockEventSource[] = [];

class MockEventSource {
    onerror: ((event: unknown) => void) | null = null;
    addEventListener = vi.fn();
    close = vi.fn();

    constructor(url: string) {
        eventSourceCtor(url);
        createdEventSources.push(this);
    }
}

// Node test environment doesn't provide EventSource.
(globalThis as unknown as { EventSource: unknown }).EventSource = MockEventSource;

describe("HttpDataSource Stream Subscription", () => {
    let ds: HttpDataSource;

    beforeEach(() => {
        vi.useFakeTimers();
        ds = new HttpDataSource();
        fetchMock.mockReset();
        eventSourceCtor.mockClear();
        createdEventSources.length = 0;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should create EventSource and close it on unsubscribe", () => {
        const callback = vi.fn();
        const unsubscribe = ds.subscribe(callback);

        expect(eventSourceCtor).toHaveBeenCalledWith("/api/audit/stream");
        expect(createdEventSources).toHaveLength(1);

        unsubscribe();
        expect(createdEventSources[0].close).toHaveBeenCalledTimes(1);
    });
});
