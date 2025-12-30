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
    
    console.log('Verificando estructura de TD_DASHBOARD_CONFIG...');
    
    // Verificar si la columna RolId existe
    const columnCheck = await pool.request().query(`
      SELECT COUNT(*) as Existe
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TD_DASHBOARD_CONFIG' AND COLUMN_NAME = 'RolId'
    `);
    
    if (columnCheck.recordset[0].Existe === 0) {
      console.log('La columna RolId no existe. Recreando tabla...');
      
      // Eliminar tabla existente
      await pool.request().query(`DROP TABLE IF EXISTS TD_DASHBOARD_CONFIG`);
      console.log('✓ Tabla anterior eliminada');
      
      // Crear tabla correcta
      await pool.request().query(`
        CREATE TABLE [dbo].[TD_DASHBOARD_CONFIG] (
          [Id] INT IDENTITY(1,1) PRIMARY KEY,
          [RolId] INT NOT NULL,
          [ModuloId] INT NOT NULL,
          [TipoVisualizacion] VARCHAR(50) NOT NULL CHECK ([TipoVisualizacion] IN ('Agrupamiento', 'DetalleFiltrado')),
          [CampoAgrupamiento] VARCHAR(100) NULL,
          [CampoFiltro] VARCHAR(100) NULL,
          [ValorFiltro] VARCHAR(MAX) NULL,
          [Orden] INT DEFAULT 0,
          [FechaCreacion] DATETIME DEFAULT GETDATE(),
          [FechaModificacion] DATETIME DEFAULT GETDATE(),
          [UsuarioCreacion] VARCHAR(100),
          [UsuarioModificacion] VARCHAR(100),
          CONSTRAINT FK_TD_DASHBOARD_CONFIG_Rol FOREIGN KEY ([RolId]) REFERENCES [dbo].[TD_ROLES]([Id]) ON DELETE CASCADE,
          CONSTRAINT FK_TD_DASHBOARD_CONFIG_Modulo FOREIGN KEY ([ModuloId]) REFERENCES [dbo].[TD_MODULOS]([Id]) ON DELETE CASCADE
        );
      `);
      console.log('✓ Tabla TD_DASHBOARD_CONFIG recreada correctamente');
      
      // Crear índices
      await pool.request().query(`
        CREATE INDEX IX_DASHBOARD_CONFIG_RolId ON [dbo].[TD_DASHBOARD_CONFIG] ([RolId]);
        CREATE INDEX IX_DASHBOARD_CONFIG_ModuloId ON [dbo].[TD_DASHBOARD_CONFIG] ([ModuloId]);
      `);
      console.log('✓ Índices creados');
      
    } else {
      console.log('✓ La columna RolId ya existe. No se requiere modificación.');
    }
    
    await pool.close();
    console.log('\n✅ Tabla TD_DASHBOARD_CONFIG actualizada correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
