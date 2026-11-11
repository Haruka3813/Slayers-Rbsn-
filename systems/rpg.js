const {
  agregarExperiencia,
  normalizarPerfil
} = require("./perfil");

// Enemigos disponibles
const enemigos = [
  {
    id: "slime",
    nombre: "Slime",
    nivel: 1,
    vida: 20,
    ataque: 8,
    defensa: 0,
    experiencia: 25
  },
  {
    id: "goblin",
    nombre: "Goblin",
    nivel: 2,
    vida: 40,
    ataque: 12,
    defensa: 2,
    experiencia: 40
  },
  {
    id: "lobo",
    nombre: "Lobo salvaje",
    nivel: 3,
    vida: 60,
    ataque: 16,
    defensa: 4,
    experiencia: 60
  },
  {
    id: "orco",
    nombre: "Orco",
    nivel: 5,
    vida: 100,
    ataque: 22,
    defensa: 8,
    experiencia: 100
  }
];

// Buscar enemigo
function buscarEnemigo(enemigoId) {
  return enemigos.find(
    enemigo => enemigo.id === enemigoId
  ) || null;
}

// Adaptar enemigo al nivel del jugador
function adaptarEnemigo(enemigo, nivelJugador = 1) {
  const nivel = Math.max(
    1,
    Math.min(500, Number(nivelJugador) || 1)
  );

  const diferencia = nivel - 1;

  return {
    ...enemigo,
    nivel,
    vida: enemigo.vida + diferencia * 20,
    ataque: enemigo.ataque + diferencia * 2,
    defensa: enemigo.defensa + diferencia,
    experiencia: Math.floor(
      enemigo.experiencia * (1 + diferencia * 0.1)
    )
  };
}

// Listar enemigos
function listarEnemigos(nivelJugador = 1) {
  return enemigos.map(enemigo =>
    adaptarEnemigo(enemigo, nivelJugador)
  );
}

// Iniciar combate
function iniciarCombate(perfil, enemigoId) {
  if (!perfil || !perfil.estadisticas) {
    return {
      error: "El perfil del jugador no es válido."
    };
  }

  normalizarPerfil(perfil);

  const enemigoBase = buscarEnemigo(enemigoId);

  if (!enemigoBase) {
    return {
      error: "No se encontró ese enemigo."
    };
  }

  if (perfil.estadisticas.vida <= 0) {
    return {
      error: "Tu personaje no tiene vida suficiente."
    };
  }

  const enemigo = adaptarEnemigo(
    enemigoBase,
    perfil.nivel
  );

  return {
    terminado: false,
    turno: "jugador",

    jugador: {
      vida: perfil.estadisticas.vida,
      vidaMaxima: perfil.estadisticas.vidaMaxima,
      ataque: perfil.estadisticas.ataque,
      defensa: perfil.estadisticas.defensa
    },

    enemigo: {
      ...enemigo,
      vidaMaxima: enemigo.vida
    }
  };
}

// Ataque del jugador
function atacarEnemigo(combate) {
  if (!combate || combate.terminado) {
    return {
      error: "No hay un combate activo."
    };
  }

  if (combate.turno !== "jugador") {
    return {
      error: "No es el turno del jugador."
    };
  }

  const dano = Math.max(
    1,
    combate.jugador.ataque -
    combate.enemigo.defensa
  );

  combate.enemigo.vida = Math.max(
    0,
    combate.enemigo.vida - dano
  );

  if (combate.enemigo.vida <= 0) {
    combate.terminado = true;
    combate.resultado = "victoria";

    return {
      combate,
      dano,
      mensaje: `Derrotaste a ${combate.enemigo.nombre}.`,
      experiencia: combate.enemigo.experiencia
    };
  }

  combate.turno = "enemigo";

  return {
    combate,
    dano,
    mensaje: `Causaste ${dano} de daño.`
  };
}

// Ataque del enemigo
function atacarJugador(combate) {
  if (!combate || combate.terminado) {
    return {
      error: "No hay un combate activo."
    };
  }

  if (combate.turno !== "enemigo") {
    return {
      error: "No es el turno del enemigo."
    };
  }

  const dano = Math.max(
    1,
    combate.enemigo.ataque -
    combate.jugador.defensa
  );

  combate.jugador.vida = Math.max(
    0,
    combate.jugador.vida - dano
  );

  if (combate.jugador.vida <= 0) {
    combate.terminado = true;
    combate.resultado = "derrota";

    return {
      combate,
      dano,
      mensaje: "Tu personaje fue derrotado."
    };
  }

  combate.turno = "jugador";

  return {
    combate,
    dano,
    mensaje: `Recibiste ${dano} de daño.`
  };
}

// Finalizar combate y actualizar perfil
function finalizarCombate(perfil, combate) {
  if (!perfil || !combate || !combate.terminado) {
    return {
      error: "El combate todavía no terminó."
    };
  }

  normalizarPerfil(perfil);

  perfil.estadisticas.vida = combate.jugador.vida;

  // VICTORIA
  if (combate.resultado === "victoria") {
    perfil.estadisticas.victorias =
      (perfil.estadisticas.victorias || 0) + 1;

    perfil.estadisticas.combatesGanados =
      (perfil.estadisticas.combatesGanados || 0) + 1;

    perfil.estadisticas.monstruosDerrotados =
      (perfil.estadisticas.monstruosDerrotados || 0) + 1;

    const resultado = agregarExperiencia(
      perfil,
      combate.enemigo.experiencia
    );

    return {
      perfil: resultado.perfil,
      resultado: "victoria",
      experiencia: combate.enemigo.experiencia,
      subioNivel: resultado.subioNivel
    };
  }

  // DERROTA
  perfil.estadisticas.derrotas =
    (perfil.estadisticas.derrotas || 0) + 1;

  perfil.estadisticas.combatesPerdidos =
    (perfil.estadisticas.combatesPerdidos || 0) + 1;

  // Penalización del 5% de la experiencia actual
  const experienciaAnterior = perfil.experiencia || 0;

  const perdidaExperiencia = Math.ceil(
    experienciaAnterior * 0.05
  );

  perfil.experiencia = Math.max(
    0,
    experienciaAnterior - perdidaExperiencia
  );

  // Bloquear regeneración durante 5 minutos
  const ahora = Date.now();

  perfil.regeneracion = perfil.regeneracion || {};

  perfil.regeneracion.ultimaActualizacion = ahora;

  perfil.regeneracion.bloqueadaHasta =
    ahora + (5 * 60 * 1000);

  return {
    perfil,
    resultado: "derrota",
    experienciaAnterior,
    perdidaExperiencia,
    experienciaRestante: perfil.experiencia,
    rubiesPerdidos: 0,
    regeneracionBloqueada: true,
    tiempoBloqueo: 5 * 60 * 1000
  };
}

module.exports = {
  enemigos,
  buscarEnemigo,
  adaptarEnemigo,
  listarEnemigos,
  iniciarCombate,
  atacarEnemigo,
  atacarJugador,
  finalizarCombate
};
