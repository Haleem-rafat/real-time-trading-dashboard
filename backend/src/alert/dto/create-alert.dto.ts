import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateAlertDto {
  @ApiProperty({ example: 'AAPL' })
  @IsString()
  @MinLength(1)
  symbol: string;

  @ApiProperty({ enum: ['above', 'below'], example: 'above' })
  @IsEnum(['above', 'below'])
  direction: 'above' | 'below';

  @ApiProperty({ example: 200, description: 'Price threshold to watch' })
  @IsNumber()
  @Min(0)
  price: number;
}
