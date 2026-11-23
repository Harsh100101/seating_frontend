import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setAuthToken } from '../api/client';
import {
  FloorPlanImageLayer,
  loadAuthenticatedFloorPlanBlob,
} from './FloorPlanImageLayer';

// Mock react-konva for server-rendered markup inspection in Node
vi.mock('react-konva', () => ({
  Layer: ({ children, listening }: any) => (
    <div data-testid="konva-layer" data-listening={listening}>
      {children}
    </div>
  ),
  Rect: ({ x, y, width, height, fill }: any) => (
    <div
      data-testid="konva-rect"
      data-x={x}
      data-y={y}
      data-width={width}
      data-height={height}
      data-fill={fill}
    />
  ),
  Image: ({ x, y, width, height }: any) => (
    <div
      data-testid="konva-image"
      data-x={x}
      data-y={y}
      data-width={width}
      data-height={height}
    />
  ),
}));

vi.mock('konva', () => ({
  default: {
    Filters: {
      Invert: 'Invert',
    },
  },
}));

describe('FloorPlanImageLayer Authenticated Loading & Lifecycle', () => {
  beforeEach(() => {
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setAuthToken(null);
    vi.restoreAllMocks();
  });

  describe('Static Rendering & CAD Modes', () => {
    it('renders blueprint mode with dark CAD background #0b1220 and exact canvas dimensions', () => {
      const html = renderToStaticMarkup(
        <FloorPlanImageLayer
          src="/api/floors/floor-ground/image"
          canvasWidth={1600}
          canvasHeight={1000}
          mode="blueprint"
        />
      );

      expect(html).toContain('data-testid="konva-layer"');
      expect(html).toContain('data-testid="konva-rect"');
      expect(html).toContain('data-fill="#0b1220"');
      expect(html).toContain('data-width="1600"');
      expect(html).toContain('data-height="1000"');
    });

    it('renders clean mode with white background #ffffff and custom canvas dimensions', () => {
      const html = renderToStaticMarkup(
        <FloorPlanImageLayer
          src="/api/floors/floor-2/image"
          canvasWidth={2400}
          canvasHeight={1500}
          mode="clean"
        />
      );

      expect(html).toContain('data-fill="#ffffff"');
      expect(html).toContain('data-width="2400"');
      expect(html).toContain('data-height="1500"');
    });
  });

  describe('loadAuthenticatedFloorPlanBlob', () => {
    it('fetches /api floor image with Bearer token and credentials: include', async () => {
      setAuthToken('secret-admin-jwt-token');

      const mockBlob = new Blob(['dwg-image-binary'], { type: 'image/png' });
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/png' }),
        blob: async () => mockBlob,
      });
      global.fetch = mockFetch;

      const blob = await loadAuthenticatedFloorPlanBlob('/api/floors/flr-1/image');

      expect(blob).toBe(mockBlob);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [calledUrl, calledInit] = mockFetch.mock.calls[0];
      // URL must NOT contain the token
      expect(calledUrl).toBe('/api/floors/flr-1/image');
      expect(calledUrl).not.toContain('secret-admin-jwt-token');

      // Authorization header must contain the Bearer token
      const headers = calledInit.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer secret-admin-jwt-token');

      // Must include credentials for session cookies
      expect(calledInit.credentials).toBe('include');
    });

    it('fetches non-api public/static floor image with Bearer token if present without prepending /api', async () => {
      setAuthToken('user-token-456');

      const mockBlob = new Blob(['svg-data'], { type: 'image/svg+xml' });
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/svg+xml' }),
        blob: async () => mockBlob,
      });
      global.fetch = mockFetch;

      const blob = await loadAuthenticatedFloorPlanBlob('/floor-plans/demo-ground.svg');

      expect(blob).toBe(mockBlob);
      const [calledUrl, calledInit] = mockFetch.mock.calls[0];
      expect(calledUrl).toBe('/floor-plans/demo-ground.svg');
      expect(calledUrl).not.toContain('user-token-456');

      const headers = calledInit.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer user-token-456');
      expect(calledInit.credentials).toBe('include');
    });

    it('passes AbortSignal to allow cancelling in-flight request on floor change', async () => {
      const controller = new AbortController();
      const mockBlob = new Blob(['data'], { type: 'image/png' });

      const mockFetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        expect(init.signal).toBe(controller.signal);
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'image/png' }),
          blob: async () => mockBlob,
        });
      });
      global.fetch = mockFetch;

      await loadAuthenticatedFloorPlanBlob('/api/floors/flr-3/image', controller.signal);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws when the server returns 401 or 404', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Unauthorized floor plan access' }),
      });

      await expect(
        loadAuthenticatedFloorPlanBlob('/api/floors/flr-locked/image')
      ).rejects.toThrow();
    });
  });

  describe('Blob, ObjectURL and AbortController Lifecycle', () => {
    it('executes Flow: authenticated fetch -> Blob -> URL.createObjectURL(blob) -> HTML Image', async () => {
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;

      const createdUrls: string[] = [];
      const revokedUrls: string[] = [];

      URL.createObjectURL = vi.fn((_blob: Blob) => {
        const url = `blob:http://localhost/${Math.random().toString(36).slice(2)}`;
        createdUrls.push(url);
        return url;
      });

      URL.revokeObjectURL = vi.fn((url: string) => {
        revokedUrls.push(url);
      });

      try {
        setAuthToken('bearer-xyz');
        const mockBlob = new Blob(['dwg-bytes'], { type: 'image/png' });
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'image/png' }),
          blob: async () => mockBlob,
        });

        // Simulate floor 1 image load
        const blob1 = await loadAuthenticatedFloorPlanBlob('/api/floors/f1/image');
        expect(blob1).toBe(mockBlob);

        const objectUrl1 = URL.createObjectURL(blob1);
        expect(createdUrls).toContain(objectUrl1);

        // When switching to floor 2, objectUrl1 is revoked
        URL.revokeObjectURL(objectUrl1);
        expect(revokedUrls).toContain(objectUrl1);
      } finally {
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
      }
    });

    it('aborts stale controller on rapid floor switching without throwing to caller', async () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      let fetch1Aborted = false;
      const mockFetch = vi.fn().mockImplementation((url: string, init: RequestInit) => {
        if (url.includes('floor-1')) {
          init.signal?.addEventListener('abort', () => {
            fetch1Aborted = true;
          });
          return new Promise((_, reject) => {
            init.signal?.addEventListener('abort', () => {
              const abortErr = new Error('The operation was aborted');
              abortErr.name = 'AbortError';
              reject(abortErr);
            });
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'image/png' }),
          blob: async () => new Blob(['f2'], { type: 'image/png' }),
        });
      });
      global.fetch = mockFetch;

      // Start floor 1 request
      const f1Promise = loadAuthenticatedFloorPlanBlob('/api/floors/floor-1/image', controller1.signal)
        .catch((err) => err);

      // Floor switched to floor 2 rapidly: abort floor 1
      controller1.abort();
      expect(fetch1Aborted).toBe(true);

      const f1Err = await f1Promise;
      expect(f1Err.name).toBe('AbortError');

      // Floor 2 request proceeds normally
      const f2Blob = await loadAuthenticatedFloorPlanBlob('/api/floors/floor-2/image', controller2.signal);
      expect(f2Blob).toBeInstanceOf(Blob);
    });
  });
});
