import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
    sub: string; 
    phone: string;
    role: string;
    name?: string; 
    lastname?: string;
    image?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.ACCESS_KEY as string, 
        });
    }

    async validate(payload: JwtPayload) {

        return {
            sub: payload.sub, 
            phone: payload.phone,
            role: payload.role,
            firstName: payload.name, 
            lastName: payload.lastname 
        };
    }
}
