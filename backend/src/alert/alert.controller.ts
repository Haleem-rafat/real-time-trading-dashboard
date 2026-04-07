import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AlertService } from './alert.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UserFromPayload } from '../common/decorators/user-from-payload.decorator';
import type { JwtPayload } from '../common/decorators/user-from-payload.decorator';
import { Routes } from '../common/enums/routes.enum';

@ApiTags(Routes.ALERTS)
@ApiBearerAuth()
@Controller(Routes.ALERTS)
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  @Post()
  @ApiOperation({ summary: 'Create a price-threshold alert' })
  async create(
    @UserFromPayload() user: JwtPayload,
    @Body() dto: CreateAlertDto,
  ) {
    const data = await this.alertService.create(user.sub, dto);
    return { message: 'Alert created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List the current user’s alerts' })
  async list(@UserFromPayload() user: JwtPayload) {
    const data = await this.alertService.list(user.sub);
    return { message: 'OK', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one of the current user’s alerts' })
  async remove(@UserFromPayload() user: JwtPayload, @Param('id') id: string) {
    await this.alertService.remove(user.sub, id);
  }
}
