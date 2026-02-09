const sql = require('mssql');

const config = {
  server: '172.16.16.60',
  port: 1433,
  database: 'salvita',
  user: 'sa',
  password: 'Lpa1234$',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function addForeignKeys() {
  try {
    const pool = await sql.connect(config);
    console.log('Conectado a SQL Server\n');

    // Verificar foreign keys existentes
    console.log('Verificando Foreign Keys existentes...');
    const existing = await pool.request().query(`
      SELECT name
      FROM sys.foreign_keys
      WHERE parent_object_id = OBJECT_ID('TD_LISTAS')
    `);
    
    console.log('Foreign Keys actuales en TD_LISTAS:');
    existing.recordset.forEach(fk => console.log(`  - ${fk.name}`));
    console.log('');

    const fksToAdd = [
      {
        name: 'FK_TD_LISTAS_ModuloOrigen',
        sql: `ALTER TABLE TD_LISTAS ADD CONSTRAINT FK_TD_LISTAS_ModuloOrigen FOREIGN KEY (ModuloOrigenId) REFERENCES TD_MODULOS(Id) ON DELETE SET NULL`
      },
      {
        name: 'FK_TD_LISTAS_CampoValor',
        sql: `ALTER TABLE TD_LISTAS ADD CONSTRAINT FK_TD_LISTAS_CampoValor FOREIGN KEY (CampoValorId) REFERENCES TD_CAMPOS(Id) ON DELETE NO ACTION`
      },
      {
        name: 'FK_TD_LISTAS_FiltroCampo',
        sql: `ALTER TABLE TD_LISTAS ADD CONSTRAINT FK_TD_LISTAS_FiltroCampo FOREIGN KEY (FiltroCampoId) REFERENCES TD_CAMPOS(Id) ON DELETE NO ACTION`
      }
    ];

    for (const fk of fksToAdd) {
      const exists = existing.recordset.some(e => e.name === fk.name);
      
      if (exists) {
        console.log(`⊘ ${fk.name} ya existe`);
      } else {
        try {
          await pool.request().query(fk.sql);
          console.log(`✓ ${fk.name} agregada`);
        } catch (err) {
          console.log(`✗ Error agregando ${fk.name}: ${err.message}`);
        }
      }
    }

    await pool.close();
    console.log('\n✓ Proceso completado');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

addForeignKeys();
