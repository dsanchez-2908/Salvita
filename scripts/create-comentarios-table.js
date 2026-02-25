const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Lpa1234$',
  server: '172.16.16.60',
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function createComentariosTable() {
  let pool;
  
  try {
    console.log('Conectando a la base de datos...');
    pool = await sql.connect(config);
    
    console.log('Verificando si existe la tabla TD_TAREA_COMENTARIOS...');
    const checkTable = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'TD_TAREA_COMENTARIOS'
    `);
    
    if (checkTable.recordset.length > 0) {
      console.log('✓ La tabla TD_TAREA_COMENTARIOS ya existe');
      return;
    }
    
    console.log('Creando tabla TD_TAREA_COMENTARIOS...');
    await pool.request().query(`
      CREATE TABLE TD_TAREA_COMENTARIOS (
        ComentarioId INT IDENTITY(1,1) PRIMARY KEY,
        TareaId INT NOT NULL,
        UsuarioId INT NOT NULL,
        Comentario NVARCHAR(MAX) NOT NULL,
        FechaHora DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_TAREA_COMENTARIOS_TAREA FOREIGN KEY (TareaId) 
          REFERENCES TD_TAREAS(TareaId),
        CONSTRAINT FK_TAREA_COMENTARIOS_USUARIO FOREIGN KEY (UsuarioId) 
          REFERENCES TD_USUARIOS(UsuarioId)
      );
    `);
    
    console.log('✓ Tabla TD_TAREA_COMENTARIOS creada exitosamente');
    
    console.log('Creando índices...');
    await pool.request().query(`
      CREATE INDEX IDX_TAREA_COMENTARIOS_TAREA 
      ON TD_TAREA_COMENTARIOS(TareaId);
    `);
    
    console.log('✓ Índices creados exitosamente');
    
    console.log('\n✓ Migración completada exitosamente');
    
  } catch (error) {
    console.error('✗ Error en la migración:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('Conexión cerrada');
    }
  }
}

createComentariosTable()
  .then(() => {
    console.log('\n=== Script finalizado ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n=== Script finalizado con errores ===');
    process.exit(1);
  });
