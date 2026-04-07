import { AlertService } from './alert.service';

describe('AlertService.shouldFire', () => {
  describe('above', () => {
    it('fires when price crosses up through the threshold', () => {
      // ref 95 → current 105, threshold 100 → CROSSED UP
      expect(AlertService.shouldFire('above', 100, 95, 105)).toBe(true);
    });

    it('fires exactly at the threshold (=)', () => {
      expect(AlertService.shouldFire('above', 100, 95, 100)).toBe(true);
    });

    it('does not fire when price moves up but stays under threshold', () => {
      expect(AlertService.shouldFire('above', 100, 90, 99)).toBe(false);
    });

    it('does not fire when price was already above threshold at creation', () => {
      // ref 105 (already above) → current 110 → SHOULD NOT FIRE
      expect(AlertService.shouldFire('above', 100, 105, 110)).toBe(false);
    });

    it('does not fire on a downward move regardless of threshold', () => {
      expect(AlertService.shouldFire('above', 100, 95, 92)).toBe(false);
    });
  });

  describe('below', () => {
    it('fires when price crosses down through the threshold', () => {
      // ref 105 → current 95, threshold 100 → CROSSED DOWN
      expect(AlertService.shouldFire('below', 100, 105, 95)).toBe(true);
    });

    it('fires exactly at the threshold (=)', () => {
      expect(AlertService.shouldFire('below', 100, 105, 100)).toBe(true);
    });

    it('does not fire when price moves down but stays above threshold', () => {
      expect(AlertService.shouldFire('below', 100, 110, 101)).toBe(false);
    });

    it('does not fire when price was already below threshold at creation', () => {
      // ref 95 (already below) → current 90 → SHOULD NOT FIRE
      expect(AlertService.shouldFire('below', 100, 95, 90)).toBe(false);
    });

    it('does not fire on an upward move regardless of threshold', () => {
      expect(AlertService.shouldFire('below', 100, 105, 108)).toBe(false);
    });
  });
});
