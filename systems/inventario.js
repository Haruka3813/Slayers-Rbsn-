// =================================
// SLAYERS RBSN — SISTEMA DE INVENTARIO
// =================================

const {
  normalizarPerfil,
  agregarExperiencia,
  NIVEL_MAXIMO
} = require("./perfil");

// EXPERIENCIA DE LAS ESENCIAS
const ESENCIAS = {
  normal: {
    nombre: "Esencia normal ⚪",
    experiencia: 100
  },
  epica: {
    nombre: "Esencia épica 🟣",
    experiencia: 500
  },
  legendaria: {
    nombre: "Esencia legendaria 🟡",
    experiencia: 2000
  }
};

// PREPARAR INVENTARIO
function prepararInventario(perfil) {
  normalizarPerfil(perfil);

  if (!perfil.inventario.esencias) {
    perfil.inventario.esencias = {
      normal: 0,
      epica: 0,
      legendaria: 0
    };
  }

  if (!Array.isArray(perfil.inventario.objetos)) {
    perfil.inventario.objetos = [];
  }
}

// AGREGAR ESENCIAS
function agregarEsencia(perfil, rareza, cantidad = 1) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  prepararInventario(perfil);

  if (!ESENCIAS[rareza]) {
    return {
      correcto: false,
      mensaje: "Rareza de esencia inválida."
    };
  }

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "Cantidad inválida."
    };
  }

  const actual = perfil.inventario.esencias[rareza];

  if (!Number.isSafeInteger(actual + cantidad)) {
    return {
      correcto: false,
      mensaje: "Se alcanzó el límite de esencias."
    };
  }

  perfil.inventario.esencias[rareza] += cantidad;

  return {
    correcto: true,
    mensaje: `${ESENCIAS[rareza].nombre} x${cantidad} agregado al inventario.`,
    cantidad: perfil.inventario.esencias[rareza]
  };
}

// USAR ESENCIAS
function usarEsencia(perfil, rareza, cantidad = 1) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  prepararInventario(perfil);

  if (!ESENCIAS[rareza]) {
    return {
      correcto: false,
      mensaje: "Esencia inválida."
    };
  }

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "Cantidad inválida."
    };
  }

  const disponibles = perfil.inventario.esencias[rareza];

  if (disponibles < cantidad) {
    return {
      correcto: false,
      mensaje: `Solo tenés ${disponibles} esencias de esa rareza.`
    };
  }

  if (perfil.nivel >= NIVEL_MAXIMO) {
    return {
      correcto: false,
      mensaje: "Ya alcanzaste el nivel máximo 500."
    };
  }

  const experienciaTotal =
    ESENCIAS[rareza].experiencia * cantidad;

  const resultado = agregarExperiencia(
    perfil,
    experienciaTotal
  );

  if (!resultado || !resultado.perfil) {
    return {
      correcto: false,
      mensaje: "No se pudo procesar la experiencia."
    };
  }

  perfil.inventario.esencias[rareza] -= cantidad;

  return {
    correcto: true,
    experiencia: experienciaTotal,
    nivelesGanados: resultado.nivelesGanados,
    nivel: perfil.nivel,
    experienciaActual: perfil.experiencia,
    mensaje:
      `✨ Usaste ${cantidad} ${ESENCIAS[rareza].nombre}.\n` +
      `⭐ Experiencia obtenida: ${experienciaTotal} XP.\n` +
      `📈 Nivel actual: ${perfil.nivel}.` +
      (
        resultado.nivelesGanados > 0
          ? `\n🎉 ¡Subiste ${resultado.nivelesGanados} nivel(es)!`
          : ""
      )
  };
}

// AGREGAR OBJETO
function agregarObjeto(perfil, objeto, cantidad = 1) {
  if (!perfil || !objeto || !objeto.id || !objeto.nombre) {
    return {
      correcto: false,
      mensaje: "Datos del objeto inválidos."
    };
  }

  prepararInventario(perfil);

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "La cantidad debe ser positiva."
    };
  }

  const inventario = perfil.inventario.objetos;

  const existente = inventario.find(
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
    inventario.push({
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
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "Inventario inexistente."
    };
  }

  prepararInventario(perfil);

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "Cantidad inválida."
    };
  }

  const inventario = perfil.inventario.objetos;

  const indice = inventario.findIndex(
    item => item.id === objetoId
  );

  if (indice === -1) {
    return {
      correcto: false,
      mensaje: "No tenés ese objeto."
    };
  }

  const objeto = inventario[indice];

  if (objeto.cantidad < cantidad) {
    return {
      correcto: false,
      mensaje: "No tenés suficientes unidades."
    };
  }

  objeto.cantidad -= cantidad;

  if (objeto.cantidad === 0) {
    inventario.splice(indice, 1);
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

  prepararInventario(perfil);

  const esencias = perfil.inventario.esencias;
  const objetos = perfil.inventario.objetos;

  const listaObjetos = objetos.length > 0
    ? objetos.map((objeto, indice) =>
        `${indice + 1}. ${objeto.nombre} x${objeto.cantidad}\n` +
        `   📦 Tipo: ${objeto.tipo}\n` +
        `   📝 ${objeto.descripcion}`
      ).join("\n\n")
    : "No tenés objetos.";

  return `🎒 SLAYERS RBSN — INVENTARIO

👤 Jugador: ${perfil.nombre}

✨ ESENCIAS

⚪ Normales: ${esencias.normal}
🟣 Épicas: ${esencias.epica}
🟡 Legendarias: ${esencias.legendaria}

📦 OBJETOS

${listaObjetos}

━━━━━━━━━━━━━━
📦 Objetos diferentes: ${objetos.length}`;
}

// BUSCAR OBJETO
function buscarObjeto(perfil, objetoId) {
  if (!perfil) return null;

  prepararInventario(perfil);

  return perfil.inventario.objetos.find(
    objeto => objeto.id === objetoId
  ) || null;
}

// EXPORTAR FUNCIONES
module.exports = {
  ESENCIAS,
  agregarEsencia,
  usarEsencia,
  agregarObjeto,
  quitarObjeto,
  mostrarInventario,
  buscarObjeto
};
