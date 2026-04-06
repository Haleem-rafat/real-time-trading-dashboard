import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { TickerService } from './ticker.service';
import { Ticker } from './schemas/ticker.schema';
import { HistoricalPrice } from './schemas/historical-price.schema';

describe('TickerService', () => {
  let service: TickerService;
  let cache: { get: jest.Mock; set: jest.Mock };
  let tickerModel: { findOne: jest.Mock; exists: jest.Mock };
  let historyModel: { find: jest.Mock; findOne: jest.Mock };

  beforeEach(async () => {
    cache = { get: jest.fn(), set: jest.fn() };
    tickerModel = { findOne: jest.fn(), exists: jest.fn() };
    historyModel = { find: jest.fn(), findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TickerService,
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: getModelToken(Ticker.name), useValue: tickerModel },
        {
          provide: getModelToken(HistoricalPrice.name),
          useValue: historyModel,
        },
      ],
    }).compile();

    service = module.get(TickerService);
  });

  describe('getHistory', () => {
    it('returns cached value without hitting the database', async () => {
      const cachedData = [
        { timestamp: '2026-01-01T00:00:00.000Z', price: 100 },
      ];
      cache.get.mockResolvedValue(cachedData);

      const result = await service.getHistory('AAPL', {
        range: '1h',
        interval: '1m',
      });

      expect(cache.get).toHaveBeenCalledWith('history:AAPL:1h:1m');
      expect(result).toBe(cachedData);
      expect(tickerModel.exists).not.toHaveBeenCalled();
      expect(historyModel.find).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('fetches from DB, buckets results, and caches them on miss', async () => {
      cache.get.mockResolvedValue(undefined);
      tickerModel.exists.mockResolvedValue({ _id: 'x' });

      // Use absolute timestamps anchored to a minute boundary so bucket
      // assignments are deterministic regardless of when the test runs.
      const minute = 60_000;
      const base = Math.floor(Date.now() / minute) * minute;
      const rawPoints = [
        { timestamp: new Date(base + 0 * minute + 5_000), price: 100 },
        { timestamp: new Date(base + 0 * minute + 35_000), price: 102 }, // same bucket as 1st
        { timestamp: new Date(base + 1 * minute + 10_000), price: 105 },
        { timestamp: new Date(base + 2 * minute + 30_000), price: 110 },
      ];
      historyModel.find.mockReturnValue({
        sort: () => ({
          lean: () => Promise.resolve(rawPoints),
        }),
      });

      const result = (await service.getHistory('aapl', {
        range: '1h',
        interval: '1m',
      })) as { timestamp: string; price: number }[];

      expect(tickerModel.exists).toHaveBeenCalledWith({ symbol: 'AAPL' });
      // Three minute-buckets: avg(100,102)=101, 105, 110 (in chronological order)
      expect(result.length).toBe(3);
      expect(result.map((r) => r.price)).toEqual([101, 105, 110]);
      expect(cache.set).toHaveBeenCalledWith(
        'history:AAPL:1h:1m',
        expect.any(Array),
        30_000,
      );
    });

    it('throws NotFoundException for unknown symbol on cache miss', async () => {
      cache.get.mockResolvedValue(undefined);
      tickerModel.exists.mockResolvedValue(null);

      await expect(
        service.getHistory('FAKE', { range: '1h', interval: '1m' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
