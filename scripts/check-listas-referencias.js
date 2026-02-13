const sql = require('mssql');

const config = {
  server: '172.16.16.60',
  port: 1433,
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'Lpa1234$'
    }
  }
};

async function checkReferences() {
  try {
    await sql.connect(config);
    
    // Ver la estructura de TD_LISTAS
    const columnsResult = await sql.query`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_LISTAS'
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log('\n=== Estructura de TD_LISTAS ===');
    console.log(columnsResult.recordset);
    
    // Ver las constraint de foreign key
    const fkResult = await sql.query`
      SELECT 
        fk.name AS FK_Name,
        OBJECT_NAME(fk.parent_object_id) AS Table_Name,
        COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS Column_Name,
        OBJECT_NAME(fk.referenced_object_id) AS Referenced_Table,
        COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS Referenced_Column
      FROM sys.foreign_keys AS fk
      INNER JOIN sys.foreign_key_columns AS fkc 
        ON fk.object_id = fkc.constraint_object_id
      WHERE OBJECT_NAME(fk.parent_object_id) = 'TD_LISTAS'
    `;
    
    console.log('\n=== Foreign Keys de TD_LISTAS ===');
    console.log(fkResult.recordset);
    
    // Ver si hay listas con CampoValorId
    const listasConCampo = await sql.query`
      SELECT 
        l.Id,
        l.Nombre,
        l.CampoValorId,
        c.Nombre AS CampoNombre,
        c.ModuloId,
        m.Nombre AS ModuloNombre
      FROM TD_LISTAS l
      LEFT JOIN TD_CAMPOS c ON l.CampoValorId = c.Id
      LEFT JOIN TD_MODULOS m ON c.ModuloId = m.Id
      WHERE l.CampoValorId IS NOT NULL
    `;
    
    console.log('\n=== Listas con CampoValorId ===');
    console.log(listasConCampo.recordset);
    
    await sql.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkReferences();
