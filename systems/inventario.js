// =================================
// SLAYERS RBSN — SISTEMA DE INVENTARIO
// =================================

// AGREGAR OBJETO
function agregarObjeto(perfil, objeto, cantidad = 1) {
  if (!perfil || !objeto || !objeto.id || !objeto.nombre) {
    return {
      correcto: false,
      mensaje: "Datos del objeto inválidos."
    };
  }

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "La cantidad debe ser positiva."
    };
  }

  if (!Array.isArray(perfil.inventario)) {
    perfil.inventario = [];
  }

  const existente = perfil.inventario.find(
    item => item.id === objeto.id
  );

  if (existente) {
    if (!Number.isSafeInteger(existente.cantidad + cantidad)) {
      return {
        correcto: false,
        mensaje: "Se alcanzó el límite de objetos."
      };
    }

    existente.cantidad += cantidad;
  } else {
    perfil.inventario.push({
      id: objeto.id,
      nombre: objeto.nombre,
      tipo: objeto.tipo || "objeto",
      descripcion: objeto.descripcion || "Sin descripción.",
      cantidad
    });
  }

  return {
    correcto: true,
    mensaje: `${cantidad}x ${objeto.nombre} agregado al inventario.`
  };
}

// QUITAR OBJETO
function quitarObjeto(perfil, objetoId, cantidad = 1) {
  if (!perfil || !Array.isArray(perfil.inventario)) {
    return {
      correcto: false,
      mensaje: "Inventario inexistente."
    };
  }

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "Cantidad inválida."
    };
  }

  const indice = perfil.inventario.findIndex(
    item => item.id === objetoId
  );

  if (indice === -1) {
    return {
      correcto: false,
      mensaje: "No tenés ese objeto."
    };
  }

  const objeto = perfil.inventario[indice];

  if (objeto.cantidad < cantidad) {
    return {
      correcto: false,
      mensaje: "No tenés suficientes unidades."
    };
  }

  objeto.cantidad -= cantidad;

  if (objeto.cantidad === 0) {
    perfil.inventario.splice(indice, 1);
  }

  return {
    correcto: true,
    mensaje: `${cantidad}x ${objeto.nombre} eliminado del inventario.`
  };
}

// CONSULTAR INVENTARIO
function mostrarInventario(perfil) {
  if (!perfil) {
    return "❌ No se encontró el perfil.";
  }

  if (!Array.isArray(perfil.inventario) ||
      perfil.inventario.length === 0) {
    return `🎒 SLAYERS RBSN — INVENTARIO

👤 Jugador: ${perfil.nombre}

Tu inventario está vacío.`;
  }

  const objetos = perfil.inventario.map(
    (objeto, indice) =>
      `${indice + 1}. ${objeto.nombre} x${objeto.cantidad}\n` +
      `   📦 Tipo: ${objeto.tipo}\n` +
      `   📝 ${objeto.descripcion}`
  );

  return `🎒 SLAYERS RBSN — INVENTARIO

👤 Jugador: ${perfil.nombre}

${objetos.join("\n\n")}

━━━━━━━━━━━━━━
📦 Tipos de objetos: ${perfil.inventario.length}`;
}

// BUSCAR OBJETO
function buscarObjeto(perfil, objetoId) {
  if (!perfil || !Array.isArray(perfil.inventario)) {
    return null;
  }

  return perfil.inventario.find(
    objeto => objeto.id === objetoId
  ) || null;
}

// EXPORTAR FUNCIONES
module.exports = {
  agregarObjeto,
  quitarObjeto,
  mostrarInventario,
  buscarObjeto
};
