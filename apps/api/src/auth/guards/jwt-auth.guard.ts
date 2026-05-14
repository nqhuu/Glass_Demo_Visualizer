import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// VI: Guard bao ve route bang Bearer JWT hop le.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
