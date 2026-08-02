import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres/driver';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DatabaseAuthService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseAuthService.name);
  private pool: Pool;
  public db: NodePgDatabase<typeof schema>;

  constructor() {
    const connectionString = process.env.AUTH_DATABASE_URL!;
    this.pool = new Pool({ connectionString });
    this.db = drizzle(this.pool, { schema });

    this.logger.log('Auth database connection established');
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Auth database connection closed');
  }

  get schema() {
    return schema;
  }
}
