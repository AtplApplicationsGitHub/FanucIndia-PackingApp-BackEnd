export type JwtPayload = {
  sub: string | number;
  email: string;
  role: string;
  name: string;
  salesZoneId?: number;
  sessionId?: string;
  isWeb?: boolean;
};