// =================================
// SLAYERS RBSN — SISTEMA DE PERFILES
// =================================

const NIVEL_MAXIMO = 500;

const VIDA_INICIAL = 100;
const VIDA_POR_NIVEL = 10;

const ATAQUE_INICIAL = 10;
const ATAQUE_POR_NIVEL = 2;

const DEFENSA_INICIAL = 5;
const DEFENSA_POR_NIVEL = 1;

const TIEMPO_REGENERACION_VIDA = 1800;

// =================================
// CONFIGURACIÓN DE LA MINA
// =================================

const INTENTOS_MINA_MAXIMOS = 3;
const TIEMPO_RECARGA_MINA = 5 * 60 * 1000;

// =================================
// ELEMENTOS DISPONIBLES
// =================================

const ELEMENTOS_DISPONIBLES = [
  { id: "fuego", nombre: "🔥 Fuego" },
  { id: "metal", nombre: "⚙️ Metal" },
  { id: "rayo", nombre: "⚡ Rayo" },
  { id: "viento", nombre: "🌪️ Viento" },
  { id: "tierra", nombre: "🌍 Tierra" },
  { id: "oscuridad", nombre: "🌑 Oscuridad" },
  { id: "hielo", nombre: "❄️ Hielo" },
  { id: "agua", nombre: "💧 Agua" },
  { id: "luz", nombre: "✨ Luz" },
  { id: "naturaleza", nombre: "🌿 Naturaleza" },
  { id: "veneno", nombre: "☠️ Veneno" }
];

// =================================
// MULTIPLICADOR POR RENACIMIENTO
// =================================

function multiplicadorRenacimiento(perfil) {
  const renacimientos = Math.max(
    0,
    Number(perfil.renacer) || 0
  );

  return Math.pow(2, renacimientos);
}

// =================================
// CREAR PERFIL
// =================================

function crearPerfil(userId, username) {
  return {
    id: userId,
    nombre: username || "Jugador",

    nivel: 1,
    experiencia: 0,

    renacer: 0,
    renacerPendiente: false,

    rubies: 0,
    banco: 0,
    reserva: 0,

    estadisticas: {
      vida: VIDA_INICIAL,
      vidaMaxima: VIDA_INICIAL,
      ataque: ATAQUE_INICIAL,
      defensa: DEFENSA_INICIAL,

      victorias: 0,
      derrotas: 0,

      combatesGanados: 0,
      combatesPerdidos: 0,

      monstruosDerrotados: 0,
      bossesDerrotados: 0,

      rubiesObtenidos: 0
    },

    regeneracion: {
      ultimaActualizacion: Date.now(),
      bloqueadaHasta: 0
    },

    elementos: {
      primero: null,
      segundo: null,
      adicionales: []
    },

    inventario: {
      esencias: {
        normal: 0,
        epica: 0,
        legendaria: 0
      },
      objetos: []
    },

    equipamiento: {
      armadura: null
    },

    mina: {
      nivel: 1,
      rubiesPendientes: 0,
      intentos: INTENTOS_MINA_MAXIMOS,
      ultimaRecarga: Date.now()
    },

    fechaCreacion: new Date().toISOString()
  };
}

// =================================
// EXPERIENCIA NECESARIA
// =================================

function experienciaNecesaria(nivel) {
  if (nivel >= NIVEL_MAXIMO) {
    return 0;
  }

  return 100 * Math.pow(2, nivel - 1);
}

// =================================
// ESTADÍSTICAS BASE
// =================================

function vidaMaxima(nivel) {
  return VIDA_INICIAL +
    ((nivel - 1) * VIDA_POR_NIVEL);
}

function ataquePorNivel(nivel) {
  return ATAQUE_INICIAL +
    ((nivel - 1) * ATAQUE_POR_NIVEL);
}

function defensaPorNivel(nivel) {
  return DEFENSA_INICIAL +
    ((nivel - 1) * DEFENSA_POR_NIVEL);
}

// =================================
// NORMALIZAR PERFIL
// =================================

function normalizarPerfil(perfil) {
  if (!perfil) return null;

  perfil.nivel = Math.min(
    NIVEL_MAXIMO,
    Math.max(1, Number(perfil.nivel) || 1)
  );

  perfil.experiencia =
    Math.max(0, Number(perfil.experiencia) || 0);

  perfil.renacer = Math.max(
    0,
    Math.floor(Number(perfil.renacer) || 0)
  );

  perfil.renacerPendiente =
    Boolean(perfil.renacerPendiente);

  perfil.rubies =
    Number(perfil.rubies ?? perfil.monedas) || 0;

  perfil.banco = Number(perfil.banco) || 0;
  perfil.reserva = Number(perfil.reserva) || 0;

  // =================================
  // ESTADÍSTICAS
  // =================================

  if (!perfil.estadisticas) {
    perfil.estadisticas = {};
  }

  const multiplicador = multiplicadorRenacimiento(perfil);

  const vidaMax = Math.floor(
    vidaMaxima(perfil.nivel) * multiplicador
  );

  const ataque = Math.floor(
    ataquePorNivel(perfil.nivel) * multiplicador
  );

  const defensa = Math.floor(
    defensaPorNivel(perfil.nivel) * multiplicador
  );

  perfil.estadisticas.vidaMaxima = vidaMax;

  perfil.estadisticas.vida =
    perfil.estadisticas.vida ?? vidaMax;

  perfil.estadisticas.vida = Math.max(
    0,
    Math.min(
      Number(perfil.estadisticas.vida) || 0,
      vidaMax
    )
  );

  perfil.estadisticas.ataque = ataque;
  perfil.estadisticas.defensa = defensa;

  perfil.estadisticas.victorias =
    Number(perfil.estadisticas.victorias) || 0;

  perfil.estadisticas.derrotas =
    Number(perfil.estadisticas.derrotas) || 0;

  perfil.estadisticas.combatesGanados =
    Number(perfil.estadisticas.combatesGanados) || 0;

  perfil.estadisticas.combatesPerdidos =
    Number(perfil.estadisticas.combatesPerdidos) || 0;

  perfil.estadisticas.monstruosDerrotados =
    Number(perfil.estadisticas.monstruosDerrotados) || 0;

  perfil.estadisticas.bossesDerrotados =
    Number(perfil.estadisticas.bossesDerrotados) || 0;

  perfil.estadisticas.rubiesObtenidos =
    Number(perfil.estadisticas.rubiesObtenidos) || 0;

  // =================================
  // REGENERACIÓN
  // =================================

  if (!perfil.regeneracion) {
    perfil.regeneracion = {
      ultimaActualizacion: Date.now(),
      bloqueadaHasta: 0
    };
  }

  perfil.regeneracion.bloqueadaHasta =
    Number(perfil.regeneracion.bloqueadaHasta) || 0;

  perfil.regeneracion.ultimaActualizacion =
    Number(perfil.regeneracion.ultimaActualizacion) ||
    Date.now();

  // =================================
  // ELEMENTOS
  // =================================

  if (!perfil.elementos) {
    perfil.elementos = {
      primero: null,
      segundo: null,
      adicionales: []
    };
  }

  perfil.elementos.primero =
    perfil.elementos.primero || null;

  perfil.elementos.segundo =
    perfil.elementos.segundo || null;

  if (!Array.isArray(perfil.elementos.adicionales)) {
    perfil.elementos.adicionales = [];
  }

  // =================================
  // INVENTARIO
  // =================================

  if (!perfil.inventario || Array.isArray(perfil.inventario)) {
    perfil.inventario = {
      esencias: {
        normal: 0,
        epica: 0,
        legendaria: 0
      },
      objetos: Array.isArray(perfil.inventario)
        ? perfil.inventario
        : []
    };
  }

  perfil.inventario.esencias = {
    normal: Number(perfil.inventario.esencias?.normal) || 0,
    epica: Number(perfil.inventario.esencias?.epica) || 0,
    legendaria: Number(perfil.inventario.esencias?.legendaria) || 0
  };

  perfil.inventario.objetos =
    perfil.inventario.objetos || [];

  // =================================
  // EQUIPAMIENTO
  // =================================

  if (!perfil.equipamiento) {
    perfil.equipamiento = {};
  }

  perfil.equipamiento.armadura =
    perfil.equipamiento.armadura || null;

  // =================================
  // MINA
  // =================================

  if (!perfil.mina) {
    perfil.mina = {};
  }

  perfil.mina.nivel =
    Number(perfil.mina.nivel) || 1;

  perfil.mina.rubiesPendientes =
    Number(perfil.mina.rubiesPendientes) || 0;

  perfil.mina.intentos =
    perfil.mina.intentos === undefined
      ? INTENTOS_MINA_MAXIMOS
      : Math.max(
          0,
          Math.min(
            INTENTOS_MINA_MAXIMOS,
            Number(perfil.mina.intentos) || 0
          )
        );

  perfil.mina.ultimaRecarga =
    Number(perfil.mina.ultimaRecarga) || Date.now();

  return perfil;
}

// =================================
// ACTUALIZAR INTENTOS DE MINA
// =================================

function actualizarMina(perfil) {
  if (!perfil) return null;

  normalizarPerfil(perfil);

  const ahora = Date.now();

  const mina = perfil.mina;

  const tiempoTranscurrido =
    ahora - mina.ultimaRecarga;

  if (tiempoTranscurrido >= TIEMPO_RECARGA_MINA) {
    mina.intentos = INTENTOS_MINA_MAXIMOS;
    mina.ultimaRecarga = ahora;
  }

  return perfil;
}

// =================================
// CONSUMIR INTENTO DE MINA
// =================================

function consumirIntentoMina(perfil) {
  if (!perfil) {
    return {
      correcto: false,
      intentos: 0,
      mensaje: "❌ No se encontró tu perfil."
    };
  }

  actualizarMina(perfil);

  const mina = perfil.mina;

  if (mina.intentos <= 0) {
    const restante = Math.max(
      0,
      TIEMPO_RECARGA_MINA -
      (Date.now() - mina.ultimaRecarga)
    );

    const minutos = Math.floor(restante / 60000);
    const segundos = Math.ceil((restante % 60000) / 1000);

    return {
      correcto: false,
      intentos: 0,
      tiempoRestante: restante,
      mensaje:
        "⛏️ Ya utilizaste tus 3 intentos de minería.\n" +
        `⏳ Próxima recarga en ${minutos}m ${segundos}s.`
    };
  }

  mina.intentos--;

  return {
    correcto: true,
    intentos: mina.intentos,
    mensaje:
      `⛏️ Intento de minería utilizado.\n` +
      `🔋 Intentos restantes: ${mina.intentos}/${INTENTOS_MINA_MAXIMOS}`
  };
}

// =================================
// RENACIMIENTO
// =================================

function renacerPerfil(perfil) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró tu perfil."
    };
  }

  normalizarPerfil(perfil);

  if (perfil.nivel < NIVEL_MAXIMO) {
    return {
      correcto: false,
      mensaje:
        "❌ Necesitás alcanzar el nivel 500 para renacer."
    };
  }

  if (perfil.renacerPendiente) {
    return {
      correcto: false,
      mensaje:
        "❌ Primero tenés que elegir el elemento de tu renacimiento."
    };
  }

  perfil.renacer++;

  perfil.nivel = 1;
  perfil.experiencia = 0;

  const multiplicador = multiplicadorRenacimiento(perfil);

  perfil.estadisticas.vidaMaxima =
    VIDA_INICIAL * multiplicador;

  perfil.estadisticas.vida =
    perfil.estadisticas.vidaMaxima;

  perfil.estadisticas.ataque =
    ATAQUE_INICIAL * multiplicador;

  perfil.estadisticas.defensa =
    DEFENSA_INICIAL * multiplicador;

  perfil.renacerPendiente = true;

  perfil.regeneracion.ultimaActualizacion = Date.now();
  perfil.regeneracion.bloqueadaHasta = 0;

  return {
    correcto: true,
    renacer: perfil.renacer,
    multiplicador,
    mensaje:
      `🌟 ¡RENACIMIENTO ${perfil.renacer}!\n\n` +
      "Volviste al nivel 1.\n\n" +
      `❤️ Vida máxima: ${perfil.estadisticas.vidaMaxima}\n` +
      `⚔️ Ataque: ${perfil.estadisticas.ataque}\n` +
      `🛡️ Defensa: ${perfil.estadisticas.defensa}\n\n` +
      "✨ Desbloqueaste un nuevo elemento permanente.\n" +
      "Elegilo utilizando el comando &registrar:elemento."
  };
}

// =================================
// ACTUALIZAR REGENERACIÓN DE VIDA
// =================================

function actualizarRegeneracion(perfil, enCombate = false) {
  if (!perfil) return null;

  normalizarPerfil(perfil);

  const ahora = Date.now();

  const regeneracion = perfil.regeneracion;
  const estadisticas = perfil.estadisticas;

  if (enCombate) {
    regeneracion.ultimaActualizacion = ahora;
    return perfil;
  }

  if (estadisticas.vida >= estadisticas.vidaMaxima) {
    estadisticas.vida = estadisticas.vidaMaxima;
    regeneracion.ultimaActualizacion = ahora;
    return perfil;
  }

  if (ahora < regeneracion.bloqueadaHasta) {
    regeneracion.ultimaActualizacion = ahora;
    return perfil;
  }

  const inicioRegeneracion = Math.max(
    regeneracion.ultimaActualizacion,
    regeneracion.bloqueadaHasta
  );

  const tiempoTranscurrido = ahora - inicioRegeneracion;

  if (tiempoTranscurrido < TIEMPO_REGENERACION_VIDA) {
    return perfil;
  }

  const vidaRecuperada = Math.floor(
    tiempoTranscurrido / TIEMPO_REGENERACION_VIDA
  );

  if (vidaRecuperada <= 0) {
    return perfil;
  }

  const vidaAnterior = estadisticas.vida;

  estadisticas.vida = Math.min(
    estadisticas.vidaMaxima,
    estadisticas.vida + vidaRecuperada
  );

  const vidaRealRecuperada =
    estadisticas.vida - vidaAnterior;

  if (estadisticas.vida >= estadisticas.vidaMaxima) {
    regeneracion.ultimaActualizacion = ahora;
  } else {
    regeneracion.ultimaActualizacion =
      inicioRegeneracion +
      (vidaRealRecuperada * TIEMPO_REGENERACION_VIDA);
  }

  return perfil;
}

// =================================
// AGREGAR EXPERIENCIA
// =================================

function agregarExperiencia(perfil, cantidad) {
  if (!perfil || cantidad <= 0) {
    return {
      perfil,
      subioNivel: false,
      nivelesGanados: 0
    };
  }

  normalizarPerfil(perfil);

  if (perfil.nivel >= NIVEL_MAXIMO) {
    perfil.experiencia = 0;

    return {
      perfil,
      subioNivel: false,
      nivelesGanados: 0
    };
  }

  const nivelAnterior = perfil.nivel;

  perfil.experiencia += cantidad;

  let nivelesGanados = 0;

  while (
    perfil.nivel < NIVEL_MAXIMO &&
    perfil.experiencia >= experienciaNecesaria(perfil.nivel)
  ) {
    perfil.experiencia -= experienciaNecesaria(perfil.nivel);

    perfil.nivel++;
    nivelesGanados++;
  }

  if (perfil.nivel >= NIVEL_MAXIMO) {
    perfil.experiencia = 0;
  }

  if (nivelesGanados > 0) {
    const multiplicador = multiplicadorRenacimiento(perfil);

    const nuevaVidaMaxima = Math.floor(
      vidaMaxima(perfil.nivel) * multiplicador
    );

    const vidaMaximaAnterior = Math.floor(
      vidaMaxima(nivelAnterior) * multiplicador
    );

    const diferenciaVida =
      nuevaVidaMaxima - vidaMaximaAnterior;

    perfil.estadisticas.vidaMaxima = nuevaVidaMaxima;

    perfil.estadisticas.vida = Math.min(
      nuevaVidaMaxima,
      perfil.estadisticas.vida + diferenciaVida
    );

    perfil.estadisticas.ataque = Math.floor(
      ataquePorNivel(perfil.nivel) * multiplicador
    );

    perfil.estadisticas.defensa = Math.floor(
      defensaPorNivel(perfil.nivel) * multiplicador
    );
  }

  return {
    perfil,
    subioNivel: nivelesGanados > 0,
    nivelesGanados
  };
}

// =================================
// MOSTRAR PERFIL
// =================================

function mostrarPerfil(perfil) {
  if (!perfil) {
    return "❌ No se encontró el perfil del jugador.";
  }

  normalizarPerfil(perfil);
  actualizarMina(perfil);

  const segundoElemento =
    perfil.nivel >= 25
      ? perfil.elementos.segundo || "Sin elegir"
      : "🔒 Se desbloquea en nivel 25";

  const elementosAdicionales =
    perfil.elementos.adicionales.length > 0
      ? perfil.elementos.adicionales.join(", ")
      : "Ninguno";

  return `⚔️ SLAYERS RBSN — PERFIL

👤 Jugador: ${perfil.nombre}

🌟 Renacer: ${perfil.renacer}

⭐ Nivel: ${perfil.nivel}/${NIVEL_MAXIMO}
✨ Experiencia: ${perfil.experiencia}/${experienciaNecesaria(perfil.nivel)}

💎 Rubíes: ${perfil.rubies}

❤️ Vida: ${perfil.estadisticas.vida}/${perfil.estadisticas.vidaMaxima}

⚔️ Ataque: ${perfil.estadisticas.ataque}
🛡️ Defensa: ${perfil.estadisticas.defensa}

🔥 Primer elemento: ${perfil.elementos.primero || "Sin elegir"}
✨ Segundo elemento: ${segundoElemento}

🌟 Elementos de renacimiento: ${elementosAdicionales}

⛏️ Mina: ${perfil.mina.intentos}/${INTENTOS_MINA_MAXIMOS} intentos disponibles

🏆 Victorias: ${perfil.estadisticas.victorias}
💀 Derrotas: ${perfil.estadisticas.derrotas}

👹 Monstruos derrotados: ${perfil.estadisticas.monstruosDerrotados}
🐉 Bosses derrotados: ${perfil.estadisticas.bossesDerrotados}`;
}

// =================================
// EXPORTAR FUNCIONES
// =================================

module.exports = {
  NIVEL_MAXIMO,
  ELEMENTOS_DISPONIBLES,
  INTENTOS_MINA_MAXIMOS,
  TIEMPO_RECARGA_MINA,

  crearPerfil,
  normalizarPerfil,
  experienciaNecesaria,
  vidaMaxima,
  ataquePorNivel,
  defensaPorNivel,
  multiplicadorRenacimiento,
  renacerPerfil,
  actualizarRegeneracion,
  actualizarMina,
  consumirIntentoMina,
  agregarExperiencia,
  mostrarPerfil
};
