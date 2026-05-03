import type { WeatherData, AirQualityData } from './types';

export const MOCK_WEATHER: WeatherData = {
  temperature: 22,
  humidity: 58,
  windSpeed: 3.2,
  windDirection: 225,
  precipitationType: 0,
  precipitation: '0',
  baseDate: '20260503',
  baseTime: '1400',
  nx: 60,
  ny: 127,
};

export const MOCK_AIR_QUALITY: AirQualityData = {
  stationName: '중구',
  pm10Value: '28',
  pm25Value: '14',
  pm10Grade: '1',
  pm25Grade: '1',
  o3Value: '0.041',
  coValue: '0.4',
  dataTime: '2026-05-03 14:00',
};
