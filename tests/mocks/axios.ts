import { vi } from 'vitest';

// Mock axios module
export const mockAxiosInstance = {
  request: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
    },
    response: {
      use: vi.fn(),
    },
  },
};

export const mockAxios = {
  create: vi.fn(() => mockAxiosInstance),
  ...mockAxiosInstance,
};

// Mock axios module
vi.mock('axios', () => ({
  default: mockAxios,
  ...mockAxios,
}));

export { mockAxios as axios };