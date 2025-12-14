import sql from 'mssql';

const config: sql.config = {
  server: 'localhost',
  port: 1433,
  database: process.env.DB_NAME || 'Salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || ''
    }
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection(): Promise<sql.ConnectionPool> {
  try {
    if (pool) {
      return pool;
    }

    pool = await new sql.ConnectionPool(config).connect();
    console.log('Conexión a SQL Server establecida');

    pool.on('error', (err: Error) => {
      console.error('Error en el pool de conexiones:', err);
      pool = null;
    });

    return pool;
  } catch (error) {
    console.error('Error al conectar a SQL Server:', error);
    throw error;
  }
}

export async function query<T = any>(
  queryText: string,
  params?: { [key: string]: any }
): Promise<T[]> {
  try {
    const connection = await getConnection();
    const request = connection.request();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }

    const result = await request.query(queryText);
    return result.recordset as T[];
  } catch (error) {
    console.error('Error ejecutando query:', error);
    throw error;
  }
}

export async function execute(
  queryText: string,
  params?: { [key: string]: any }
): Promise<any> {
  try {
    const connection = await getConnection();
    const request = connection.request();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }

    const result = await request.query(queryText);
    return result;
  } catch (error) {
    console.error('Error ejecutando comando:', error);
    throw error;
  }
}

export { sql };
