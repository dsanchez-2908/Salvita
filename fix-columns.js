const sql = require('mssql');
const fs = require('fs');

const config = {
  server: '172.16.16.60',
  port: 1433,
  database: 'salvita',
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'Lpa1234$'
    }
  }
};

(async () => {
  try {
    await sql.connect(config);
    console.log('Conectado a la base de datos');
    
    // 1. TD_BANDEJAS - Agregar Activo
    try {
      await sql.query(`ALTER TABLE TD_BANDEJAS ADD Activo BIT NOT NULL DEFAULT 1`);
      console.log('✓ TD_BANDEJAS.Activo agregada');
      await sql.query(`UPDATE TD_BANDEJAS SET Activo = CASE WHEN Estado = 'Activa' THEN 1 ELSE 0 END`);
    } catch (e) {
      console.log('⚠ TD_BANDEJAS.Activo ya existe');
    }
    
    // 2. TD_TAREAS - Agregar PlantillaId
    try {
      await sql.query(`ALTER TABLE TD_TAREAS ADD PlantillaId INT NULL`);
      console.log('✓ TD_TAREAS.PlantillaId agregada');
      await sql.query(`UPDATE TD_TAREAS SET PlantillaId = PlantillaTareaId WHERE PlantillaId IS NULL`);
    } catch (e) {
      console.log('⚠ TD_TAREAS.PlantillaId ya existe');
    }
    
    // 3. TD_TAREAS - Agregar ModuloId
    try {
      await sql.query(`ALTER TABLE TD_TAREAS ADD ModuloId INT NULL`);
      console.log('✓ TD_TAREAS.ModuloId agregada');
    } catch (e) {
      console.log('⚠ TD_TAREAS.ModuloId ya existe');
    }
    
    // 4. TD_TAREAS - Agregar CreadoPor
    try {
      await sql.query(`ALTER TABLE TD_TAREAS ADD CreadoPor INT NULL`);
      console.log('✓ TD_TAREAS.CreadoPor agregada');
    } catch (e) {
      console.log('⚠ TD_TAREAS.CreadoPor ya existe');
    }
    
    // 5. TD_TAREAS - Agregar Activo
    try {
      await sql.query(`ALTER TABLE TD_TAREAS ADD Activo BIT NOT NULL DEFAULT 1`);
      console.log('✓ TD_TAREAS.Activo agregada');
    } catch (e) {
      console.log('⚠ TD_TAREAS.Activo ya existe');
    }
    
    // 6. TD_TAREAS - Agregar TomoId
    try {
      await sql.query(`ALTER TABLE TD_TAREAS ADD TomoId INT NULL`);
      console.log('✓ TD_TAREAS.TomoId agregada');
      await sql.query(`UPDATE TD_TAREAS SET TomoId = UsuarioTomadaPorId WHERE TomoId IS NULL`);
    } catch (e) {
      console.log('⚠ TD_TAREAS.TomoId ya existe');
    }
    
    // 7. TD_TAREAS - Agregar FechaTomo
    try {
      await sql.query(`ALTER TABLE TD_TAREAS ADD FechaTomo DATETIME NULL`);
      console.log('✓ TD_TAREAS.FechaTomo agregada');
      await sql.query(`UPDATE TD_TAREAS SET FechaTomo = FechaTomada WHERE FechaTomo IS NULL`);
    } catch (e) {
      console.log('⚠ TD_TAREAS.FechaTomo ya existe');
    }
    
    // 8. TD_TAREA_HISTORIAL - Agregar Comentario
    try {
      await sql.query(`ALTER TABLE TD_TAREA_HISTORIAL ADD Comentario VARCHAR(MAX) NULL`);
      console.log('✓ TD_TAREA_HISTORIAL.Comentario agregada');
      await sql.query(`UPDATE TD_TAREA_HISTORIAL SET Comentario = Detalle WHERE Comentario IS NULL`);
    } catch (e) {
      console.log('⚠ TD_TAREA_HISTORIAL.Comentario ya existe');
    }
    
    // 9. TD_TAREA_HISTORIAL - Agregar FechaAccion
    try {
      await sql.query(`ALTER TABLE TD_TAREA_HISTORIAL ADD FechaAccion DATETIME NULL`);
      console.log('✓ TD_TAREA_HISTORIAL.FechaAccion agregada');
      await sql.query(`UPDATE TD_TAREA_HISTORIAL SET FechaAccion = FechaHora WHERE FechaAccion IS NULL`);
    } catch (e) {
      console.log('⚠ TD_TAREA_HISTORIAL.FechaAccion ya existe');
    }
    
    // 10. TR_TAREA_REGISTRO - Agregar FechaAsociacion
    try {
      await sql.query(`ALTER TABLE TR_TAREA_REGISTRO ADD FechaAsociacion DATETIME NULL DEFAULT GETDATE()`);
      console.log('✓ TR_TAREA_REGISTRO.FechaAsociacion agregada');
      await sql.query(`UPDATE TR_TAREA_REGISTRO SET FechaAsociacion = FechaCreacion WHERE FechaAsociacion IS NULL`);
    } catch (e) {
      console.log('⚠ TR_TAREA_REGISTRO.FechaAsociacion ya existe');
    }
    
    // 11. TD_PLANTILLA_TAREAS - Agregar Instrucciones
    try {
      await sql.query(`ALTER TABLE TD_PLANTILLA_TAREAS ADD Instrucciones VARCHAR(MAX) NULL`);
      console.log('✓ TD_PLANTILLA_TAREAS.Instrucciones agregada');
      await sql.query(`UPDATE TD_PLANTILLA_TAREAS SET Instrucciones = Indicaciones WHERE Instrucciones IS NULL`);
    } catch (e) {
      console.log('⚠ TD_PLANTILLA_TAREAS.Instrucciones ya existe');
    }
    
    // 12. TD_PLANTILLA_TAREAS - Agregar Activo
    try {
      await sql.query(`ALTER TABLE TD_PLANTILLA_TAREAS ADD Activo BIT NOT NULL DEFAULT 1`);
      console.log('✓ TD_PLANTILLA_TAREAS.Activo agregada');
      await sql.query(`UPDATE TD_PLANTILLA_TAREAS SET Activo = CASE WHEN Estado = 'Activo' THEN 1 ELSE 0 END`);
    } catch (e) {
      console.log('⚠ TD_PLANTILLA_TAREAS.Activo ya existe');
    }
    
    console.log('\n✓ Todas las columnas han sido agregadas exitosamente');
    await sql.close();
  } catch (err) {
    console.error('✗ Error:', err.message);
    process.exit(1);
  }
})();
