import { Injectable } from '@nestjs/common';

// VI: Service nen tang cho health check, khong chua nghiep vu san pham o Sprint 0.
@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'glass-demo-visualizer-api',
    };
  }
}
