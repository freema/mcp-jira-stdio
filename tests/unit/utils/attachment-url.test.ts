import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { addAttachmentFromUrl } from '../../../src/utils/api-helpers.js';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock multipart request
vi.mock('../../../src/utils/jira-auth.js', () => ({
  makeMultipartRequest: vi.fn(),
}));

// Dynamic imports for mocked modules
let axios: any;
let makeMultipartRequest: any;

describe('addAttachmentFromUrl', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    axios = (await import('axios')).default;
    makeMultipartRequest = (await import('../../../src/utils/jira-auth.js')).makeMultipartRequest;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SSRF Protection', () => {
    it('should reject localhost URLs', async () => {
      await expect(
        addAttachmentFromUrl('TEST-123', 'http://localhost/file.png', 'file.png')
      ).rejects.toThrow(/not a public address \(SSRF protection\)/);
    });

    it('should reject 127.0.0.1 URLs', async () => {
      await expect(
        addAttachmentFromUrl('TEST-123', 'http://127.0.0.1/file.png', 'file.png')
      ).rejects.toThrow(/not a public address \(SSRF protection\)/);
    });

    it('should reject 127.x.x.x URLs', async () => {
      await expect(
        addAttachmentFromUrl('TEST-123', 'http://127.1.1.1/file.png', 'file.png')
      ).rejects.toThrow(/not a public address \(SSRF protection\)/);
    });

    it('should reject 192.168.x.x private network URLs', async () => {
      await expect(
        addAttachmentFromUrl('TEST-123', 'http://192.168.1.1/file.png', 'file.png')
      ).rejects.toThrow(/not a public address \(SSRF protection\)/);
    });

    it('should reject 10.x.x.x private network URLs', async () => {
      await expect(
        addAttachmentFromUrl('TEST-123', 'http://10.0.0.1/file.png', 'file.png')
      ).rejects.toThrow(/not a public address \(SSRF protection\)/);
    });

    it('should reject 172.16.x.x to 172.31.x.x private network URLs', async () => {
      await expect(
        addAttachmentFromUrl('TEST-123', 'http://172.16.0.1/file.png', 'file.png')
      ).rejects.toThrow(/not a public address \(SSRF protection\)/);

      await expect(
        addAttachmentFromUrl('TEST-123', 'http://172.20.0.1/file.png', 'file.png')
      ).rejects.toThrow(/not a public address \(SSRF protection\)/);

      await expect(
        addAttachmentFromUrl('TEST-123', 'http://172.31.0.1/file.png', 'file.png')
      ).rejects.toThrow(/not a public address \(SSRF protection\)/);
    });

    it.each([
      'http://169.254.169.254/latest/meta-data/',
      'http://0.0.0.0/',
      'http://[::1]/',
      'http://[::ffff:127.0.0.1]/',
      'http://[fd00::1]/',
      'http://2130706433/',
      'http://0x7f000001/',
      'http://api.localhost/',
    ])('should reject %s (bypasses of the 1.12.2 check)', async (url) => {
      await expect(addAttachmentFromUrl('TEST-123', url, 'file.png')).rejects.toThrow(
        /SSRF protection/
      );
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should reject non-http schemes', async () => {
      await expect(
        addAttachmentFromUrl('TEST-123', 'file:///etc/passwd', 'passwd')
      ).rejects.toThrow(/Unsupported URL scheme/);
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should allow 172.15.x.x (not in private range)', async () => {
      const mockBuffer = Buffer.from('fake file content');
      const mockAttachment = {
        id: 'test-id',
        filename: 'file.png',
        size: 100,
        mimeType: 'image/png',
      };

      axios.get.mockResolvedValue({
        status: 200,
        data: mockBuffer,
        headers: { 'content-type': 'image/png' },
      });
      makeMultipartRequest.mockResolvedValue([mockAttachment]);

      await expect(
        addAttachmentFromUrl('TEST-123', 'http://172.15.0.1/file.png', 'file.png')
      ).resolves.toBeTruthy();
    });

    it('should allow 172.32.x.x (not in private range)', async () => {
      const mockBuffer = Buffer.from('fake file content');
      const mockAttachment = {
        id: 'test-id',
        filename: 'file.png',
        size: 100,
        mimeType: 'image/png',
      };

      axios.get.mockResolvedValue({
        status: 200,
        data: mockBuffer,
        headers: { 'content-type': 'image/png' },
      });
      makeMultipartRequest.mockResolvedValue([mockAttachment]);

      await expect(
        addAttachmentFromUrl('TEST-123', 'http://172.32.0.1/file.png', 'file.png')
      ).resolves.toBeTruthy();
    });

    it('should allow public URLs', async () => {
      const mockBuffer = Buffer.from('fake file content');
      const mockAttachment = {
        id: 'test-id',
        filename: 'file.png',
        size: 100,
        mimeType: 'image/png',
      };

      axios.get.mockResolvedValue({
        status: 200,
        data: mockBuffer,
        headers: { 'content-type': 'image/png' },
      });
      makeMultipartRequest.mockResolvedValue([mockAttachment]);

      const result = await addAttachmentFromUrl(
        'TEST-123',
        'https://example.com/file.png',
        'file.png'
      );

      expect(result).toEqual([mockAttachment]);
      expect(axios.get).toHaveBeenCalledWith(
        'https://example.com/file.png',
        expect.objectContaining({
          responseType: 'arraybuffer',
          maxContentLength: 50 * 1024 * 1024,
          timeout: 30000,
          maxRedirects: 0,
          proxy: false,
        })
      );
    });
  });

  describe('Successful Download', () => {
    it('should download and upload file from URL', async () => {
      const mockBuffer = Buffer.from('test file content');
      const mockAttachment = {
        id: 'att-123',
        filename: 'diagram.png',
        size: mockBuffer.length,
        mimeType: 'image/png',
        content: 'https://jira.example.com/download/att-123',
      };

      axios.get.mockResolvedValue({
        status: 200,
        data: mockBuffer,
        headers: { 'content-type': 'image/png' },
      });
      makeMultipartRequest.mockResolvedValue([mockAttachment]);

      const result = await addAttachmentFromUrl(
        'TEST-123',
        'https://cdn.example.com/diagram.png',
        'diagram.png'
      );

      expect(axios.get).toHaveBeenCalledWith(
        'https://cdn.example.com/diagram.png',
        expect.objectContaining({
          responseType: 'arraybuffer',
          maxContentLength: 50 * 1024 * 1024,
          timeout: 30000,
          maxRedirects: 0,
          proxy: false,
        })
      );

      expect(makeMultipartRequest).toHaveBeenCalledWith(
        '/issue/TEST-123/attachments',
        expect.any(Object)
      );

      expect(result).toEqual([mockAttachment]);
    });

    it('should use content-type from response headers', async () => {
      const mockBuffer = Buffer.from('pdf content');
      const mockAttachment = { id: 'att-456' };

      axios.get.mockResolvedValue({
        status: 200,
        data: mockBuffer,
        headers: { 'content-type': 'application/pdf' },
      });
      makeMultipartRequest.mockResolvedValue([mockAttachment]);

      await addAttachmentFromUrl('TEST-123', 'https://example.com/document.pdf', 'document.pdf');

      expect(makeMultipartRequest).toHaveBeenCalled();
      // FormData with correct content-type should be passed
    });

    it('should fallback to application/octet-stream when no content-type', async () => {
      const mockBuffer = Buffer.from('file content');
      const mockAttachment = { id: 'att-789' };

      axios.get.mockResolvedValue({
        status: 200,
        data: mockBuffer,
        headers: {},
      });
      makeMultipartRequest.mockResolvedValue([mockAttachment]);

      await addAttachmentFromUrl('TEST-123', 'https://example.com/file', 'file');

      expect(makeMultipartRequest).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle download timeout', async () => {
      const timeoutError = new Error('timeout of 30000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';

      axios.get.mockRejectedValue(timeoutError);

      await expect(
        addAttachmentFromUrl('TEST-123', 'https://example.com/file.png', 'file.png')
      ).rejects.toThrow('timeout');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ENOTFOUND';

      axios.get.mockRejectedValue(networkError);

      await expect(
        addAttachmentFromUrl('TEST-123', 'https://nonexistent.example.com/file.png', 'file.png')
      ).rejects.toThrow('Network Error');
    });

    it('should handle large file rejection', async () => {
      const largeFileError = new Error('maxContentLength size exceeded');

      axios.get.mockRejectedValue(largeFileError);

      await expect(
        addAttachmentFromUrl('TEST-123', 'https://example.com/huge.zip', 'huge.zip')
      ).rejects.toThrow('maxContentLength');
    });

    it('should handle invalid URL format', async () => {
      await expect(
        addAttachmentFromUrl('TEST-123', 'not-a-valid-url', 'file.png')
      ).rejects.toThrow();
    });
  });

  describe('Redirects', () => {
    const okResponse = {
      status: 200,
      data: Buffer.from('content'),
      headers: { 'content-type': 'image/png' },
    };
    const redirectTo = (location: string, status = 302) => ({
      status,
      data: Buffer.alloc(0),
      headers: { location },
    });

    it('follows a redirect to a public URL and checks the new URL', async () => {
      axios.get
        .mockResolvedValueOnce(redirectTo('https://cdn.example.com/real.png'))
        .mockResolvedValueOnce(okResponse);
      makeMultipartRequest.mockResolvedValue([{ id: 'att-redirect' }]);

      await addAttachmentFromUrl('TEST-123', 'https://example.com/file.png', 'file.png');

      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(axios.get).toHaveBeenNthCalledWith(
        2,
        'https://cdn.example.com/real.png',
        expect.objectContaining({ maxRedirects: 0 })
      );
    });

    it('resolves a relative Location against the current URL', async () => {
      axios.get
        .mockResolvedValueOnce(redirectTo('/other.png', 301))
        .mockResolvedValueOnce(okResponse);
      makeMultipartRequest.mockResolvedValue([{ id: 'att-relative' }]);

      await addAttachmentFromUrl('TEST-123', 'https://example.com/dir/file.png', 'file.png');

      expect(axios.get).toHaveBeenNthCalledWith(
        2,
        'https://example.com/other.png',
        expect.any(Object)
      );
    });

    it.each([
      'http://169.254.169.254/latest/meta-data/',
      'http://127.0.0.1:8080/admin',
      'http://[::1]/',
      'http://localhost/',
      'file:///etc/passwd',
    ])('refuses a redirect to %s', async (location) => {
      axios.get.mockResolvedValueOnce(redirectTo(location));

      await expect(
        addAttachmentFromUrl('TEST-123', 'https://example.com/file.png', 'file.png')
      ).rejects.toThrow(/SSRF protection/);
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(makeMultipartRequest).not.toHaveBeenCalled();
    });

    it('stops after too many redirects', async () => {
      axios.get.mockResolvedValue(redirectTo('https://example.com/loop.png'));

      await expect(
        addAttachmentFromUrl('TEST-123', 'https://example.com/file.png', 'file.png')
      ).rejects.toThrow(/more than 5 redirects/);
      expect(axios.get).toHaveBeenCalledTimes(6);
    });

    it('fails on a redirect without a Location header', async () => {
      axios.get.mockResolvedValueOnce({ status: 302, data: Buffer.alloc(0), headers: {} });

      await expect(
        addAttachmentFromUrl('TEST-123', 'https://example.com/file.png', 'file.png')
      ).rejects.toThrow(/without a Location header/);
    });
  });

  describe('HTTP and HTTPS Support', () => {
    it('should support HTTPS URLs', async () => {
      const mockBuffer = Buffer.from('content');
      const mockAttachment = { id: 'att-https' };

      axios.get.mockResolvedValue({
        status: 200,
        data: mockBuffer,
        headers: { 'content-type': 'image/png' },
      });
      makeMultipartRequest.mockResolvedValue([mockAttachment]);

      await addAttachmentFromUrl('TEST-123', 'https://secure.example.com/file.png', 'file.png');

      expect(axios.get).toHaveBeenCalledWith(
        'https://secure.example.com/file.png',
        expect.any(Object)
      );
    });

    it('should support HTTP URLs', async () => {
      const mockBuffer = Buffer.from('content');
      const mockAttachment = { id: 'att-http' };

      axios.get.mockResolvedValue({
        status: 200,
        data: mockBuffer,
        headers: { 'content-type': 'image/png' },
      });
      makeMultipartRequest.mockResolvedValue([mockAttachment]);

      await addAttachmentFromUrl('TEST-123', 'http://example.com/file.png', 'file.png');

      expect(axios.get).toHaveBeenCalledWith('http://example.com/file.png', expect.any(Object));
    });
  });
});
