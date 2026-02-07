import pg from "pg";
import { config } from "../config.js";

const pool = new pg.Pool(config.database);

export async function query<T = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export { pool };
