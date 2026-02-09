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
    enableArithAbort: true,
  },
};

async function fixV2Relations() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // Obtener todas las relaciones V2
    console.log('=== BUSCANDO RELACIONES V2 A REPARAR ===\n');
    const relaciones = await sql.query`
      SELECT 
        r.Id as RelacionId,
        r.ModuloPadreId,
        mp.Nombre as ModuloPadre,
        mp.NombreTabla as TablaPadre,
        r.ModuloHijoId,
        mh.Nombre as ModuloHijo,
        mh.NombreTabla as TablaHijo
      FROM TR_MODULO_RELACION r
      INNER JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
      INNER JOIN TD_MODULOS mh ON r.ModuloHijoId = mh.Id
      ORDER BY mp.Nombre
    `;

    if (relaciones.recordset.length === 0) {
      console.log('No se encontraron relaciones V2');
      return;
    }

    console.log(`Encontradas ${relaciones.recordset.length} relaciones:\n`);

    for (const rel of relaciones.recordset) {
      console.log(`📌 ${rel.ModuloPadre} → ${rel.ModuloHijo}`);
      console.log(`   Tabla padre: ${rel.TablaPadre}`);
      console.log(`   Tabla hijo:  ${rel.TablaHijo}`);
      
      const campoFK = `${rel.TablaPadre}_Id`;
      console.log(`   Campo FK que debe existir: ${campoFK}`);

      // Verificar si el campo FK ya existe
      const checkColumn = await sql.query`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = ${rel.TablaHijo}
          AND COLUMN_NAME = ${campoFK}
      `;

      if (checkColumn.recordset.length > 0) {
        console.log(`   ✅ El campo ${campoFK} ya existe\n`);
      } else {
        console.log(`   ⚠️  El campo ${campoFK} NO existe. Agregando...`);
        
        try {
          // Agregar el campo FK
          const alterSQL = `ALTER TABLE [dbo].[${rel.TablaHijo}] ADD [${campoFK}] INT NULL`;
          await sql.query(alterSQL);
          console.log(`   ✅ Campo ${campoFK} agregado exitosamente\n`);
        } catch (error) {
          console.error(`   ❌ Error al agregar ${campoFK}:`, error.message);
          console.log('');
        }
      }
    }

    console.log('\n=== PROCESO COMPLETADO ===');
    console.log('Revisa los resultados arriba para confirmar que todo se agregó correctamente.');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await sql.close();
  }
}

fixV2Relations();
