// =============================================
// HERRERÍA - SLAYERS RBSN
// =============================================

const {
  agregarObjeto,
  quitarMaterial
} = require("./inventario");

// =============================================
// ELEMENTOS
// =============================================

const ELEMENTOS = [
  { id: "fuego", nombre: "Fuego", emoji: "🔥" },
  { id: "metal", nombre: "Metal", emoji: "⚙️" },
  { id: "rayo", nombre: "Rayo", emoji: "⚡" },
  { id: "viento", nombre: "Viento", emoji: "🌪️" },
  { id: "tierra", nombre: "Tierra", emoji: "🌍" },
  { id: "oscuridad", nombre: "Oscuridad", emoji: "🌑" },
  { id: "hielo", nombre: "Hielo", emoji: "❄️" },
  { id: "agua", nombre: "Agua", emoji: "💧" },
  { id: "luz", nombre: "Luz", emoji: "✨" },
  { id: "naturaleza", nombre: "Naturaleza", emoji: "🌿" },
  { id: "veneno", nombre: "Veneno", emoji: "☠️" }
];

// =============================================
// RAREZAS Y RANGOS
// =============================================

const RAREZAS = [
  {
    id: "normal",
    nombre: "Normal",
    multiplicador: 1,
    nivel: 1,
    mineral: "mineral_hierro",
    cantidad: 5
  },
  {
    id: "raro",
    nombre: "Raro",
    multiplicador: 2,
    nivel: 25,
    mineral: "mineral_plata",
    cantidad: 10
  },
  {
    id: "epico",
    nombre: "Épico",
    multiplicador: 4,
    nivel: 75,
    mineral: "mineral_oro",
    cantidad: 15
  },
  {
    id: "legendario",
    nombre: "Legendario",
    multiplicador: 8,
    nivel: 150,
    mineral: "cristal_arcano",
    cantidad: 20
  }
];

const RANGOS_UR = [
  {
    id: "basico",
    nombre: "UR Básico",
    multiplicador: 12,
    nivel: 200,
    mineral: "mineral_oro",
    cantidad: 25
  },
  {
    id: "intermedio",
    nombre: "UR Intermedio",
    multiplicador: 18,
    nivel: 300,
    mineral: "cristal_arcano",
    cantidad: 35
  },
  {
    id: "supremo",
    nombre: "UR Supremo",
    multiplicador: 25,
    nivel: 400,
    mineral: "nucleo_elemental",
    cantidad: 50
  }
];

// =============================================
// CATÁLOGO DE ARMAS Y ARMADURAS
// =============================================

const CATALOGO = [];

function crearId(tipo, elemento, rareza) {
  return `${tipo}_${elemento}_${rareza}`;
}

function nombreEquipo(tipo, elemento, rareza) {
  const nombres = {
    arma: "Espada",
    armadura: "Armadura"
  };

  return `${nombres[tipo]} ${elemento.nombre} ${rareza.nombre}`;
}

function crearReceta(datos, tipo) {
  const materiales = [
    {
      id: datos.mineral,
      cantidad: datos.cantidad
    },
    {
      id: "piel_monstruosa",
      cantidad: Math.max(2, Math.floor(datos.cantidad / 2))
    },
    {
      id: "colmillo",
      cantidad: Math.max(1, Math.floor(datos.cantidad / 3))
    }
  ];

  if (datos.multiplicador >= 8) {
    materiales.push({
      id: "fragmento_elemental",
      cantidad: Math.max(1, Math.floor(datos.multiplicador / 4))
    });
  }

  if (tipo === "armadura") {
    materiales.push({
      id: "hueso",
      cantidad: Math.max(2, Math.floor(datos.cantidad / 2))
    });
  } else {
    materiales.push({
      id: "garra",
      cantidad: Math.max(1, Math.floor(datos.cantidad / 3))
    });
  }

  return materiales;
}

function agregarEquipo(tipo, elemento, datos, esUR = false) {
  const id = crearId(tipo, elemento.id, datos.id);

  const base = tipo === "arma" ? 10 : 8;

  const bonificacion = Math.floor(
    base * datos.multiplicador
  );

  const objeto = {
    id,
    nombre: nombreEquipo(tipo, elemento, datos),
    tipo,
    elemento: elemento.id,
    elementoNombre: elemento.nombre,
    rareza: datos.id,
    rarezaNombre: datos.nombre,
    esUR,
    nivelRequerido: datos.nivel,
    ataque: tipo === "arma" ? bonificacion : 0,
    defensa: tipo === "armadura" ? bonificacion : 0,
    estadisticas: {
      ataque: tipo === "arma" ? bonificacion : 0,
      defensa: tipo === "armadura" ? bonificacion : 0
    },
    receta: crearReceta(datos, tipo),
    cantidad: 1
  };

  CATALOGO.push(objeto);
}

// Crear las 4 rarezas normales

for (const elemento of ELEMENTOS) {
  for (const rareza of RAREZAS) {
    agregarEquipo("arma", elemento, rareza);
    agregarEquipo("armadura", elemento, rareza);
  }

  // Crear los 3 rangos UR

  for (const rango of RANGOS_UR) {
    agregarEquipo("arma", elemento, rango, true);
    agregarEquipo("armadura", elemento, rango, true);
  }
}

// =============================================
// ESPADA COMÚN DEL COMANDO OCULTO MATE
// =============================================

const ESPADA_COMUN = {
  id: "espada_comun",
  nombre: "Espada común",
  tipo: "arma",
  elemento: "metal",
  elementoNombre: "Metal",
  rareza: "normal",
  rarezaNombre: "Normal",
  esUR: false,
  nivelRequerido: 1,
  ataque: 5,
  defensa: 0,
  estadisticas: {
    ataque: 5,
    defensa: 0
  },
  receta: [],
  cantidad: 1
};

// =============================================
// MOSTRAR HERRERÍA
// =============================================

function mostrarHerreria(perfil) {
  const nivel = Number(perfil.nivel) || 1;

  let texto =
    "⚒️ HERRERÍA DE SLAYERS RBSN ⚒️\n\n" +
    "Fabricá armas y armaduras para aumentar tus atributos.\n\n" +
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "📜 RAREZAS DISPONIBLES\n\n";

  for (const rareza of RAREZAS) {
    texto +=
      `⚔️ ${rareza.nombre}\n` +
      `Nivel requerido: ${rareza.nivel}\n\n`;
  }

  texto +=
    "━━━━━━━━━━━━━━━━━━━━\n" +
    "🌟 EQUIPAMIENTO UR\n\n";

  for (const rango of RANGOS_UR) {
    texto +=
      `💠 ${rango.nombre}\n` +
      `Nivel requerido: ${rango.nivel}\n\n`;
  }

  texto +=
    "━━━━━━━━━━━━━━━━━━━━\n" +
    `🧙 Tu nivel: ${nivel}\n\n` +
    "COMANDOS:\n" +
    "&herrero:armas\n" +
    "&herrero:armaduras\n" +
    "&herrero:buscar:id\n" +
    "&fabricar:id\n" +
    "&equipar:arma:id\n" +
    "&equipar:armadura:id\n" +
    "&desequipar:arma\n" +
    "&desequipar:armadura\n\n" +
    "Usá los comandos para consultar y fabricar equipamiento.";

  return texto;
}

// =============================================
// LISTAR EQUIPAMIENTO
// =============================================

function listarEquipamiento(tipo, perfil) {
  if (!["arma", "armadura"].includes(tipo)) {
    return "❌ Tipo de equipamiento inválido.";
  }

  const nivel = Number(perfil.nivel) || 1;

  const objetos = CATALOGO.filter(
    objeto => objeto.tipo === tipo
  );

  let texto =
    `⚒️ CATÁLOGO DE ${tipo.toUpperCase()}S\n\n`;

  for (const objeto of objetos) {
    const disponible = nivel >= objeto.nivelRequerido;

    texto +=
      `${objeto.nombre}\n` +
      `ID: ${objeto.id}\n` +
      `Nivel: ${objeto.nivelRequerido}\n`;

    if (tipo === "arma") {
      texto += `⚔️ Ataque: +${objeto.ataque}\n`;
    } else {
      texto += `🛡️ Defensa: +${objeto.defensa}\n`;
    }

    texto +=
      `Estado: ${disponible ? "Disponible" : "Bloqueado"}\n\n`;
  }

  return texto;
}

// =============================================
// BUSCAR OBJETO
// =============================================

function buscarEquipo(id) {
  if (!id) return null;

  const identificador = String(id).toLowerCase();

  if (identificador === ESPADA_COMUN.id) {
    return ESPADA_COMUN;
  }

  return CATALOGO.find(
    objeto => objeto.id === identificador
  ) || null;
}

// =============================================
// CONSULTAR RECETA
// =============================================

function consultarReceta(id) {
  const objeto = buscarEquipo(id);

  if (!objeto) {
    return {
      correcto: false,
      mensaje: "No existe ese equipamiento."
    };
  }

  let texto =
    `⚒️ RECETA: ${objeto.nombre}\n\n` +
    `⭐ Nivel requerido: ${objeto.nivelRequerido}\n\n` +
    "📦 Materiales necesarios:\n";

  if (objeto.receta.length === 0) {
    texto += "No necesita materiales de fabricación.\n";
  } else {
    for (const material of objeto.receta) {
      texto +=
        `• ${material.id}: ${material.cantidad}\n`;
    }
  }

  texto +=
    `\n⚔️ Ataque: +${objeto.ataque}\n` +
    `🛡️ Defensa: +${objeto.defensa}\n\n` +
    `Para fabricarlo usá:\n&fabricar:${objeto.id}`;

  return {
    correcto: true,
    mensaje: texto,
    objeto
  };
}

// =============================================
// COMPROBAR MATERIALES
// =============================================

function comprobarMateriales(perfil, receta) {
  const materiales = perfil.inventario?.materiales || {};

  for (const requerido of receta) {
    const disponible = materiales[requerido.id];

    const cantidad = typeof disponible === "object"
      ? Number(disponible.cantidad) || 0
      : Number(disponible) || 0;

    if (cantidad < requerido.cantidad) {
      return {
        correcto: false,
        material: requerido.id,
        necesario: requerido.cantidad,
        disponible: cantidad
      };
    }
  }

  return { correcto: true };
}

// =============================================
// FABRICAR EQUIPAMIENTO
// =============================================

function fabricarEquipo(perfil, id) {
  const objeto = buscarEquipo(id);

  if (!objeto) {
    return {
      correcto: false,
      mensaje: "❌ No existe ese equipamiento."
    };
  }

  const nivel = Number(perfil.nivel) || 1;

  if (nivel < objeto.nivelRequerido) {
    return {
      correcto: false,
      mensaje:
        `❌ Necesitás nivel ${objeto.nivelRequerido} para fabricar ${objeto.nombre}.`
    };
  }

  perfil.inventario = perfil.inventario || {};
  perfil.inventario.objetos = perfil.inventario.objetos || [];
  perfil.inventario.materiales = perfil.inventario.materiales || {};

  const yaExiste = perfil.inventario.objetos.find(
    item => item.id === objeto.id
  );

  if (yaExiste) {
    return {
      correcto: false,
      mensaje: "❌ Ya tenés este equipamiento en tu inventario."
    };
  }

  const comprobacion = comprobarMateriales(
    perfil,
    objeto.receta
  );

  if (!comprobacion.correcto) {
    return {
      correcto: false,
      mensaje:
        `❌ Material insuficiente: ${comprobacion.material}\n` +
        `Necesitás: ${comprobacion.necesario}\n` +
        `Tenés: ${comprobacion.disponible}`
    };
  }

  for (const material of objeto.receta) {
    const resultado = quitarMaterial(
      perfil,
      material.id,
      material.cantidad
    );

    if (!resultado || resultado.correcto === false) {
      return {
        correcto: false,
        mensaje: "❌ No se pudieron consumir los materiales."
      };
    }
  }

  agregarObjeto(perfil, {
    ...objeto,
    receta: objeto.receta.map(item => ({ ...item }))
  });

  return {
    correcto: true,
    objeto,
    mensaje:
      `⚒️ ¡FABRICACIÓN COMPLETADA!\n\n` +
      `${objeto.nombre}\n\n` +
      `⚔️ Ataque: +${objeto.ataque}\n` +
      `🛡️ Defensa: +${objeto.defensa}\n\n` +
      "El equipamiento fue guardado en tu inventario.\n" +
      `Usá &equipar:${objeto.tipo}:${objeto.id} para utilizarlo.`
  };
}

// =============================================
// EQUIPAR ARMA O ARMADURA
// =============================================

function equiparEquipo(perfil, tipo, id) {
  if (!["arma", "armadura"].includes(tipo)) {
    return {
      correcto: false,
      mensaje: "❌ Tipo inválido. Usá arma o armadura."
    };
  }

  const objeto = buscarEquipo(id);

  if (!objeto || objeto.tipo !== tipo) {
    return {
      correcto: false,
      mensaje: "❌ Ese equipamiento no existe."
    };
  }

  const nivel = Number(perfil.nivel) || 1;

  if (nivel < objeto.nivelRequerido) {
    return {
      correcto: false,
      mensaje:
        `❌ Necesitás nivel ${objeto.nivelRequerido} para equiparlo.`
    };
  }

  const inventario = perfil.inventario?.objetos || [];

  const disponible = inventario.find(
    item => item.id === objeto.id && (Number(item.cantidad) || 0) > 0
  );

  if (!disponible) {
    return {
      correcto: false,
      mensaje: "❌ No tenés ese objeto en tu inventario."
    };
  }

  perfil.equipamiento = perfil.equipamiento || {
    arma: null,
    armadura: null
  };

  perfil.equipamiento[tipo] = {
    ...objeto
  };

  return {
    correcto: true,
    mensaje:
      `✅ ¡EQUIPAMIENTO COLOCADO!\n\n` +
      `${objeto.nombre}\n\n` +
      `⚔️ Ataque: +${objeto.ataque}\n` +
      `🛡️ Defensa: +${objeto.defensa}`
  };
}

// =============================================
// DESEQUIPAR
// =============================================

function desequiparEquipo(perfil, tipo) {
  if (!["arma", "armadura"].includes(tipo)) {
    return {
      correcto: false,
      mensaje: "❌ Tipo inválido."
    };
  }

  perfil.equipamiento = perfil.equipamiento || {
    arma: null,
    armadura: null
  };

  if (!perfil.equipamiento[tipo]) {
    return {
      correcto: false,
      mensaje: "No tenés ningún objeto equipado en ese espacio."
    };
  }

  const nombre = perfil.equipamiento[tipo].nombre;

  perfil.equipamiento[tipo] = null;

  return {
    correcto: true,
    mensaje:
      `✅ ${nombre} fue desequipado correctamente.`
  };
}

// =============================================
// ESPADA DEL COMANDO MATE
// =============================================

function obtenerEspadaMate() {
  return {
    ...ESPADA_COMUN
  };
}

// =============================================
// EXPORTACIONES
// =============================================

module.exports = {
  ELEMENTOS,
  RAREZAS,
  RANGOS_UR,
  CATALOGO,
  ESPADA_COMUN,

  mostrarHerreria,
  listarEquipamiento,
  buscarEquipo,
  consultarReceta,
  fabricarEquipo,
  equiparEquipo,
  desequiparEquipo,
  obtenerEspadaMate
};
