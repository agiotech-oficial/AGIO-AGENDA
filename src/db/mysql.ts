import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let tablesCreated = false;

export function getMySQLConfig() {
  const host = process.env.MYSQL_HOST || process.env.SQL_HOST || 'localhost';
  const port = parseInt(process.env.MYSQL_PORT || process.env.SQL_PORT || '3306', 10);
  const user = process.env.MYSQL_USER || process.env.SQL_USER || 'u817279872_capivara';
  const password = process.env.MYSQL_PASSWORD || process.env.SQL_PASSWORD || 'orgDvpgW:?1Q';
  const database = process.env.MYSQL_DATABASE || process.env.MYSQL_DB_NAME || process.env.SQL_DB_NAME || 'u817279872_agioagendadb';

  return { host, port, user, password, database };
}

export function isMySQLConfigured(): boolean {
  const config = getMySQLConfig();
  return Boolean(config.user && config.database);
}

export function getMySQLPool(): mysql.Pool {
  if (!pool) {
    const config = getMySQLConfig();
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: 5000,
    });
  }
  return pool;
}

export async function ensureMySQLTables() {
  if (tablesCreated) return true;
  try {
    const p = getMySQLPool();
    
    // Create users table
    await p.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firebase_uid VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        photo_url TEXT,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        totp_enabled BOOLEAN DEFAULT FALSE,
        totp_secret TEXT,
        webauthn_enabled BOOLEAN DEFAULT FALSE,
        webauthn_credential_id TEXT,
        whatsapp VARCHAR(50),
        cpf VARCHAR(50),
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        plan VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        theme_color VARCHAR(50),
        theme_bg VARCHAR(50),
        age VARCHAR(20),
        gender VARCHAR(50),
        profession VARCHAR(100),
        pix_key VARCHAR(100),
        language VARCHAR(20),
        sound_enabled BOOLEAN DEFAULT TRUE,
        voice_enabled BOOLEAN DEFAULT FALSE,
        mfa_pin VARCHAR(50),
        visual_edits LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create appointments table
    await p.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        date VARCHAR(50) NOT NULL,
        time VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        address TEXT,
        contact VARCHAR(255),
        notes TEXT,
        value VARCHAR(50),
        value_status VARCHAR(50),
        reminders TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    tablesCreated = true;
    return true;
  } catch (error) {
    console.warn('[MySQL] Could not ensure tables (DB may be unreachable in local preview):', error);
    return false;
  }
}

export async function queryMySQL(sql: string, params: any[] = []): Promise<any> {
  try {
    await ensureMySQLTables();
    const p = getMySQLPool();
    const [results] = await p.execute(sql, params);
    return results;
  } catch (error) {
    console.error('[MySQL Error]:', error);
    throw error;
  }
}
