import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('weather')
@UseGuards(JwtAuthGuard)
export class WeatherController {
  constructor(private weather: WeatherService) {}

  @Get('current')
  current(@TenantId() tenantId: string, @Query('lat') lat: string, @Query('lon') lon: string, @Query('siteId') siteId?: string) {
    return this.weather.fetchCurrent(tenantId, parseFloat(lat || '32.08'), parseFloat(lon || '34.78'), siteId);
  }

  @Get('sites')
  sites(@TenantId() tenantId: string) {
    return this.weather.getSites(tenantId);
  }

  @Post('sites')
  createSite(@TenantId() tenantId: string, @Body() body: any) {
    return this.weather.createSite(tenantId, body);
  }

  @Get('history/:siteId')
  history(@TenantId() tenantId: string, @Param('siteId') siteId: string) {
    return this.weather.getHistory(siteId, tenantId);
  }
}
