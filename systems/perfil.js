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

// CREAR PERFIL
function crearPerfil(userId, username) {
  return {
    id: userId,
    nombre: username || "Jugador",

    nivel: 1,
    experiencia: 0,

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
      segundo: null
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
      rubiesPendientes: 0
    },

    fechaCreacion: new Date().toISOString()
  };
}

// EXPERIENCIA NECESARIA
function experienciaNecesaria(nivel) {
  if (nivel >= NIVEL_MAXIMO) {
    return 0;
  }

  return 100 * Math.pow(2, nivel - 1);
}

// VIDA MAXIMA
function vidaMaxima(nivel) {
  return VIDA_INICIAL +
    ((nivel - 1) * VIDA_POR_NIVEL);
}

// ATAQUE
function ataquePorNivel(nivel) {
  return ATAQUE_INICIAL +
    ((nivel - 1) * ATAQUE_POR_NIVEL);
}

// DEFENSA
function defensaPorNivel(nivel) {
  return DEFENSA_INICIAL +
    ((nivel - 1) * DEFENSA_POR_NIVEL);
}

// NORMALIZAR PERFIL
function normalizarPerfil(perfil) {
  if (!perfil) return null;

  perfil.nivel = Math.min(
    NIVEL_MAXIMO,
    Math.max(1, Number(perfil.nivel) || 1)
  );

  perfil.experiencia = perfil.experiencia || 0;

  perfil.rubies = perfil.rubies ?? perfil.monedas ?? 0;
  perfil.banco = perfil.banco || 0;
  perfil.reserva = perfil.reserva || 0;

  if (!perfil.estadisticas) {
    perfil.estadisticas = {};
  }

  const vidaMax = vidaMaxima(perfil.nivel);

  perfil.estadisticas.vidaMaxima = vidaMax;

  perfil.estadisticas.vida =
    perfil.estadisticas.vida ?? vidaMax;

  perfil.estadisticas.vida = Math.min(
    perfil.estadisticas.vida,
    vidaMax
  );

  perfil.estadisticas.ataque =
    ataquePorNivel(perfil.nivel);

  perfil.estadisticas.defensa =
    defensaPorNivel(perfil.nivel);

  perfil.estadisticas.victorias =
    perfil.estadisticas.victorias || 0;

  perfil.estadisticas.derrotas =
    perfil.estadisticas.derrotas || 0;

  perfil.estadisticas.combatesGanados =
    perfil.estadisticas.combatesGanados || 0;

  perfil.estadisticas.combatesPerdidos =
    perfil.estadisticas.combatesPerdidos || 0;

  perfil.estadisticas.monstruosDerrotados =
    perfil.estadisticas.monstruosDerrotados || 0;

  perfil.estadisticas.bossesDerrotados =
    perfil.estadisticas.bossesDerrotados || 0;

  perfil.estadisticas.rubiesObtenidos =
    perfil.estadisticas.rubiesObtenidos || 0;

  if (!perfil.regeneracion) {
    perfil.regeneracion = {
      ultimaActualizacion: Date.now(),
      bloqueadaHasta: 0
    };
  }

  perfil.regeneracion.bloqueadaHasta =
    perfil.regeneracion.bloqueadaHasta || 0;

  if (!perfil.regeneracion.ultimaActualizacion) {
    perfil.regeneracion.ultimaActualizacion = Date.now();
  }

  if (!perfil.elementos) {
    perfil.elementos = {
      primero: null,
      segundo: null
    };
  }

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
    normal: perfil.inventario.esencias?.normal || 0,
    epica: perfil.inventario.esencias?.epica || 0,
    legendaria: perfil.inventario.esencias?.legendaria || 0
  };

  perfil.inventario.objetos =
    perfil.inventario.objetos || [];

  if (!perfil.equipamiento) {
    perfil.equipamiento = {};
  }

  perfil.equipamiento.armadura =
    perfil.equipamiento.armadura || null;

  if (!perfil.mina) {
    perfil.mina = {
      nivel: 1,
      rubiesPendientes: 0
    };
  }

  return perfil;
}

// AGREGAR EXPERIENCIA
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
    const nuevaVidaMaxima = vidaMaxima(perfil.nivel);

    const diferenciaVida =
      nuevaVidaMaxima - vidaMaxima(nivelAnterior);

    perfil.estadisticas.vidaMaxima = nuevaVidaMaxima;

    perfil.estadisticas.vida = Math.min(
      nuevaVidaMaxima,
      perfil.estadisticas.vida + diferenciaVida
    );

    perfil.estadisticas.ataque =
      ataquePorNivel(perfil.nivel);

    perfil.estadisticas.defensa =
      defensaPorNivel(perfil.nivel);
  }

  return {
    perfil,
    subioNivel: nivelesGanados > 0,
    nivelesGanados
  };
}

// MOSTRAR PERFIL
function mostrarPerfil(perfil) {
  if (!perfil) {
    return "❌ No se encontró el perfil del jugador.";
  }

  normalizarPerfil(perfil);

  const segundoElemento =
    perfil.nivel >= 25
      ? perfil.elementos.segundo || "Sin elegir"
      : "🔒 Se desbloquea en nivel 25";

  return `⚔️ SLAYERS RBSN — PERFIL

👤 Jugador: ${perfil.nombre}

⭐ Nivel: ${perfil.nivel}/${NIVEL_MAXIMO}
✨ Experiencia: ${perfil.experiencia}/${experienciaNecesaria(perfil.nivel)}

💎 Rubíes: ${perfil.rubies}

❤️ Vida: ${perfil.estadisticas.vida}/${perfil.estadisticas.vidaMaxima}

⚔️ Ataque: ${perfil.estadisticas.ataque}
🛡️ Defensa: ${perfil.estadisticas.defensa}

🔥 Primer elemento: ${perfil.elementos.primero || "Sin elegir"}
✨ Segundo elemento: ${segundoElemento}

🏆 Victorias: ${perfil.estadisticas.victorias}
💀 Derrotas: ${perfil.estadisticas.derrotas}

👹 Monstruos derrotados: ${perfil.estadisticas.monstruosDerrotados}
🐉 Bosses derrotados: ${perfil.estadisticas.bossesDerrotados}`;
}

// EXPORTAR FUNCIONES
module.exports = {
  NIVEL_MAXIMO,
  crearPerfil,
  normalizarPerfil,
  experienciaNecesaria,
  vidaMaxima,
  ataquePorNivel,
  defensaPorNivel,
  agregarExperiencia,
  mostrarPerfil
};
