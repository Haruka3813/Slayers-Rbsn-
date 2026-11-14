// =============================================
// SLAYERS RBSN — SISTEMA DE COMBATE
// =============================================

const {
  agregarExperiencia,
  normalizarPerfil,
  vidaMaxima,
  ataquePorNivel,
  defensaPorNivel
} = require("./perfil");

// =============================================
// CONFIGURACIÓN
// =============================================

const TIEMPO_REGENERACION_BOSS = 1800 / 1.01;
const ENFRIAMIENTO_PODER = 3;

// =============================================
// MATERIALES DE CAZA
// =============================================

const MATERIALES_CAZA = [
  {
    id: "piel_monstruosa",
    nombre: "Piel monstruosa",
    descripcion: "Piel resistente utilizada para fabricar armaduras."
  },
  {
    id: "colmillo",
    nombre: "Colmillo",
    descripcion: "Colmillo de monstruo utilizado en la fabricación."
  },
  {
    id: "hueso",
    nombre: "Hueso de monstruo",
    descripcion: "Hueso resistente utilizado para fabricar equipamiento."
  },
  {
    id: "garra",
    nombre: "Garra salvaje",
    descripcion: "Garra afilada utilizada para fabricar armas."
  },
  {
    id: "fragmento_elemental",
    nombre: "Fragmento elemental",
    descripcion: "Fragmento mágico utilizado en la herrería."
  }
];

// =============================================
// ELEMENTOS Y PODERES
// =============================================

const PODERES_ELEMENTALES = {
  fuego: {
    nombre: "Llamas devastadoras",
    descripcion: "Quema al enemigo durante 3 rondas.",
    tipo: "quemadura",
    dano: 0.20,
    rondas: 3
  },

  metal: {
    nombre: "Impacto de acero",
    descripcion: "Golpea atravesando parte de la defensa enemiga.",
    tipo: "penetracion",
    dano: 1.5,
    penetracion: 0.50
  },

  rayo: {
    nombre: "Descarga eléctrica",
    descripcion: "Causa daño y debilita al enemigo.",
    tipo: "rayo",
    dano: 1.35,
    rondas: 2,
    reduccionAtaque: 0.15
  },

  viento: {
    nombre: "Torbellino cortante",
    descripcion: "Una ráfaga de viento golpea al enemigo.",
    tipo: "viento",
    dano: 1.40
  },

  tierra: {
    nombre: "Lluvia de rocas",
    descripcion: "Lanza enormes rocas contra el enemigo.",
    tipo: "tierra",
    dano: 1.55
  },

  oscuridad: {
    nombre: "Drenaje sombrío",
    descripcion: "Daña al enemigo y absorbe parte de su vida.",
    tipo: "oscuridad",
    dano: 1.20,
    curacion: 0.25
  },

  hielo: {
    nombre: "Prisión glacial",
    descripcion: "Congela al enemigo durante una ronda.",
    tipo: "congelacion",
    dano: 0.80,
    rondas: 1
  },

  agua: {
    nombre: "Manto acuático",
    descripcion: "Crea un escudo que refleja parte del daño recibido.",
    tipo: "escudo",
    reflejo: 0.50,
    reduccion: 0.50,
    rondas: 2
  },

  luz: {
    nombre: "Bendición luminosa",
    descripcion: "Recupera parte de la vida del jugador.",
    tipo: "curacion",
    curacion: 0.40
  },

  naturaleza: {
    nombre: "Prisión de raíces",
    descripcion: "Atrapa al enemigo y recupera vida.",
    tipo: "raices",
    dano: 0.70,
    curacion: 0.20,
    rondas: 1
  },

  veneno: {
    nombre: "Toxina mortal",
    descripcion: "Envenena al enemigo durante varias rondas.",
    tipo: "veneno",
    dano: 0.10,
    rondas: 4
  }
};

// =============================================
// ENEMIGOS NORMALES
// =============================================

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
    id: "duende",
    nombre: "Duende",
    nivel: 2,
    vida: 35,
    ataque: 11,
    defensa: 1,
    experiencia: 45
  },
  {
    id: "goblin",
    nombre: "Goblin",
    nivel: 3,
    vida: 45,
    ataque: 13,
    defensa: 2,
    experiencia: 55
  },
  {
    id: "duende_guerrero",
    nombre: "Duende Guerrero",
    nivel: 5,
    vida: 85,
    ataque: 20,
    defensa: 5,
    experiencia: 110
  },
  {
    id: "lobo",
    nombre: "Lobo salvaje",
    nivel: 7,
    vida: 100,
    ataque: 24,
    defensa: 7,
    experiencia: 140
  },
  {
    id: "orco",
    nombre: "Orco",
    nivel: 10,
    vida: 150,
    ataque: 30,
    defensa: 10,
    experiencia: 200
  },
  {
    id: "rey_duende",
    nombre: "Rey Duende",
    nivel: 15,
    vida: 260,
    ataque: 42,
    defensa: 15,
    experiencia: 350,
    esRey: true
  },
  {
    id: "rey_lobo",
    nombre: "Rey Lobo",
    nivel: 25,
    vida: 450,
    ataque: 60,
    defensa: 22,
    experiencia: 550,
    esRey: true
  },
  {
    id: "rey_goblin",
    nombre: "Rey Goblin",
    nivel: 35,
    vida: 650,
    ataque: 78,
    defensa: 30,
    experiencia: 800,
    esRey: true
  },
  {
    id: "rey_orco",
    nombre: "Rey Orco",
    nivel: 45,
    vida: 900,
    ataque: 100,
    defensa: 40,
    experiencia: 1100,
    esRey: true
  },
  {
    id: "rey_slime",
    nombre: "Rey Slime",
    nivel: 50,
    vida: 1200,
    ataque: 120,
    defensa: 50,
    experiencia: 1500,
    esRey: true
  }
];

// =============================================
// CATÁLOGO DE 10 BOSSES
// =============================================

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
  ["Azrath, Señor del Abismo", "Dragón de tres cabezas"]
];

// =============================================
// GENERAR LOS 10 BOSSES
// =============================================

const bosses = catalogoBosses.map((datos, indice) => {
  const nivel = (indice + 1) * 50;

  const vidaJugador = vidaMaxima(nivel);
  const ataqueJugador = ataquePorNivel(nivel);
  const defensaJugador = defensaPorNivel(nivel);

  return {
    id: `boss_${nivel}`,
    nombre: datos[0],
    apariencia: datos[1],
    nivel,
    esBoss: true,

    vida: Math.floor(vidaJugador * 1.5),

    ataque: Math.floor(
      defensaJugador + (nivel * 0.5)
    ),

    defensa: Math.floor(
      ataqueJugador * 0.35
    ),

    experiencia: 500 + (nivel * 100)
  };
});

// =============================================
// BUSCAR ENEMIGOS
// =============================================

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

// =============================================
// ADAPTAR ENEMIGO AL NIVEL
// =============================================

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

// =============================================
// LISTAR ENEMIGOS
// =============================================

function listarEnemigos(nivelJugador = 1) {
  return enemigos.map(enemigo =>
    adaptarEnemigo(enemigo, nivelJugador)
  );
}

// =============================================
// LISTAR BOSSES
// =============================================

function listarBosses() {
  return bosses.map(boss => ({
    ...boss
  }));
}

// =============================================
// OBTENER PRÓXIMO BOSS
// =============================================

function obtenerProximoBoss(nivelJugador = 1) {
  const nivel = Math.max(
    1,
    Math.min(500, Number(nivelJugador) || 1)
  );

  const nivelBoss = Math.ceil(nivel / 50) * 50;

  return buscarBoss(nivelBoss);
}

// =============================================
// BONIFICACIONES DE EQUIPAMIENTO
// =============================================

function obtenerBonificacionesEquipamiento(perfil) {
  const arma = perfil.equipamiento?.arma;
  const armadura = perfil.equipamiento?.armadura;

  const ataqueArma =
    Number(arma?.ataque) ||
    Number(arma?.estadisticas?.ataque) ||
    0;

  const defensaArmadura =
    Number(armadura?.defensa) ||
    Number(armadura?.estadisticas?.defensa) ||
    0;

  return {
    ataque: Math.max(0, ataqueArma),
    defensa: Math.max(0, defensaArmadura)
  };
}

// =============================================
// ESTADÍSTICAS DEL JUGADOR
// =============================================

function obtenerEstadisticasJugador(perfil) {
  const bonificaciones =
    obtenerBonificacionesEquipamiento(perfil);

  return {
    vida: perfil.estadisticas.vida,

    vidaMaxima: perfil.estadisticas.vidaMaxima,

    ataque:
      perfil.estadisticas.ataque +
      bonificaciones.ataque,

    defensa:
      perfil.estadisticas.defensa +
      bonificaciones.defensa
  };
}

// =============================================
// PREPARAR ESTADO DE COMBATE
// =============================================

function prepararEstadoCombate(combate) {
  if (!combate) return combate;

  if (typeof combate.rondas !== "number") {
    combate.rondas = 0;
  }

  if (typeof combate.ultimoUsoPoder !== "number") {
    combate.ultimoUsoPoder = -100;
  }

  if (!combate.efectosJugador) {
    combate.efectosJugador = {};
  }

  if (!combate.efectosEnemigo) {
    combate.efectosEnemigo = {};
  }

  return combate;
}

// =============================================
// INICIAR COMBATE NORMAL
// =============================================

function iniciarCombate(
  perfil,
  enemigoId,
  nivelEnemigo = null
) {
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

  const nivelObjetivo = nivelEnemigo === null
    ? perfil.nivel
    : Math.max(
        1,
        Math.min(
          500,
          Number(nivelEnemigo) || 1
        )
      );

  const enemigo = adaptarEnemigo(
    enemigoBase,
    nivelObjetivo
  );

  return prepararEstadoCombate({
    terminado: false,
    esBoss: false,
    turno: "jugador",

    jugador: obtenerEstadisticasJugador(perfil),

    enemigo: {
      ...enemigo,
      vidaMaxima: enemigo.vida
    }
  });
}

// =============================================
// INICIAR COMBATE CONTRA BOSS
// =============================================

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

  if (
    perfil.nivel < 50 ||
    perfil.nivel % 50 !== 0
  ) {
    return {
      error:
        "Solo puedes desafiar al Boss correspondiente en los niveles 50, 100, 150... hasta 500."
    };
  }

  const bossBase = buscarBoss(perfil.nivel);

  if (!bossBase) {
    return {
      error: "No se encontró el Boss de tu nivel."
    };
  }

  const boss = {
    ...bossBase
  };

  return prepararEstadoCombate({
    terminado: false,
    esBoss: true,
    turno: "jugador",

    jugador: obtenerEstadisticasJugador(perfil),

    enemigo: {
      ...boss,
      vidaMaxima: boss.vida,
      ultimaRegeneracion: Date.now(),
      regeneracionAcumulada: 0
    }
  });
}

// =============================================
// REGENERACIÓN DEL BOSS
// =============================================

function actualizarRegeneracionBoss(
  combate,
  ahora = Date.now()
) {
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

// =============================================
// OBTENER ELEMENTOS DEL JUGADOR
// =============================================

function normalizarIdElemento(valor) {
  if (!valor) return null;

  let id = typeof valor === "object"
    ? valor.id || valor.elemento || valor.nombre
    : valor;

  if (!id) return null;

  id = String(id)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const equivalencias = {
    "rayo": "rayo",
    "fuego": "fuego",
    "metal": "metal",
    "viento": "viento",
    "tierra": "tierra",
    "oscuridad": "oscuridad",
    "hielo": "hielo",
    "agua": "agua",
    "luz": "luz",
    "naturaleza": "naturaleza",
    "veneno": "veneno"
  };

  return equivalencias[id] || null;
}

function obtenerElementosJugador(perfil) {
  const elementos = perfil?.elementos || {};
  const lista = [];

  function agregarElemento(valor) {
    const id = normalizarIdElemento(valor);

    if (
      id &&
      PODERES_ELEMENTALES[id] &&
      !lista.includes(id)
    ) {
      lista.push(id);
    }
  }

  if (Array.isArray(elementos)) {
    elementos.forEach(agregarElemento);
  } else {
    agregarElemento(elementos.primero);
    agregarElemento(elementos.segundo);
    agregarElemento(elementos.tercero);
    agregarElemento(elementos.cuarto);
    agregarElemento(elementos.quinto);

    if (Array.isArray(elementos.adicionales)) {
      elementos.adicionales.forEach(agregarElemento);
    }
  }

  return lista;
}

// =============================================
// MOSTRAR PODERES ELEMENTALES
// =============================================

function obtenerPoderesElementales(perfil) {
  const elementos = obtenerElementosJugador(perfil);

  return elementos.map(id => ({
    id,
    ...PODERES_ELEMENTALES[id]
  }));
}

// =============================================
// USAR PODER ELEMENTAL
// =============================================

function usarPoderElemental(combate, perfil) {
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

  if (!perfil) {
    return {
      error: "No se encontró el perfil del jugador."
    };
  }

  prepararEstadoCombate(combate);

  const elementos = obtenerElementosJugador(perfil);

  if (elementos.length === 0) {
    return {
      error: "No tienes ningún elemento desbloqueado."
    };
  }

  const rondasTranscurridas =
    combate.rondas - combate.ultimoUsoPoder;

  if (rondasTranscurridas < ENFRIAMIENTO_PODER) {
    const restantes =
      ENFRIAMIENTO_PODER - rondasTranscurridas;

    return {
      error:
        `Tu poder elemental todavía está recargando. Podrás usarlo dentro de ${restantes} ronda(s).`
    };
  }

  const ataque = combate.jugador.ataque;

  let danoTotal = 0;
  let curacionTotal = 0;
  let penetracion = 0;

  const mensajes = [];

  elementos.forEach(id => {
    const poder = PODERES_ELEMENTALES[id];

    switch (poder.tipo) {
      case "quemadura":
        combate.efectosEnemigo.quemadura = {
          dano: Math.max(1, Math.floor(ataque * poder.dano)),
          rondas: poder.rondas
        };

        mensajes.push("🔥 El enemigo quedó quemado.");
        break;

      case "penetracion":
        penetracion += poder.penetracion;
        danoTotal += Math.floor(ataque * poder.dano);

        mensajes.push(
          "⚙️ Tu golpe atraviesa parte de su defensa."
        );
        break;

      case "rayo":
        danoTotal += Math.floor(ataque * poder.dano);

        combate.efectosEnemigo.debilitado = {
          rondas: poder.rondas,
          reduccion: poder.reduccionAtaque
        };

        mensajes.push(
          "⚡ Una descarga eléctrica debilita al enemigo."
        );
        break;

      case "viento":
        danoTotal += Math.floor(ataque * poder.dano);
        mensajes.push("🌪️ Una ráfaga golpea al enemigo.");
        break;

      case "tierra":
        danoTotal += Math.floor(ataque * poder.dano);
        mensajes.push("🪨 Una lluvia de rocas golpea al enemigo.");
        break;

      case "oscuridad":
        danoTotal += Math.floor(ataque * poder.dano);
        curacionTotal += Math.floor(ataque * poder.curacion);

        mensajes.push(
          "🌑 Absorbes parte de la energía enemiga."
        );
        break;

      case "congelacion":
        danoTotal += Math.floor(ataque * poder.dano);

        combate.efectosEnemigo.congelado = {
          rondas: poder.rondas
        };

        mensajes.push("❄️ El enemigo quedó congelado.");
        break;

      case "escudo":
        combate.efectosJugador.escudo = {
          rondas: poder.rondas,
          reflejo: poder.reflejo,
          reduccion: poder.reduccion
        };

        mensajes.push("💧 Un escudo acuático te protege.");
        break;

      case "curacion":
        curacionTotal += Math.floor(
          combate.jugador.vidaMaxima * poder.curacion
        );

        mensajes.push("✨ La luz restaura tu vida.");
        break;

      case "raices":
        danoTotal += Math.floor(ataque * poder.dano);

        curacionTotal += Math.floor(
          combate.jugador.vidaMaxima * poder.curacion
        );

        combate.efectosEnemigo.atrapado = {
          rondas: poder.rondas
        };

        mensajes.push("🌿 Las raíces atrapan al enemigo.");
        break;

      case "veneno":
        combate.efectosEnemigo.veneno = {
          dano: Math.max(1, Math.floor(ataque * poder.dano)),
          rondas: poder.rondas
        };

        mensajes.push("☠️ El enemigo quedó envenenado.");
        break;
    }
  });

  const defensaEfectiva = Math.floor(
    combate.enemigo.defensa *
    (1 - Math.min(0.75, penetracion))
  );

  const danoBase = Math.max(
    0,
    danoTotal - defensaEfectiva
  );

  combate.enemigo.vida = Math.max(
    0,
    combate.enemigo.vida - danoBase
  );

  const vidaAnterior = combate.jugador.vida;

  combate.jugador.vida = Math.min(
    combate.jugador.vidaMaxima,
    combate.jugador.vida + curacionTotal
  );

  const vidaRecuperada =
    combate.jugador.vida - vidaAnterior;

  combate.ultimoUsoPoder = combate.rondas;

  if (combate.enemigo.vida <= 0) {
    combate.terminado = true;
    combate.resultado = "victoria";
  } else {
    combate.turno = "enemigo";
  }

  return {
    combate,
    dano: danoBase,
    curacion: vidaRecuperada,
    elementos,
    mensajes,
    mensaje: mensajes.join("\n")
  };
}

// =============================================
// PROCESAR EFECTOS DEL ENEMIGO
// =============================================

function procesarEfectosEnemigo(combate) {
  const efectos = combate.efectosEnemigo || {};

  let dano = 0;
  const mensajes = [];

  if (efectos.quemadura) {
    dano += efectos.quemadura.dano;
    efectos.quemadura.rondas--;

    mensajes.push(
      `🔥 La quemadura causa ${efectos.quemadura.dano} de daño.`
    );

    if (efectos.quemadura.rondas <= 0) {
      delete efectos.quemadura;
    }
  }

  if (efectos.veneno) {
    dano += efectos.veneno.dano;
    efectos.veneno.rondas--;

    mensajes.push(
      `☠️ El veneno causa ${efectos.veneno.dano} de daño.`
    );

    if (efectos.veneno.rondas <= 0) {
      delete efectos.veneno;
    }
  }

  combate.enemigo.vida = Math.max(
    0,
    combate.enemigo.vida - dano
  );

  return {
    dano,
    mensajes
  };
}

// =============================================
// ATAQUE DEL JUGADOR
// =============================================

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

  prepararEstadoCombate(combate);

  const regeneracion =
    actualizarRegeneracionBoss(combate);

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

// =============================================
// ATAQUE DEL ENEMIGO
// =============================================

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

  prepararEstadoCombate(combate);

  const regeneracion =
    actualizarRegeneracionBoss(combate);

  const efectos = procesarEfectosEnemigo(combate);

  // Si los efectos derrotan al enemigo.
  if (combate.enemigo.vida <= 0) {
    combate.terminado = true;
    combate.resultado = "victoria";

    return {
      combate,
      dano: 0,
      danoEfectos: efectos.dano,
      regeneracion,
      mensajesEfectos: efectos.mensajes,
      mensaje: `Derrotaste a ${combate.enemigo.nombre}.`
    };
  }

  // Congelación: el enemigo pierde su turno.
  if (combate.efectosEnemigo.congelado) {
    combate.efectosEnemigo.congelado.rondas--;

    if (combate.efectosEnemigo.congelado.rondas <= 0) {
      delete combate.efectosEnemigo.congelado;
    }

    combate.turno = "jugador";
    combate.rondas++;

    return {
      combate,
      dano: 0,
      regeneracion,
      mensajesEfectos: efectos.mensajes,
      mensaje: "❄️ El enemigo está congelado y pierde su turno."
    };
  }

  // Raíces: el enemigo pierde su turno.
  if (combate.efectosEnemigo.atrapado) {
    combate.efectosEnemigo.atrapado.rondas--;

    if (combate.efectosEnemigo.atrapado.rondas <= 0) {
      delete combate.efectosEnemigo.atrapado;
    }

    combate.turno = "jugador";
    combate.rondas++;

    return {
      combate,
      dano: 0,
      regeneracion,
      mensajesEfectos: efectos.mensajes,
      mensaje: "🌿 Las raíces impiden que el enemigo ataque."
    };
  }

  // Debilitamiento por Rayo.
  let ataqueEnemigo = combate.enemigo.ataque;

  if (combate.efectosEnemigo.debilitado) {
    ataqueEnemigo = Math.floor(
      ataqueEnemigo *
      (1 - combate.efectosEnemigo.debilitado.reduccion)
    );

    combate.efectosEnemigo.debilitado.rondas--;

    if (combate.efectosEnemigo.debilitado.rondas <= 0) {
      delete combate.efectosEnemigo.debilitado;
    }
  }

  let dano = Math.max(
    1,
    ataqueEnemigo - combate.jugador.defensa
  );

  // Escudo de Agua.
  const escudo = combate.efectosJugador.escudo;

  if (escudo) {
    const danoOriginal = dano;

    dano = Math.max(
      0,
      Math.floor(danoOriginal * (1 - escudo.reduccion))
    );

    const reflejo = Math.floor(
      danoOriginal * escudo.reflejo
    );

    combate.enemigo.vida = Math.max(
      0,
      combate.enemigo.vida - reflejo
    );

    escudo.rondas--;

    if (escudo.rondas <= 0) {
      delete combate.efectosJugador.escudo;
    }
  }

  combate.jugador.vida = Math.max(
    0,
    combate.jugador.vida - dano
  );

  // El reflejo puede derrotar al enemigo.
  if (combate.enemigo.vida <= 0) {
    combate.terminado = true;
    combate.resultado = "victoria";

    return {
      combate,
      dano,
      regeneracion,
      mensajesEfectos: efectos.mensajes,
      mensaje: `El reflejo del escudo derrotó a ${combate.enemigo.nombre}.`
    };
  }

  // Derrota del jugador.
  if (combate.jugador.vida <= 0) {
    combate.terminado = true;
    combate.resultado = "derrota";

    return {
      combate,
      dano,
      regeneracion,
      mensajesEfectos: efectos.mensajes,
      mensaje: "Tu personaje fue derrotado."
    };
  }

  // Comienza una nueva ronda.
  combate.turno = "jugador";
  combate.rondas++;

  return {
    combate,
    dano,
    regeneracion,
    mensajesEfectos: efectos.mensajes,
    mensaje: `Recibiste ${dano} de daño.`
  };
}

// =============================================
// BOTÍN DE MATERIALES DE CAZA
// =============================================

function obtenerBotinMateriales(enemigo) {
  if (!enemigo) {
    return [];
  }

  const nivel = Math.max(
    1,
    Number(enemigo.nivel) || 1
  );

  const cantidadBase = 1 + Math.floor(nivel / 25);

  const botin = [];

  const primerMaterial =
    MATERIALES_CAZA[
      Math.floor(Math.random() * 4)
    ];

  botin.push({
    id: primerMaterial.id,
    nombre: primerMaterial.nombre,
    descripcion: primerMaterial.descripcion,
    cantidad: cantidadBase
  });

  if (Math.random() < 0.45) {
    const segundoMaterial =
      MATERIALES_CAZA[
        Math.floor(Math.random() * 4)
      ];

    botin.push({
      id: segundoMaterial.id,
      nombre: segundoMaterial.nombre,
      descripcion: segundoMaterial.descripcion,
      cantidad: cantidadBase
    });
  }

  if (nivel >= 10 && Math.random() < 0.15) {
    const fragmento = MATERIALES_CAZA.find(
      material => material.id === "fragmento_elemental"
    );

    botin.push({
      id: fragmento.id,
      nombre: fragmento.nombre,
      descripcion: fragmento.descripcion,
      cantidad: Math.max(1, Math.floor(nivel / 50))
    });
  }

  return botin;
}

// =============================================
// BOLSAS Y CAJAS DE BOTÍN
// =============================================

function obtenerBotinEspecial(enemigo) {
  if (!enemigo) {
    return [];
  }

  const nivel = Math.max(
    1,
    Number(enemigo.nivel) || 1
  );

  const botin = [];

  let probabilidadBolsa = 0.20;

  if (nivel >= 10) probabilidadBolsa = 0.30;
  if (nivel >= 25) probabilidadBolsa = 0.40;
  if (nivel >= 50) probabilidadBolsa = 0.50;

  if (enemigo.esRey || enemigo.esBoss) {
    probabilidadBolsa = 0.70;
  }

  if (Math.random() < probabilidadBolsa) {
    botin.push({
      id: "bolsa_botin",
      nombre: "Bolsa de botín",
      cantidad: 1,
      nivelBotin: nivel
    });
  }

  let probabilidadCaja = 0.03;

  if (nivel >= 25) probabilidadCaja = 0.07;
  if (nivel >= 50) probabilidadCaja = 0.12;
  if (enemigo.esRey) probabilidadCaja = 0.18;
  if (enemigo.esBoss) probabilidadCaja = 0.35;

  if (Math.random() < probabilidadCaja) {
    botin.push({
      id: "caja_botin",
      nombre: "Caja de botín",
      cantidad: 1,
      nivelBotin: nivel
    });
  }

  return botin;
}

// =============================================
// CONTENIDO DE BOLSA DE BOTÍN
// =============================================

function abrirBolsaBotin(nivel = 1) {
  const nivelBotin = Math.max(
    1,
    Math.min(500, Number(nivel) || 1)
  );

  const recompensa = [];

  const rubies = Math.floor(
    (20 + nivelBotin * 5) *
    (0.8 + Math.random() * 0.4)
  );

  recompensa.push({
    tipo: "rubies",
    cantidad: rubies
  });

  recompensa.push({
    tipo: "experiencia",
    cantidad: Math.floor(20 + nivelBotin * 10)
  });

  if (Math.random() < 0.50) {
    recompensa.push({
      tipo: "esencia",
      rareza: "normal",
      cantidad: 1
    });
  }

  if (nivelBotin >= 25 && Math.random() < 0.20) {
    recompensa.push({
      tipo: "esencia",
      rareza: "epica",
      cantidad: 1
    });
  }

  return recompensa;
}

// =============================================
// CONTENIDO DE CAJA DE BOTÍN
// =============================================

function abrirCajaBotin(nivel = 1) {
  const nivelBotin = Math.max(
    1,
    Math.min(500, Number(nivel) || 1)
  );

  const recompensa = [];

  const rubies = Math.floor(
    (100 + nivelBotin * 15) *
    (0.8 + Math.random() * 0.4)
  );

  recompensa.push({
    tipo: "rubies",
    cantidad: rubies
  });

  recompensa.push({
    tipo: "experiencia",
    cantidad: Math.floor(100 + nivelBotin * 25)
  });

  const tirada = Math.random();

  if (tirada < 0.45) {
    recompensa.push({
      tipo: "esencia",
      rareza: "epica",
      cantidad: 1
    });
  } else if (tirada < 0.70) {
    recompensa.push({
      tipo: "esencia",
      rareza: "legendaria",
      cantidad: 1
    });
  } else if (tirada < 0.80) {
    recompensa.push({
      tipo: "esencia",
      rareza: "ur",
      cantidad: 1
    });
  } else {
    recompensa.push({
      tipo: "material",
      id: "fragmento_elemental",
      nombre: "Fragmento elemental",
      cantidad: Math.max(1, Math.floor(nivelBotin / 25))
    });
  }

  return recompensa;
}

// =============================================
// FINALIZAR COMBATE
// =============================================

function finalizarCombate(perfil, combate) {
  if (
    !perfil ||
    !combate ||
    !combate.terminado
  ) {
    return {
      error: "El combate todavía no terminó."
    };
  }

  normalizarPerfil(perfil);

  perfil.estadisticas.vida =
    combate.jugador.vida;

  // ===========================================
  // VICTORIA
  // ===========================================

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
      esRey: Boolean(combate.enemigo.esRey),
      experiencia: combate.enemigo.experiencia,
      subioNivel: resultado.subioNivel
    };
  }

  // ===========================================
  // DERROTA
  // ===========================================

  perfil.estadisticas.derrotas =
    (perfil.estadisticas.derrotas || 0) + 1;

  perfil.estadisticas.combatesPerdidos =
    (perfil.estadisticas.combatesPerdidos || 0) + 1;

  const experienciaAnterior =
    perfil.experiencia || 0;

  const perdidaExperiencia = Math.ceil(
    experienciaAnterior * 0.05
  );

  perfil.experiencia = Math.max(
    0,
    experienciaAnterior - perdidaExperiencia
  );

  perfil.regeneracion.bloqueadaHasta = 0;
  perfil.regeneracion.ultimaActualizacion = Date.now();

  return {
    perfil,
    resultado: "derrota",
    esBoss: Boolean(combate.esBoss),

    experienciaAnterior,
    perdidaExperiencia,
    experienciaRestante: perfil.experiencia,

    rubiesPerdidos: 0,
    regeneracionBloqueada: false,
    tiempoBloqueo: 0
  };
}

// =============================================
// EXPORTAR FUNCIONES
// =============================================

module.exports = {
  enemigos,
  bosses,
  MATERIALES_CAZA,
  PODERES_ELEMENTALES,
  ENFRIAMIENTO_PODER,

  buscarEnemigo,
  buscarBoss,

  adaptarEnemigo,
  listarEnemigos,
  listarBosses,
  obtenerProximoBoss,

  obtenerBonificacionesEquipamiento,
  obtenerEstadisticasJugador,

  obtenerElementosJugador,
  obtenerPoderesElementales,
  usarPoderElemental,

  obtenerBotinMateriales,
  obtenerBotinEspecial,
  abrirBolsaBotin,
  abrirCajaBotin,

  iniciarCombate,
  iniciarCombateBoss,

  actualizarRegeneracionBoss,

  atacarEnemigo,
  atacarJugador,

  finalizarCombate
};
