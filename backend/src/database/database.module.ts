import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB = Symbol('DB');

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({
          host: config.get('DATABASE_HOST'),
          port: config.get<number>('DATABASE_PORT'),
          database: config.get('DATABASE_NAME'),
          user: config.get('DATABASE_USER'),
          password: config.get('DATABASE_PASSWORD'),
        });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
