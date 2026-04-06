import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export type HistoryRange = '1h' | '1d' | '1w';
export type HistoryInterval = '1m' | '5m' | '1h';

export const HISTORY_RANGES: HistoryRange[] = ['1h', '1d', '1w'];
export const HISTORY_INTERVALS: HistoryInterval[] = ['1m', '5m', '1h'];

export class HistoryQueryDto {
  @ApiPropertyOptional({ enum: HISTORY_RANGES, default: '1h' })
  @IsOptional()
  @IsEnum(HISTORY_RANGES)
  range?: HistoryRange = '1h';

  @ApiPropertyOptional({ enum: HISTORY_INTERVALS, default: '1m' })
  @IsOptional()
  @IsEnum(HISTORY_INTERVALS)
  interval?: HistoryInterval = '1m';
}
