import { Injectable } from '@nestjs/common';

import {parsers} from '@salestracker.ts/parsers';

@Injectable()
export class AppService {
  getData(): { message: string } {
    return { message: 'Hello API new ' + parsers() };
  }
}
