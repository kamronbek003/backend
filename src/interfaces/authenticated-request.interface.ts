import { Request } from 'express'; 

interface JwtPayload {
  sub: string; 
  role: string; 
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload; 
}