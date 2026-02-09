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

async function addModuloPadreId() {
  try {
    await sql.connect(config);
    console.log('✓ Conectado a SQL Server\n');

    // Paso 1: Verificar si la columna ya existe
    console.log('📋 Verificando estructura actual...');
    const check = await sql.query`
      SELECT COUNT(*) as ExisteColumna
      FROM sys.columns 
      WHERE object_id = OBJECT_ID(N'[dbo].[TR_ROL_MODULO_PERMISO]') 
      AND name = 'ModuloPadreId'
    `;

    if (check.recordset[0].ExisteColumna > 0) {
      console.log('⚠️  La columna ModuloPadreId ya existe, saltando modificación');
      return;
    }

    // Paso 2: Agregar columna ModuloPadreId
    console.log('\n📦 Agregando columna ModuloPadreId...');
    await sql.query`
      ALTER TABLE [dbo].[TR_ROL_MODULO_PERMISO]
      ADD [ModuloPadreId] INT NULL
    `;
    console.log('✓ Columna ModuloPadreId agregada');

    // Paso 3: Agregar foreign key
    console.log('\n📦 Agregando foreign key...');
    await sql.query`
      ALTER TABLE [dbo].[TR_ROL_MODULO_PERMISO]
      ADD CONSTRAINT FK_TR_ROL_MODULO_PERMISO_ModuloPadre
      FOREIGN KEY ([ModuloPadreId]) 
      REFERENCES [dbo].[TD_MODULOS]([Id])
    `;
    console.log('✓ Foreign key FK_TR_ROL_MODULO_PERMISO_ModuloPadre creada');

    // Paso 4: Crear índice
    console.log('\n📦 Creando índice...');
    await sql.query`
      CREATE NONCLUSTERED INDEX IX_TR_ROL_MODULO_PERMISO_Padre_Hijo
      ON [dbo].[TR_ROL_MODULO_PERMISO] ([RolId], [ModuloPadreId], [ModuloId])
    `;
    console.log('✓ Índice IX_TR_ROL_MODULO_PERMISO_Padre_Hijo creado');

    // Paso 5: Duplicar permisos para módulos con múltiples padres
    console.log('\n📦 Procesando módulos con múltiples padres...');
    
    const modulosMultiplesPadres = await sql.query`
      SELECT 
        m.Id as ModuloId,
        m.Nombre as ModuloNombre,
        COUNT(*) as CantidadPadres
      FROM TD_MODULOS m
      INNER JOIN TR_MODULO_RELACION r ON m.Id = r.ModuloHijoId
      GROUP BY m.Id, m.Nombre
      HAVING COUNT(*) > 1
    `;

    console.log(`✓ Encontrados ${modulosMultiplesPadres.recordset.length} módulos con múltiples padres`);

    for (const modulo of modulosMultiplesPadres.recordset) {
      console.log(`\n  🔄 Procesando: ${modulo.ModuloNombre} (${modulo.CantidadPadres} padres)`);
      
      // Obtener padres del módulo
      const padres = await sql.query`
        SELECT DISTINCT r.ModuloPadreId, mp.Nombre as PadreNombre
        FROM TR_MODULO_RELACION r
        INNER JOIN TD_MODULOS mp ON r.ModuloPadreId = mp.Id
        WHERE r.ModuloHijoId = ${modulo.ModuloId}
      `;

      // Obtener permisos existentes para este módulo
      const permisosExistentes = await sql.query`
        SELECT 
          p.Id, p.RolId, r.Nombre as RolNombre,
          p.PermisoVer, p.PermisoAgregar, p.PermisoModificar, 
          p.PermisoEliminar, p.PermisoVerAgrupado
        FROM TR_ROL_MODULO_PERMISO p
        INNER JOIN TD_ROLES r ON p.RolId = r.Id
        WHERE p.ModuloId = ${modulo.ModuloId}
        AND p.ModuloPadreId IS NULL
      `;

      console.log(`    • ${permisosExistentes.recordset.length} permiso(s) existente(s)`);

      // Para cada permiso existente, crear copias para cada padre
      for (const permiso of permisosExistentes.recordset) {
        for (const padre of padres.recordset) {
          try {
            await sql.query`
              INSERT INTO TR_ROL_MODULO_PERMISO 
                (RolId, ModuloPadreId, ModuloId, PermisoVer, PermisoAgregar, 
                 PermisoModificar, PermisoEliminar, PermisoVerAgrupado, 
                 FechaAsignacion, UsuarioAsignacion)
              VALUES 
                (${permiso.RolId}, ${padre.ModuloPadreId}, ${modulo.ModuloId}, 
                 ${permiso.PermisoVer}, ${permiso.PermisoAgregar}, 
                 ${permiso.PermisoModificar}, ${permiso.PermisoEliminar}, 
                 ${permiso.PermisoVerAgrupado}, 
                 GETDATE(), 'MIGRACION')
            `;
            console.log(`      ✓ Duplicado para rol "${permiso.RolNombre}" bajo padre "${padre.PadreNombre}"`);
          } catch (err) {
            if (err.message.includes('duplicate')) {
              console.log(`      ⚠️  Ya existe permiso para rol "${permiso.RolNombre}" bajo padre "${padre.PadreNombre}"`);
            } else {
              throw err;
            }
          }
        }
      }

      // Eliminar permisos originales sin ModuloPadreId
      if (permisosExistentes.recordset.length > 0) {
        await sql.query`
          DELETE FROM TR_ROL_MODULO_PERMISO
          WHERE ModuloId = ${modulo.ModuloId}
          AND ModuloPadreId IS NULL
        `;
        console.log(`    ✓ Eliminados ${permisosExistentes.recordset.length} permiso(s) sin contexto de padre`);
      }
    }

    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE\n');
    console.log('=== SIGUIENTE PASO ===');
    console.log('Probar en: http://localhost:3000/dashboard/roles');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err);
  } finally {
    await sql.close();
  }
}

addModuloPadreId();
