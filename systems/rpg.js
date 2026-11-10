const {
  agregarExperiencia
} = require("./perfil");

// Enemigos disponibles
const enemigos = [
  {
    id: "slime",
    nombre: "Slime",
    nivel: 1,
    vida: 50,
    ataque: 8,
    defensa: 2,
    experiencia: 25
  },
  {
    id: "goblin",
    nombre: "Goblin",
    nivel: 2,
    vida: 80,
    ataque: 12,
    defensa: 4,
    experiencia: 40
  },
  {
    id: "lobo",
    nombre: "Lobo salvaje",
    nivel: 3,
    vida: 110,
    ataque: 16,
    defensa: 6,
    experiencia: 60
  },
  {
    id: "orco",
    nombre: "Orco",
    nivel: 5,
    vida: 180,
    ataque: 22,
    defensa: 10,
    experiencia: 100
  }
];

// Buscar enemigo
function buscarEnemigo(enemigoId) {
  return enemigos.find(
    enemigo => enemigo.id === enemigoId
  ) || null;
}

// Listar enemigos
function listarEnemigos() {
  return enemigos.map(enemigo => ({
    ...enemigo
  }));
}

// Iniciar combate
function iniciarCombate(perfil, enemigoId) {
  const enemigo = buscarEnemigo(enemigoId);

  if (!enemigo) {
    return {
      error: "No se encontró ese enemigo."
    };
  }

  if (!perfil || !perfil.estadisticas) {
    return {
      error: "El perfil del jugador no es válido."
    };
  }

  if (perfil.estadisticas.vida <= 0) {
    return {
      error: "Tu personaje no tiene vida suficiente."
    };
  }

  return {
    terminado: false,
    turno: "jugador",
    jugador: {
      vida: perfil.estadisticas.vida,
      vidaMaxima: perfil.estadisticas.vida,
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
    combate.jugador.ataque - combate.enemigo.defensa
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
    combate.enemigo.ataque - combate.jugador.defensa
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

  perfil.estadisticas.vida = combate.jugador.vida;

  if (combate.resultado === "victoria") {
    perfil.estadisticas.victorias++;

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

  perfil.estadisticas.derrotas++;

  return {
    perfil,
    resultado: "derrota"
  };
}

module.exports = {
  enemigos,
  buscarEnemigo,
  listarEnemigos,
  iniciarCombate,
  atacarEnemigo,
  atacarJugador,
  finalizarCombate
};
