import { Injectable, Logger } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres/driver';
import * as schema from './schema';
import { Pool } from 'pg';

@Injectable()
export class DatabaseChatService {
  private readonly logger = new Logger(DatabaseChatService.name);
  private pool: Pool;
  public db: NodePgDatabase<typeof schema>;

  constructor() {
    const connectionString = process.env.CHAT_DATABASE_URL!;
    this.pool = new Pool({ connectionString });
    this.db = drizzle(this.pool, { schema });

    this.logger.log('Chat database connection established');
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Chat database connection closed');
  }

  get schema() {
    return schema;
  }
}
