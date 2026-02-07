import { describe, it, expect } from 'vitest';
import { ActionSchema } from './action.js';

describe('ActionSchema', () => {
  describe('say action', () => {
    it('should accept valid say action', () => {
      const result = ActionSchema.safeParse({
        action: 'say',
        params: { text: 'Hello world' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject say with empty text', () => {
      const result = ActionSchema.safeParse({
        action: 'say',
        params: { text: '' },
      });
      expect(result.success).toBe(false);
    });

    it('should reject say with text over 500 chars', () => {
      const result = ActionSchema.safeParse({
        action: 'say',
        params: { text: 'a'.repeat(501) },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('whisper action', () => {
    it('should accept valid whisper action', () => {
      const result = ActionSchema.safeParse({
        action: 'whisper',
        params: { target: 'Doc Holliday', text: 'Meet me outside' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject whisper without target', () => {
      const result = ActionSchema.safeParse({
        action: 'whisper',
        params: { text: 'Hello' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('move action', () => {
    it('should accept valid room', () => {
      const result = ActionSchema.safeParse({
        action: 'move',
        params: { room: 'street' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid room', () => {
      const result = ActionSchema.safeParse({
        action: 'move',
        params: { room: 'nonexistent_room' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('shoot action', () => {
    it('should accept valid shoot action', () => {
      const result = ActionSchema.safeParse({
        action: 'shoot',
        params: { target: 'Bad Guy' },
      });
      expect(result.success).toBe(true);
    });

    it('should reject shoot without target', () => {
      const result = ActionSchema.safeParse({
        action: 'shoot',
        params: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe('wait action', () => {
    it('should accept wait with empty params', () => {
      const result = ActionSchema.safeParse({
        action: 'wait',
        params: {},
      });
      expect(result.success).toBe(true);
    });

    it('should accept wait without params', () => {
      const result = ActionSchema.safeParse({
        action: 'wait',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('pay action', () => {
    it('should accept valid pay action', () => {
      const result = ActionSchema.safeParse({
        action: 'pay',
        params: { target: 'Silas McCoy', amount: 5 },
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative amount', () => {
      const result = ActionSchema.safeParse({
        action: 'pay',
        params: { target: 'Silas McCoy', amount: -5 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const result = ActionSchema.safeParse({
        action: 'pay',
        params: { target: 'Silas McCoy', amount: 0 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid actions', () => {
    it('should reject unknown action type', () => {
      const result = ActionSchema.safeParse({
        action: 'teleport',
        params: {},
      });
      expect(result.success).toBe(false);
    });
  });
});
