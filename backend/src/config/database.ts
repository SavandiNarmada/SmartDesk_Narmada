import { Pool, PoolClient, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// DATABASE_URL takes priority (used by Docker & cloud deployments)
// Falls back to individual DB_* env vars (used for local dev without Docker)
const pgPool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'smart_desk_assistant',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      keepAlive: true,
    });

function convertPlaceholders(query: string): string {
  let parameterIndex = 0;
  return query.replace(/\?/g, () => `$${++parameterIndex}`);
}

const pool = {
  async query<T extends QueryResultRow = QueryResultRow>(query: string, values: any[] = []): Promise<[T[]]> {
    const text = values.length > 0 ? convertPlaceholders(query) : query;
    const result = await pgPool.query<T>(text, values);
    return [result.rows];
  },
};

export default pool;

// Test database connection
export async function testConnection() {
  let client: PoolClient | undefined;
  try {
    client = await pgPool.connect();
    await client.query('SELECT 1');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  } finally {
    client?.release();
  }
}
