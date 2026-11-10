// Ordenar perfiles por nivel
function rankingPorNivel(perfiles) {
  return [...perfiles]
    .sort((a, b) => {
      if (b.nivel !== a.nivel) {
        return b.nivel - a.nivel;
      }

      return b.experiencia - a.experiencia;
    })
    .map((perfil, index) => ({
      posicion: index + 1,
      nombre: perfil.nombre,
      nivel: perfil.nivel,
      experiencia: perfil.experiencia
    }));
}

// Ordenar perfiles por victorias
function rankingPorVictorias(perfiles) {
  return [...perfiles]
    .sort((a, b) => {
      return (
        (b.estadisticas?.victorias || 0) -
        (a.estadisticas?.victorias || 0)
      );
    })
    .map((perfil, index) => ({
      posicion: index + 1,
      nombre: perfil.nombre,
      victorias: perfil.estadisticas?.victorias || 0,
      derrotas: perfil.estadisticas?.derrotas || 0
    }));
}

// Ordenar perfiles por monedas
function rankingPorMonedas(perfiles) {
  return [...perfiles]
    .sort((a, b) => b.monedas - a.monedas)
    .map((perfil, index) => ({
      posicion: index + 1,
      nombre: perfil.nombre,
      monedas: perfil.monedas
    }));
}

// Mostrar ranking en formato de texto
function mostrarRanking(ranking, tipo) {
  if (!ranking || ranking.length === 0) {
    return "Todavía no hay jugadores en el ranking.";
  }

  let titulo = "🏆 RANKING";

  if (tipo === "nivel") titulo = "🏆 RANKING POR NIVEL";
  if (tipo === "victorias") titulo = "⚔️ RANKING POR VICTORIAS";
  if (tipo === "monedas") titulo = "💰 RANKING POR MONEDAS";

  const lista = ranking.slice(0, 10).map(jugador => {
    let detalle = "";

    if (tipo === "nivel") {
      detalle = `Nivel ${jugador.nivel} | ${jugador.experiencia} XP`;
    } else if (tipo === "victorias") {
      detalle = `${jugador.victorias} victorias | ${jugador.derrotas} derrotas`;
    } else if (tipo === "monedas") {
      detalle = `${jugador.monedas} monedas`;
    }

    return `${jugador.posicion}. ${jugador.nombre} — ${detalle}`;
  });

  return `${titulo}\n\n${lista.join("\n")}`;
}

module.exports = {
  rankingPorNivel,
  rankingPorVictorias,
  rankingPorMonedas,
  mostrarRanking
};
