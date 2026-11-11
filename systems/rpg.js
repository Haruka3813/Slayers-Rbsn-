const {
  agregarExperiencia,
  normalizarPerfil
} = require("./perfil");

// =================================
// CONFIGURACIÓN DE BOSS
// =================================

const TIEMPO_REGENERACION_BOSS = 1800 / 1.01;

// =================================
// ENEMIGOS NORMALES
// =================================

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

// =================================
// CATÁLOGO DE 50 BOSSES
// =================================

const catalogoBosses = [
  ["Gorath, el Devorador", "Dragón negro de escamas rojas"],
  ["Varkon, Rey de las Cenizas", "Gigante cubierto de fuego"],
  ["Nerath, la Bestia Abismal", "Serpiente monstruosa de las profundidades"],
  ["Drakmor, Señor de la Sangre", "Dragón de cuatro cuernos"],
  ["Zerath, el Coloso Oscuro", "Gigante de armadura negra"],
  ["Malgron, Devorador de Almas", "Demonio con alas gigantes"],
  ["Tharok, el Destructor", "Bestia acorazada de seis patas"],
  ["Velkris, Reina de las Sombras", "Criatura alada de ojos violetas"],
  ["Ragnar, el Titán Carmesí", "Titán cubierto de lava"],
  ["Azrath, Señor del Abismo", "Dragón de tres cabezas"],

  ["Kragor, el Inmortal", "Gigante de piedra oscura"],
  ["Draziel, la Muerte Blanca", "Lobo colosal de hielo"],
  ["Morvath, Rey de los Muertos", "Rey esquelético con corona"],
  ["Xerion, el Dragón Celestial", "Dragón dorado de seis alas"],
  ["Brakthar, Rompemontañas", "Bestia rocosa gigantesca"],
  ["Nythra, la Reina Venenosa", "Araña monstruosa verde"],
  ["Volkar, Señor del Trueno", "Dragón eléctrico azul"],
  ["Erebus, la Oscuridad Viviente", "Sombra gigantesca con ojos rojos"],
  ["Galdor, el Devorador de Mundos", "Gigante con armadura antigua"],
  ["Zarvok, el Emperador Demoníaco", "Demonio de cuatro brazos"],

  ["Fyrak, Corazón de Fuego", "Dragón volcánico"],
  ["Abyssia, Reina del Vacío", "Criatura flotante de energía oscura"],
  ["Thundrax, el Destructor Celeste", "Bestia eléctrica de enormes cuernos"],
  ["Ograth, el Coloso Maldito", "Gigante de hierro oxidado"],
  ["Sylvara, Madre de las Plagas", "Monstruo vegetal venenoso"],
  ["Doomrak, el Portador del Fin", "Caballero demoníaco"],
  ["Kryos, Señor de la Escarcha", "Dragón de hielo cristalino"],
  ["Vexar, el Devorador de Luz", "Bestia negra con alas blancas"],
  ["Rhazgor, el Titán de Guerra", "Coloso con dos enormes hachas"],
  ["Astaroth, Rey del Infierno", "Demonio con corona de fuego"],

  ["Nargul, la Pesadilla Eterna", "Bestia de sombras con múltiples ojos"],
  ["Dravok, Señor de los Dragones", "Dragón ancestral de escamas doradas"],
  ["Zyphor, Tormenta Viviente", "Serpiente celestial eléctrica"],
  ["Grimfang, el Devorador", "Lobo demoníaco gigantesco"],
  ["Valtherion, el Rey Caído", "Rey espectral con armadura"],
  ["Morthis, Señor de la Destrucción", "Demonio de lava negra"],
  ["Eldrak, el Dragón Primordial", "Dragón ancestral de siete cuernos"],
  ["Nyxara, Emperatriz Oscura", "Reina monstruosa de alas negras"],
  ["Korvax, el Titán del Caos", "Gigante de energía roja"],
  ["Zeraphiel, Juez Celestial", "Guardián celestial de seis alas"],

  ["Ravok, el Último Devorador", "Dragón colosal de fuego negro"],
  ["Thalgron, Rey de los Titanes", "Titán de armadura dorada"],
  ["Vorthak, la Ruina Viviente", "Bestia de piedra y lava"],
  ["Azrakiel, Señor de la Eternidad", "Demonio celestial de alas oscuras"],
  ["Khaelor, el Dragón del Apocalipsis", "Dragón gigantesco de siete cabezas"],
  ["Malgath, Emperador del Vacío", "Coloso de energía violeta"],
  ["Orvax, el Dios de la Destrucción", "Bestia divina de cuatro brazos"],
  ["Nexarion, el Devorador de Estrellas", "Dragón cósmico"],
  ["Valkrath, Rey del Fin", "Guerrero colosal de armadura negra"],
  ["Abyssor, Señor Supremo del Abismo", "Dragón ancestral de energía oscura"]
];

// Generar los 50 Bosses
const bosses = catalogoBosses.map((datos, indice) => {
  const nivel = (indice + 1) * 10;

  return {
    id: `boss_${nivel}`,
    nombre: datos[0],
    apariencia: datos[1],
    nivel,
    esBoss: true,
    vida: 250 + (nivel * 30),
    ataque: 18 + (nivel * 3),
    defensa: 5 + (nivel * 2),
    experiencia: 500 + (nivel * 100)
  };
});

// =================================
// BUSCAR ENEMIGOS
// =================================

function buscarEnemigo(enemigoId) {
  return enemigos.find(
    enemigo => enemigo.id === enemigoId
  ) || null;
}

function buscarBoss(nivel) {
  return bosses.find(
    boss => boss.nivel === Number(nivel)
  ) || null;
}

// =================================
// ADAPTAR ENEMIGO AL NIVEL
// =================================

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

// =================================
// LISTAR ENEMIGOS
// =================================

function listarEnemigos(nivelJugador = 1) {
  return enemigos.map(enemigo =>
    adaptarEnemigo(enemigo, nivelJugador)
  );
}

// =================================
// LISTAR BOSSES
// =================================

function listarBosses() {
  return bosses.map(boss => ({ ...boss }));
}

// =================================
// OBTENER PRÓXIMO BOSS
// =================================

function obtenerProximoBoss(nivelJugador = 1) {
  const nivel = Math.max(
    1,
    Math.min(500, Number(nivelJugador) || 1)
  );

  const nivelBoss = Math.ceil(nivel / 10) * 10;

  return buscarBoss(nivelBoss);
}

// =================================
// INICIAR COMBATE NORMAL
// =================================

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
    esBoss: false,
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

// =================================
// INICIAR COMBATE CONTRA BOSS
// =================================

function iniciarCombateBoss(perfil) {
  if (!perfil || !perfil.estadisticas) {
    return {
      error: "El perfil del jugador no es válido."
    };
  }

  normalizarPerfil(perfil);

  if (perfil.estadisticas.vida <= 0) {
    return {
      error: "Tu personaje no tiene vida suficiente."
    };
  }

  if (perfil.nivel < 10 || perfil.nivel % 10 !== 0) {
    return {
      error: "Solo puedes desafiar al Boss correspondiente en los niveles 10, 20, 30... hasta 500."
    };
  }

  const bossBase = buscarBoss(perfil.nivel);

  if (!bossBase) {
    return {
      error: "No se encontró el Boss de tu nivel."
    };
  }

  const boss = { ...bossBase };

  return {
    terminado: false,
    esBoss: true,
    turno: "jugador",

    jugador: {
      vida: perfil.estadisticas.vida,
      vidaMaxima: perfil.estadisticas.vidaMaxima,
      ataque: perfil.estadisticas.ataque,
      defensa: perfil.estadisticas.defensa
    },

    enemigo: {
      ...boss,
      vidaMaxima: boss.vida,
      ultimaRegeneracion: Date.now(),
      regeneracionAcumulada: 0
    }
  };
}

// =================================
// REGENERACIÓN DEL BOSS
// =================================

function actualizarRegeneracionBoss(combate, ahora = Date.now()) {
  if (
    !combate ||
    !combate.esBoss ||
    combate.terminado ||
    !combate.enemigo
  ) {
    return 0;
  }

  const boss = combate.enemigo;

  if (boss.vida <= 0) {
    return 0;
  }

  if (!boss.ultimaRegeneracion) {
    boss.ultimaRegeneracion = ahora;
    return 0;
  }

  const tiempoTranscurrido = Math.max(
    0,
    ahora - boss.ultimaRegeneracion
  );

  boss.ultimaRegeneracion = ahora;

  const recuperacion =
    tiempoTranscurrido / TIEMPO_REGENERACION_BOSS;

  boss.regeneracionAcumulada =
    (boss.regeneracionAcumulada || 0) + recuperacion;

  const puntosRecuperados = Math.floor(
    boss.regeneracionAcumulada
  );

  if (puntosRecuperados <= 0) {
    return 0;
  }

  const vidaAnterior = boss.vida;

  boss.vida = Math.min(
    boss.vidaMaxima,
    boss.vida + puntosRecuperados
  );

  boss.regeneracionAcumulada -= puntosRecuperados;

  if (boss.vida >= boss.vidaMaxima) {
    boss.regeneracionAcumulada = 0;
  }

  return boss.vida - vidaAnterior;
}

// =================================
// ATAQUE DEL JUGADOR
// =================================

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

  const regeneracion = actualizarRegeneracionBoss(combate);

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
      regeneracion,
      mensaje: `Derrotaste a ${combate.enemigo.nombre}.`,
      experiencia: combate.enemigo.experiencia
    };
  }

  combate.turno = "enemigo";

  return {
    combate,
    dano,
    regeneracion,
    mensaje: `Causaste ${dano} de daño.`
  };
}

// =================================
// ATAQUE DEL ENEMIGO
// =================================

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

  const regeneracion = actualizarRegeneracionBoss(combate);

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
      regeneracion,
      mensaje: "Tu personaje fue derrotado."
    };
  }

  combate.turno = "jugador";

  return {
    combate,
    dano,
    regeneracion,
    mensaje: `Recibiste ${dano} de daño.`
  };
}

// =================================
// FINALIZAR COMBATE
// =================================

function finalizarCombate(perfil, combate) {
  if (!perfil || !combate || !combate.terminado) {
    return {
      error: "El combate todavía no terminó."
    };
  }

  normalizarPerfil(perfil);

  perfil.estadisticas.vida = combate.jugador.vida;

  // =================================
  // VICTORIA
  // =================================

  if (combate.resultado === "victoria") {
    perfil.estadisticas.victorias =
      (perfil.estadisticas.victorias || 0) + 1;

    perfil.estadisticas.combatesGanados =
      (perfil.estadisticas.combatesGanados || 0) + 1;

    if (combate.esBoss) {
      perfil.estadisticas.bossesDerrotados =
        (perfil.estadisticas.bossesDerrotados || 0) + 1;
    } else {
      perfil.estadisticas.monstruosDerrotados =
        (perfil.estadisticas.monstruosDerrotados || 0) + 1;
    }

    const resultado = agregarExperiencia(
      perfil,
      combate.enemigo.experiencia
    );

    return {
      perfil: resultado.perfil,
      resultado: "victoria",
      esBoss: Boolean(combate.esBoss),
      experiencia: combate.enemigo.experiencia,
      subioNivel: resultado.subioNivel
    };
  }

  // =================================
  // DERROTA
  // =================================

  perfil.estadisticas.derrotas =
    (perfil.estadisticas.derrotas || 0) + 1;

  perfil.estadisticas.combatesPerdidos =
    (perfil.estadisticas.combatesPerdidos || 0) + 1;

  const experienciaAnterior = perfil.experiencia || 0;

  const perdidaExperiencia = Math.ceil(
    experienciaAnterior * 0.05
  );

  perfil.experiencia = Math.max(
    0,
    experienciaAnterior - perdidaExperiencia
  );

  const ahora = Date.now();

  perfil.regeneracion = perfil.regeneracion || {};

  perfil.regeneracion.ultimaActualizacion = ahora;

  perfil.regeneracion.bloqueadaHasta =
    ahora + (5 * 60 * 1000);

  return {
    perfil,
    resultado: "derrota",
    esBoss: Boolean(combate.esBoss),
    experienciaAnterior,
    perdidaExperiencia,
    experienciaRestante: perfil.experiencia,
    rubiesPerdidos: 0,
    regeneracionBloqueada: true,
    tiempoBloqueo: 5 * 60 * 1000
  };
}

// =================================
// EXPORTAR FUNCIONES
// =================================

module.exports = {
  enemigos,
  bosses,
  buscarEnemigo,
  buscarBoss,
  adaptarEnemigo,
  listarEnemigos,
  listarBosses,
  obtenerProximoBoss,
  iniciarCombate,
  iniciarCombateBoss,
  actualizarRegeneracionBoss,
  atacarEnemigo,
  atacarJugador,
  finalizarCombate
};
