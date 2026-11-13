// =================================
// SLAYERS RBSN — SISTEMA DE INVENTARIO
// =================================

const {
  normalizarPerfil,
  agregarExperiencia,
  NIVEL_MAXIMO
} = require("./perfil");

// =================================
// EXPERIENCIA DE LAS ESENCIAS
// =================================

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

// =================================
// PREPARAR INVENTARIO
// =================================

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

  if (
    !perfil.inventario.materiales ||
    typeof perfil.inventario.materiales !== "object" ||
    Array.isArray(perfil.inventario.materiales)
  ) {
    perfil.inventario.materiales = {};
  }
}

// =================================
// AGREGAR ESENCIAS
// =================================

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

// =================================
// USAR ESENCIAS
// =================================

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

// =================================
// AGREGAR OBJETO
// =================================

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
      ...objeto,
      cantidad
    });
  }

  return {
    correcto: true,
    mensaje: `${cantidad}x ${objeto.nombre} agregado al inventario.`
  };
}

// =================================
// QUITAR OBJETO
// =================================

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

// =================================
// AGREGAR MATERIAL
// =================================

function agregarMaterial(perfil, material, cantidad = 1) {
  if (
    !perfil ||
    !material ||
    !material.id ||
    !material.nombre
  ) {
    return {
      correcto: false,
      mensaje: "Datos del material inválidos."
    };
  }

  prepararInventario(perfil);

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "La cantidad debe ser positiva."
    };
  }

  const materiales = perfil.inventario.materiales;

  const actual =
    Number(materiales[material.id]?.cantidad) || 0;

  if (!Number.isSafeInteger(actual + cantidad)) {
    return {
      correcto: false,
      mensaje: "Se alcanzó el límite de materiales."
    };
  }

  materiales[material.id] = {
    id: material.id,
    nombre: material.nombre,
    descripcion: material.descripcion || "",
    cantidad: actual + cantidad
  };

  return {
    correcto: true,
    cantidad: materiales[material.id].cantidad,
    mensaje: `⚒️ ${material.nombre} x${cantidad} agregado al inventario.`
  };
}

// =================================
// QUITAR MATERIAL
// =================================

function quitarMaterial(perfil, materialId, cantidad = 1) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  prepararInventario(perfil);

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "Cantidad inválida."
    };
  }

  const materiales = perfil.inventario.materiales;
  const material = materiales[materialId];

  if (!material || material.cantidad < cantidad) {
    return {
      correcto: false,
      mensaje: "No tenés suficientes materiales."
    };
  }

  material.cantidad -= cantidad;

  if (material.cantidad === 0) {
    delete materiales[materialId];
  }

  return {
    correcto: true,
    mensaje: `Se utilizaron ${cantidad}x ${material.nombre}.`
  };
}

// =================================
// CONSULTAR MATERIALES
// =================================

function mostrarMateriales(perfil) {
  if (!perfil) {
    return "❌ No se encontró el perfil.";
  }

  prepararInventario(perfil);

  const materiales = Object.values(
    perfil.inventario.materiales
  );

  const disponibles = materiales.filter(
    material => material.cantidad > 0
  );

  if (disponibles.length === 0) {
    return "⚒️ Todavía no tenés materiales de fabricación.";
  }

  return disponibles
    .map(material =>
      `• ${material.nombre}: x${material.cantidad}`
    )
    .join("\n");
}

// =================================
// IDENTIFICAR TIPO DE OBJETO
// =================================

function obtenerTipoObjeto(objeto) {
  const tipo = String(objeto.tipo || "").toLowerCase();

  if (tipo.includes("arma")) {
    return "arma";
  }

  if (
    tipo.includes("armadura") ||
    tipo.includes("proteccion")
  ) {
    return "armadura";
  }

  return tipo;
}

// =================================
// CONSULTAR OBJETOS UTILIZABLES
// =================================

function mostrarUsables(perfil) {
  if (!perfil) {
    return "❌ No se encontró el perfil.";
  }

  prepararInventario(perfil);

  const esencias = perfil.inventario.esencias;
  const objetos = perfil.inventario.objetos;

  const lineas = [];

  lineas.push("✨ ESENCIAS");

  for (const [rareza, datos] of Object.entries(ESENCIAS)) {
    const cantidad = esencias[rareza] || 0;

    if (cantidad > 0) {
      lineas.push(
        `• ${datos.nombre} x${cantidad}\n` +
        `  Comando: &usar:esencia:${rareza}`
      );
    }
  }

  const usables = objetos.filter(objeto => {
    const tipo = obtenerTipoObjeto(objeto);

    return (
      objeto.usable === true ||
      tipo === "consumible" ||
      tipo === "usable"
    );
  });

  if (usables.length > 0) {
    lineas.push("\n📦 OBJETOS UTILIZABLES");

    for (const objeto of usables) {
      lineas.push(
        `• ${objeto.nombre} x${objeto.cantidad}\n` +
        `  Comando: &usar:${objeto.id}`
      );
    }
  }

  const tieneEsencias =
    Object.values(esencias).some(cantidad => cantidad > 0);

  if (!tieneEsencias && usables.length === 0) {
    return "🎒 No tenés objetos ni esencias utilizables.";
  }

  return (
    "✨ OBJETOS UTILIZABLES — SLAYERS RBSN\n\n" +
    lineas.join("\n")
  );
}

// =================================
// CONSULTAR INVENTARIO
// =================================

function mostrarInventario(perfil) {
  if (!perfil) {
    return "❌ No se encontró el perfil.";
  }

  prepararInventario(perfil);

  const esencias = perfil.inventario.esencias;
  const objetos = perfil.inventario.objetos;

  const listaObjetos = objetos.length > 0
    ? objetos.map((objeto, indice) => {
        const tipo = obtenerTipoObjeto(objeto);

        let comando = "";

        if (
          tipo === "arma" ||
          tipo === "armadura"
        ) {
          comando =
            `⚔️ Equipar: &equipar:${tipo}:${objeto.id}`;
        } else if (
          objeto.usable === true ||
          tipo === "consumible" ||
          tipo === "usable"
        ) {
          comando =
            `✨ Usar: &usar:${objeto.id}`;
        } else {
          comando = "📦 Objeto sin comando de uso.";
        }

        return (
          `${indice + 1}. ${objeto.nombre} x${objeto.cantidad}\n` +
          `   📦 Tipo: ${objeto.tipo || "objeto"}\n` +
          `   📝 ${objeto.descripcion || "Sin descripción."}\n` +
          `   ${comando}`
        );
      }).join("\n\n")
    : "No tenés objetos.";

  const listaMateriales = mostrarMateriales(perfil);

  return (
    `🎒 SLAYERS RBSN — INVENTARIO\n\n` +
    `👤 Jugador: ${perfil.nombre}\n\n` +

    `✨ ESENCIAS\n` +
    `⚪ Normales: ${esencias.normal}\n` +
    `🟣 Épicas: ${esencias.epica}\n` +
    `🟡 Legendarias: ${esencias.legendaria}\n\n` +

    `⚒️ MATERIALES DE FABRICACIÓN\n` +
    `${listaMateriales}\n\n` +

    `📦 OBJETOS\n` +
    `${listaObjetos}\n\n` +

    `━━━━━━━━━━━━━━━━━━\n` +
    `📦 Objetos diferentes: ${objetos.length}\n` +
    `⚒️ Materiales diferentes: ${Object.keys(perfil.inventario.materiales).length}\n\n` +

    `✨ Para ver lo que podés utilizar: &usar`
  );
}

// =================================
// BUSCAR OBJETO
// =================================

function buscarObjeto(perfil, objetoId) {
  if (!perfil) return null;

  prepararInventario(perfil);

  return perfil.inventario.objetos.find(
    objeto => objeto.id === objetoId
  ) || null;
}

// =================================
// BUSCAR MATERIAL
// =================================

function buscarMaterial(perfil, materialId) {
  if (!perfil) return null;

  prepararInventario(perfil);

  return perfil.inventario.materiales[materialId] || null;
}

// =================================
// EXPORTAR FUNCIONES
// =================================

module.exports = {
  ESENCIAS,

  agregarEsencia,
  usarEsencia,

  agregarObjeto,
  quitarObjeto,
  buscarObjeto,

  agregarMaterial,
  quitarMaterial,
  mostrarMateriales,
  buscarMaterial,

  mostrarUsables,
  mostrarInventario
};
