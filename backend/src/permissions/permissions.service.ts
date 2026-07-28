import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB } from '../database/database.module';
import * as schema from '../database/schema';
import { PERMISSION_DEFINITIONS } from './permissions.seed';

@Injectable()
export class PermissionsService {
  constructor(@Inject(DB) private db: NodePgDatabase<typeof schema>) {}

  async findAll() {
    return this.db.select().from(schema.permissions).orderBy(schema.permissions.module, schema.permissions.name);
  }

  async seed() {
    for (const def of PERMISSION_DEFINITIONS) {
      await this.db
        .insert(schema.permissions)
        .values(def)
        .onConflictDoNothing();
    }
  }
}
