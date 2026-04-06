import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { TickerService } from './ticker.service';
import { HistoryQueryDto } from './dto/history-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { Routes } from '../common/enums/routes.enum';

@ApiTags(Routes.TICKERS)
@Controller(Routes.TICKERS)
export class TickerController {
  constructor(private readonly tickerService: TickerService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all active tickers' })
  async getAll() {
    const data = await this.tickerService.getAll();
    return { message: 'OK', data };
  }

  @Public()
  @Get(':symbol')
  @ApiOperation({ summary: 'Get a single ticker with its last known price' })
  @ApiParam({ name: 'symbol', example: 'AAPL' })
  async getBySymbol(@Param('symbol') symbol: string) {
    const data = await this.tickerService.getBySymbol(symbol);
    return { message: 'OK', data };
  }

  @Public()
  @Get(':symbol/history')
  @ApiOperation({ summary: 'Get historical price points (bucketed by interval)' })
  @ApiParam({ name: 'symbol', example: 'AAPL' })
  async getHistory(
    @Param('symbol') symbol: string,
    @Query() query: HistoryQueryDto,
  ) {
    const data = await this.tickerService.getHistory(symbol, query);
    return { message: 'OK', data };
  }
}
