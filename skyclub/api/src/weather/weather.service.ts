import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const WIND_LIMITS = {
  BEGINNER: { max: 20, gust: 25 },
  ADVANCED: { max: 35, gust: 45 },
  PARAMOTOR: { max: 28, gust: 35 },
};

@Injectable()
export class WeatherService {
  constructor(private prisma: PrismaService) {}

  async fetchCurrent(tenantId: string, lat: number, lon: number, siteId?: string) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cloud_cover,weather_code&wind_speed_unit=kmh`;

    const res = await fetch(url);
    const data: any = await res.json();
    const c = data.current;

    const windKmh = c.wind_speed_10m;
    const gustKmh = c.wind_gusts_10m;
    const cloudPct = c.cloud_cover;

    const isFlyable = windKmh >= 8 && windKmh <= 35 && gustKmh <= 45 && cloudPct < 80;

    const snapshot = {
      windKmh,
      gustKmh,
      dirDeg: c.wind_direction_10m,
      tempC: c.temperature_2m,
      cloudPct,
      isFlyable,
    };

    if (siteId) {
      await this.prisma.weatherSnapshot.upsert({
        where: { siteId_at: { siteId, at: new Date(c.time) } },
        create: { tenantId, siteId, at: new Date(c.time), ...snapshot },
        update: snapshot,
      });
    }

    return {
      ...snapshot,
      windows: {
        beginner: windKmh <= WIND_LIMITS.BEGINNER.max && gustKmh <= WIND_LIMITS.BEGINNER.gust,
        advanced: windKmh <= WIND_LIMITS.ADVANCED.max && gustKmh <= WIND_LIMITS.ADVANCED.gust,
        paramotor: windKmh <= WIND_LIMITS.PARAMOTOR.max && gustKmh <= WIND_LIMITS.PARAMOTOR.gust,
      },
    };
  }

  getSites(tenantId: string) {
    return this.prisma.flightSite.findMany({ where: { tenantId } });
  }

  createSite(tenantId: string, data: any) {
    return this.prisma.flightSite.create({ data: { ...data, tenantId } });
  }

  getHistory(siteId: string, tenantId: string) {
    return this.prisma.weatherSnapshot.findMany({
      where: { siteId, tenantId },
      orderBy: { at: 'desc' },
      take: 48,
    });
  }
}
