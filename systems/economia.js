// =================================
// SLAYERS RBSN — SISTEMA DE ECONOMÍA
// =================================

// SINCRONIZAR SALDO
function sincronizarRubies(perfil) {
  if (!perfil) return;

  perfil.rubies = perfil.rubies ?? perfil.monedas ?? 0;

  // Compatibilidad con módulos anteriores
  perfil.monedas = perfil.rubies;

  perfil.banco = perfil.banco || 0;
  perfil.reserva = perfil.reserva || 0;
}

// LÍMITE DE RESERVA
function limiteReserva(perfil) {
  if (!perfil) return 0;

  const nivel = Math.min(
    500,
    Math.max(1, perfil.nivel || 1)
  );

  return nivel * 1000;
}

// CONSULTAR SALDO
function consultarSaldo(perfil) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  sincronizarRubies(perfil);

  return {
    correcto: true,
    saldo: perfil.rubies,
    banco: perfil.banco,
    reserva: perfil.reserva,
    limiteReserva: limiteReserva(perfil)
  };
}

// AGREGAR RUBÍES AL JUGADOR
function agregarRubies(perfil, cantidad) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  sincronizarRubies(perfil);

  if (
    !Number.isSafeInteger(cantidad) ||
    cantidad <= 0
  ) {
    return {
      correcto: false,
      mensaje: "La cantidad debe ser un número entero positivo."
    };
  }

  if (!Number.isSafeInteger(perfil.rubies + cantidad)) {
    return {
      correcto: false,
      mensaje: "Se alcanzó el límite de rubíes."
    };
  }

  perfil.rubies += cantidad;
  perfil.monedas = perfil.rubies;

  return {
    correcto: true,
    saldo: perfil.rubies,
    mensaje: `💎 Recibiste ${cantidad} rubíes.`
  };
}

// INGRESAR RUBÍES AL BANCO
function agregarBanco(perfil, cantidad) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  sincronizarRubies(perfil);

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "Ingresá una cantidad válida."
    };
  }

  if (perfil.rubies < cantidad) {
    return {
      correcto: false,
      mensaje: "No tenés suficientes rubíes."
    };
  }

  if (!Number.isSafeInteger(perfil.banco + cantidad)) {
    return {
      correcto: false,
      mensaje: "El banco alcanzó su límite."
    };
  }

  perfil.rubies -= cantidad;
  perfil.monedas = perfil.rubies;
  perfil.banco += cantidad;

  return {
    correcto: true,
    mensaje: `💎 Ingresaste ${cantidad} rubíes al banco.`,
    saldo: perfil.rubies,
    banco: perfil.banco
  };
}

// RETIRAR RUBÍES DEL BANCO
function retirarBanco(perfil, cantidad) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  sincronizarRubies(perfil);

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "Ingresá una cantidad válida."
    };
  }

  if (perfil.banco < cantidad) {
    return {
      correcto: false,
      mensaje: "No tenés suficientes rubíes en el banco."
    };
  }

  if (!Number.isSafeInteger(perfil.rubies + cantidad)) {
    return {
      correcto: false,
      mensaje: "Tu saldo alcanzó el límite."
    };
  }

  perfil.banco -= cantidad;
  perfil.rubies += cantidad;
  perfil.monedas = perfil.rubies;

  return {
    correcto: true,
    mensaje: `💎 Retiraste ${cantidad} rubíes del banco.`,
    saldo: perfil.rubies,
    banco: perfil.banco
  };
}

// AGREGAR RUBÍES A LA RESERVA
function agregarReserva(perfil, cantidad) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  sincronizarRubies(perfil);

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "Ingresá una cantidad válida."
    };
  }

  const limite = limiteReserva(perfil);

  if (perfil.reserva + cantidad > limite) {
    return {
      correcto: false,
      mensaje: `La reserva tiene un límite de ${limite} rubíes.`
    };
  }

  if (perfil.rubies < cantidad) {
    return {
      correcto: false,
      mensaje: "No tenés suficientes rubíes."
    };
  }

  perfil.rubies -= cantidad;
  perfil.monedas = perfil.rubies;
  perfil.reserva += cantidad;

  return {
    correcto: true,
    mensaje: `💎 Agregaste ${cantidad} rubíes a tu reserva.`,
    saldo: perfil.rubies,
    reserva: perfil.reserva,
    limiteReserva: limite
  };
}

// RETIRAR RUBÍES DE LA RESERVA
function retirarReserva(perfil, cantidad) {
  if (!perfil) {
    return {
      correcto: false,
      mensaje: "No se encontró el perfil."
    };
  }

  sincronizarRubies(perfil);

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "Ingresá una cantidad válida."
    };
  }

  if (perfil.reserva < cantidad) {
    return {
      correcto: false,
      mensaje: "No tenés suficientes rubíes en la reserva."
    };
  }

  if (!Number.isSafeInteger(perfil.rubies + cantidad)) {
    return {
      correcto: false,
      mensaje: "Tu saldo alcanzó el límite."
    };
  }

  perfil.reserva -= cantidad;
  perfil.rubies += cantidad;
  perfil.monedas = perfil.rubies;

  return {
    correcto: true,
    mensaje: `💎 Retiraste ${cantidad} rubíes de tu reserva.`,
    saldo: perfil.rubies,
    reserva: perfil.reserva
  };
}

// TRANSFERIR RUBÍES ENTRE JUGADORES
function transferir(emisor, receptor, cantidad) {
  if (!emisor || !receptor) {
    return {
      correcto: false,
      mensaje: "No se encontraron ambos perfiles."
    };
  }

  sincronizarRubies(emisor);
  sincronizarRubies(receptor);

  if (emisor.id === receptor.id) {
    return {
      correcto: false,
      mensaje: "No podés transferirte rubíes a vos mismo."
    };
  }

  if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
    return {
      correcto: false,
      mensaje: "Ingresá una cantidad válida."
    };
  }

  if (emisor.rubies < cantidad) {
    return {
      correcto: false,
      mensaje: "No tenés suficientes rubíes."
    };
  }

  if (!Number.isSafeInteger(receptor.rubies + cantidad)) {
    return {
      correcto: false,
      mensaje: "El receptor alcanzó el límite de rubíes."
    };
  }

  emisor.rubies -= cantidad;
  emisor.monedas = emisor.rubies;

  receptor.rubies += cantidad;
  receptor.monedas = receptor.rubies;

  return {
    correcto: true,
    mensaje: "Transferencia realizada correctamente.",
    saldoEmisor: emisor.rubies,
    saldoReceptor: receptor.rubies
  };
}

// COMPATIBILIDAD CON FUNCIONES ANTERIORES
function depositar(perfil, cantidad) {
  return agregarBanco(perfil, cantidad);
}

function retirar(perfil, cantidad) {
  return retirarBanco(perfil, cantidad);
}

// EXPORTAR FUNCIONES
module.exports = {
  consultarSaldo,
  agregarRubies,
  agregarBanco,
  retirarBanco,
  agregarReserva,
  retirarReserva,
  limiteReserva,
  depositar,
  retirar,
  transferir
};
