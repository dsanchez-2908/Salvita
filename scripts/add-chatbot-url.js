const sql = require('mssql');

(async () => {
  try {
    const pool = await sql.connect({
      server: '172.16.16.60',
      database: 'salvita',
      user: 'sa',
      password: 'Lpa1234$',
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    });
    
    await pool.request().query(`
      INSERT INTO TD_PARAMETROS (Parametro, Valor) 
      VALUES ('URL chatbot', 'https://square-regular-honeybee.ngrok-free.app/webhook/a823a0aa-d9f2-449a-810d-9722baedb6a5/chat')
    `);
    
    console.log('✅ Parámetro "URL chatbot" agregado correctamente');
    
    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
