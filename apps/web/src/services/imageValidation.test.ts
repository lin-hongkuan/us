import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_SIZE_BYTES, MAX_MEMORY_IMAGES } from '../config/constants';
import { formatImageValidationIssues, validateImageFiles } from './imageValidation';

const imageFile = (name: string, size = 1024, type = 'image/png') => new File(['x'.repeat(size)], name, { type });

describe('validateImageFiles', () => {
  it('accepts image files within limits', () => {
    const file = imageFile('memory.png');

    const result = validateImageFiles([file]);

    expect(result.acceptedFiles).toEqual([file]);
    expect(result.issues).toEqual([]);
    expect(result.remainingSlots).toBe(MAX_MEMORY_IMAGES - 1);
  });

  it('rejects non-image files', () => {
    const result = validateImageFiles([new File(['hello'], 'note.txt', { type: 'text/plain' })]);

    expect(result.acceptedFiles).toEqual([]);
    expect(result.issues).toEqual([{ fileName: 'note.txt', reason: '只支持图片文件' }]);
  });

  it('rejects files larger than the configured limit', () => {
    const hugeFile = new File([new Uint8Array(MAX_IMAGE_SIZE_BYTES + 1)], 'huge.jpg', { type: 'image/jpeg' });

    const result = validateImageFiles([hugeFile]);

    expect(result.acceptedFiles).toEqual([]);
    expect(result.issues[0].fileName).toBe('huge.jpg');
  });

  it('respects remaining image slots', () => {
    const first = imageFile('first.png');
    const second = imageFile('second.png');

    const result = validateImageFiles([first, second], MAX_MEMORY_IMAGES - 1);

    expect(result.acceptedFiles).toEqual([first]);
    expect(result.issues).toEqual([{ fileName: 'second.png', reason: `每条回忆最多只能放 ${MAX_MEMORY_IMAGES} 张图片` }]);
    expect(result.remainingSlots).toBe(0);
  });
});

describe('formatImageValidationIssues', () => {
  it('formats at most three visible issues with overflow count', () => {
    const message = formatImageValidationIssues([
      { fileName: 'a.txt', reason: '不支持' },
      { fileName: 'b.txt', reason: '不支持' },
      { fileName: 'c.txt', reason: '不支持' },
      { fileName: 'd.txt', reason: '不支持' },
    ]);

    expect(message).toBe('a.txt：不支持\nb.txt：不支持\nc.txt：不支持\n还有 1 个文件未添加');
  });
});
