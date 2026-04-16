import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getUserFromRequest, registrarTraza } from '@/lib/auth';
import { ApiResponse, CreateListaRequest } from '@/types';

// GET - Obtener listas
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // Obtener una lista específica con sus valores
      const lista = await query(
        `SELECT l.*, 
                m.Nombre as ModuloOrigenNombre,
                cv.Nombre as CampoValorNombre, cv.NombreColumna as CampoValorColumna,
                cf.Nombre as FiltroCampoNombre, cf.NombreColumna as FiltroCampoColumna,
                cf.TipoDato as FiltroCampoTipoDato, cf.ListaId as FiltroCampoListaId
         FROM TD_LISTAS l
         LEFT JOIN TD_MODULOS m ON l.ModuloOrigenId = m.Id
         LEFT JOIN TD_CAMPOS cv ON l.CampoValorId = cv.Id
         LEFT JOIN TD_CAMPOS cf ON l.FiltroCampoId = cf.Id
         WHERE l.Id = @id`,
        { id: parseInt(id) }
      );

      if (lista.length === 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Lista no encontrada' },
          { status: 404 }
        );
      }

      let valores: any[] = [];
      const listaData = lista[0];

      // Obtener valores según el tipo de lista
      if (listaData.TipoLista === 'ValoresFijos') {
        // Valores fijos desde TD_VALORES_LISTA
        valores = await query(
          `SELECT * FROM TD_VALORES_LISTA 
           WHERE ListaId = @listaId 
           ORDER BY Orden, Valor`,
          { listaId: parseInt(id) }
        );
      } else if (listaData.TipoLista === 'ValoresModulo' && listaData.ModuloOrigenId) {
        // Valores dinámicos desde módulo
        const modulo = await query(
          'SELECT NombreTabla FROM TD_MODULOS WHERE Id = @id',
          { id: listaData.ModuloOrigenId }
        );

        if (modulo.length > 0) {
          const tabla = modulo[0].NombreTabla;
          const campoValor = listaData.CampoValorColumna;

          // Construir query dinámico
          let dynamicQuery = `SELECT Id, [${campoValor}] as Valor FROM [dbo].[${tabla}]`;
          
          // Agregar filtro si está activo
          if (listaData.FiltroActivo && listaData.FiltroCampoColumna && listaData.FiltroOperador && listaData.FiltroValor) {
            const operador = listaData.FiltroOperador;
            let valorFiltro = listaData.FiltroValor;
            
            // Si el campo de filtro es de tipo Lista, buscar el ID del valor
            if (listaData.FiltroCampoTipoDato === 'Lista' && listaData.FiltroCampoListaId) {
              const valorLista = await query(
                `SELECT Id FROM TD_VALORES_LISTA 
                 WHERE ListaId = @listaId AND Valor = @valor`,
                { 
                  listaId: listaData.FiltroCampoListaId,
                  valor: valorFiltro
                }
              );
              
              if (valorLista.length > 0) {
                valorFiltro = valorLista[0].Id.toString();
              } else {
                // Si no encuentra el valor, no aplicar filtro (retornar vacío)
                console.warn(`Valor "${valorFiltro}" no encontrado en lista ${listaData.FiltroCampoListaId}`);
                valores = [];
                return NextResponse.json<ApiResponse>({
                  success: true,
                  data: { ...listaData, Valores: valores },
                });
              }
            }
            
            if (operador === 'LIKE') {
              dynamicQuery += ` WHERE [${listaData.FiltroCampoColumna}] LIKE '%${valorFiltro}%'`;
            } else {
              // Para números, no usar comillas
              const esNumero = !isNaN(Number(valorFiltro));
              dynamicQuery += ` WHERE [${listaData.FiltroCampoColumna}] ${operador} ${esNumero ? valorFiltro : "'" + valorFiltro + "'"}`;
            }
          }

          dynamicQuery += ` ORDER BY [${campoValor}]`;

          try {
            valores = await query(dynamicQuery);
          } catch (err) {
            console.error('Error obteniendo valores dinámicos:', err);
            valores = [];
          }
        }
      }

      return NextResponse.json<ApiResponse>({
        success: true,
        data: { ...listaData, Valores: valores },
      });
    }

    // Obtener todas las listas
    const listas = await query(
      `SELECT l.*, 
              COUNT(v.Id) as CantidadValores,
              m.Nombre as ModuloOrigenNombre,
              cv.Nombre as CampoValorNombre
       FROM TD_LISTAS l
       LEFT JOIN TD_VALORES_LISTA v ON l.Id = v.ListaId AND v.Estado = 'Activo'
       LEFT JOIN TD_MODULOS m ON l.ModuloOrigenId = m.Id
       LEFT JOIN TD_CAMPOS cv ON l.CampoValorId = cv.Id
       GROUP BY l.Id, l.Nombre, l.Descripcion, l.Estado, l.TipoLista, 
                l.ModuloOrigenId, l.CampoValorId, l.FiltroActivo, 
                l.FiltroCampoId, l.FiltroOperador, l.FiltroValor,
                l.FechaCreacion, l.FechaModificacion, 
                l.UsuarioCreacion, l.UsuarioModificacion,
                m.Nombre, cv.Nombre
       ORDER BY l.Nombre`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: listas,
    });
  } catch (error: any) {
    console.error('Error obteniendo listas:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear lista
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body: any = await request.json();
    const { Nombre, Descripcion, Valores, TipoLista, ModuloOrigenId, CampoValorId, FiltroActivo, FiltroCampoId, FiltroOperador, FiltroValor } = body;

    if (!Nombre) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    // Validar campos según tipo de lista
    if (TipoLista === 'ValoresModulo') {
      if (!ModuloOrigenId || !CampoValorId) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'ModuloOrigenId y CampoValorId son requeridos para listas de módulo' },
          { status: 400 }
        );
      }
    }

    // Verificar si la lista ya existe
    const existente = await query(
      'SELECT Id FROM TD_LISTAS WHERE Nombre = @nombre',
      { nombre: Nombre }
    );

    if (existente.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'La lista ya existe' },
        { status: 400 }
      );
    }

    // Insertar lista
    const result = await execute(
      `INSERT INTO TD_LISTAS 
       (Nombre, Descripcion, TipoLista, ModuloOrigenId, CampoValorId, 
        FiltroActivo, FiltroCampoId, FiltroOperador, FiltroValor, UsuarioCreacion)
       OUTPUT INSERTED.Id
       VALUES (@nombre, @descripcion, @tipoLista, @moduloOrigenId, @campoValorId,
               @filtroActivo, @filtroCampoId, @filtroOperador, @filtroValor, @usuarioCreacion)`,
      {
        nombre: Nombre,
        descripcion: Descripcion || null,
        tipoLista: TipoLista || 'ValoresFijos',
        moduloOrigenId: ModuloOrigenId || null,
        campoValorId: CampoValorId || null,
        filtroActivo: FiltroActivo || false,
        filtroCampoId: FiltroCampoId || null,
        filtroOperador: FiltroOperador || null,
        filtroValor: FiltroValor || null,
        usuarioCreacion: user.usuario,
      }
    );

    const nuevaListaId = result.recordset[0].Id;

    // Insertar valores
    if (Valores && Valores.length > 0) {
      for (let i = 0; i < Valores.length; i++) {
        await execute(
          `INSERT INTO TD_VALORES_LISTA (ListaId, Valor, Orden, UsuarioCreacion)
           VALUES (@listaId, @valor, @orden, @usuarioCreacion)`,
          {
            listaId: nuevaListaId,
            valor: Valores[i].Valor,
            orden: Valores[i].Orden !== undefined ? Valores[i].Orden : i,
            usuarioCreacion: user.usuario,
          }
        );
      }
    }
    // Registrar traza
    await registrarTraza(
      user.userId,
      'Agregar',
      'Listas',
      `Lista creada: ${Nombre}`
    );
    return NextResponse.json<ApiResponse>({
      success: true,
      data: { Id: nuevaListaId },
      message: 'Lista creada exitosamente',
    });
  } catch (error: any) {
    console.error('Error creando lista:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar lista
export async function PUT(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ID de lista requerido' },
        { status: 400 }
      );
    }

    const body: any = await request.json();
    const { Nombre, Descripcion, Estado, Valores, TipoLista, ModuloOrigenId, CampoValorId, FiltroActivo, FiltroCampoId, FiltroOperador, FiltroValor } = body;

    // Construir lista de cambios para traza
    const cambios: string[] = [];
    if (Nombre) cambios.push(`Nombre: ${Nombre}`);
    if (Descripcion !== undefined) cambios.push('Descripción');
    if (Estado) cambios.push(`Estado: ${Estado}`);
    if (Valores) cambios.push('Valores');

    // Actualizar lista
    let updateQuery = 'UPDATE TD_LISTAS SET FechaModificacion = GETDATE(), UsuarioModificacion = @usuarioModificacion';
    const params: any = {
      id: parseInt(id),
      usuarioModificacion: user.usuario,
    };

    if (Nombre) {
      updateQuery += ', Nombre = @nombre';
      params.nombre = Nombre;
    }
    if (Descripcion !== undefined) {
      updateQuery += ', Descripcion = @descripcion';
      params.descripcion = Descripcion;
    }
    if (Estado) {
      updateQuery += ', Estado = @estado';
      params.estado = Estado;
    }
    if (TipoLista !== undefined) {
      updateQuery += ', TipoLista = @tipoLista';
      params.tipoLista = TipoLista;
    }
    if (ModuloOrigenId !== undefined) {
      updateQuery += ', ModuloOrigenId = @moduloOrigenId';
      params.moduloOrigenId = ModuloOrigenId;
    }
    if (CampoValorId !== undefined) {
      updateQuery += ', CampoValorId = @campoValorId';
      params.campoValorId = CampoValorId;
    }
    if (FiltroActivo !== undefined) {
      updateQuery += ', FiltroActivo = @filtroActivo';
      params.filtroActivo = FiltroActivo;
    }
    if (FiltroCampoId !== undefined) {
      updateQuery += ', FiltroCampoId = @filtroCampoId';
      params.filtroCampoId = FiltroCampoId;
    }
    if (FiltroOperador !== undefined) {
      updateQuery += ', FiltroOperador = @filtroOperador';
      params.filtroOperador = FiltroOperador;
    }
    if (FiltroValor !== undefined) {
      updateQuery += ', FiltroValor = @filtroValor';
      params.filtroValor = FiltroValor;
    }

    updateQuery += ' WHERE Id = @id';
    await execute(updateQuery, params);

    // Actualizar valores si se proporcionan
    if (Valores) {
      // Eliminar valores existentes
      await execute(
        'DELETE FROM TD_VALORES_LISTA WHERE ListaId = @listaId',
        { listaId: parseInt(id) }
      );

      // Insertar nuevos valores
      for (let i = 0; i < Valores.length; i++) {
        await execute(
          `INSERT INTO TD_VALORES_LISTA (ListaId, Valor, Orden, UsuarioCreacion)
           VALUES (@listaId, @valor, @orden, @usuarioCreacion)`,
          {
            listaId: parseInt(id),
            valor: Valores[i].Valor,
            orden: Valores[i].Orden !== undefined ? Valores[i].Orden : i,
            usuarioCreacion: user.usuario,
          }
        );
      }
    }
    // Registrar traza
    await registrarTraza(
      user.userId,
      'Modificar',
      'Listas',
      `Lista modificada (ID: ${id}). Cambios: ${cambios.join(', ')}`
    );
    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Lista actualizada exitosamente',
    });
  } catch (error: any) {
    console.error('Error actualizando lista:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar lista
export async function DELETE(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'ID de lista requerido' },
        { status: 400 }
      );
    }

    // Obtener nombre de la lista antes de eliminar
    const lista = await query(
      'SELECT Nombre FROM TD_LISTAS WHERE Id = @id',
      { id: parseInt(id) }
    );

    if (lista.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Lista no encontrada' },
        { status: 404 }
      );
    }

    const nombreLista = lista[0].Nombre;

    // Verificar si la lista está siendo usada en campos
    const usada = await query(
      'SELECT COUNT(*) as Cuenta FROM TD_CAMPOS WHERE ListaId = @listaId',
      { listaId: parseInt(id) }
    );

    if (usada[0].Cuenta > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'La lista está siendo usada en módulos' },
        { status: 400 }
      );
    }

    await execute('DELETE FROM TD_LISTAS WHERE Id = @id', {
      id: parseInt(id),
    });

    // Registrar traza
    await registrarTraza(
      user.userId,
      'Eliminar',
      'Listas',
      `Lista eliminada: ${nombreLista}`
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Lista eliminada exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando lista:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}
