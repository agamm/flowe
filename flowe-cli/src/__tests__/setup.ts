import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock EventSource since it's not available in JSDOM
class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  url: string;
  readyState: number = 0;
  
  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Immediate connection
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    }, 0);
  }
  
  close() {
    this.readyState = 2;
    const index = MockEventSource.instances.indexOf(this);
    if (index !== -1) {
      MockEventSource.instances.splice(index, 1);
    }
  }

  // Helper to simulate receiving data
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }

  // Helper to simulate an error
  simulateError() {
    if (this.onerror) {
      this.onerror();
    }
  }
}

// Replace global EventSource with our mock
vi.stubGlobal('EventSource', MockEventSource);

// Mock ResizeObserver which is used by @xyflow/react but not available in JSDOM
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

vi.stubGlobal('ResizeObserver', MockResizeObserver);

// Mock requestAnimationFrame for ReactFlow if needed
if (!global.requestAnimationFrame) {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 0);
  });
}

// Mock matchMedia which might be used by some ReactFlow components
if (!global.matchMedia) {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
} 