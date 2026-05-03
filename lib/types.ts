export interface WeatherData {
  temperature: number;      // 기온 (°C)
  humidity: number;         // 습도 (%)
  windSpeed: number;        // 풍속 (m/s)
  windDirection: number;    // 풍향 (°)
  precipitationType: number; // 강수형태 (0:없음, 1:비, 2:비/눈, 3:눈, 5:빗방울, 6:빗방울눈날림, 7:눈날림)
  precipitation: string;    // 1시간 강수량 (mm)
  baseDate: string;
  baseTime: string;
  nx: number;
  ny: number;
}

export interface AirQualityData {
  stationName: string;      // 측정소명
  pm10Value: string;        // PM10 농도 (μg/m³)
  pm25Value: string;        // PM2.5 농도 (μg/m³)
  pm10Grade: string;        // PM10 등급 (1:좋음, 2:보통, 3:나쁨, 4:매우나쁨)
  pm25Grade: string;        // PM2.5 등급
  o3Value: string;          // 오존 농도 (ppm)
  coValue: string;          // 일산화탄소 (ppm)
  dataTime: string;         // 측정 시간
}

export interface LocationConfig {
  name: string;             // 표시 이름 (예: 서울)
  region: string;           // 지역 (예: 대한민국)
  nx: number;               // 기상청 격자 X
  ny: number;               // 기상청 격자 Y
  stationName: string;      // 에어코리아 측정소명
}

export type GradeKey = 'good' | 'moderate' | 'bad' | 'very-bad';

export const GRADE_MAP: Record<string, GradeKey> = {
  '1': 'good',
  '2': 'moderate',
  '3': 'bad',
  '4': 'very-bad',
};

export const GRADE_LABEL: Record<GradeKey, string> = {
  'good': '좋음',
  'moderate': '보통',
  'bad': '나쁨',
  'very-bad': '매우나쁨',
};

export const PRECIP_LABEL: Record<number, string> = {
  0: '없음',
  1: '비',
  2: '비/눈',
  3: '눈',
  5: '빗방울',
  6: '빗방울눈날림',
  7: '눈날림',
};

export const PRECIP_ICON: Record<number, string> = {
  0: '☀️',
  1: '🌧️',
  2: '🌨️',
  3: '❄️',
  5: '🌦️',
  6: '🌨️',
  7: '🌨️',
};

export function windDirectionLabel(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}
