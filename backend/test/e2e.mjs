const B = 'http://localhost:3000';
let pass = 0, fail = 0;
const ok = (c, msg, extra = '') => { if (c) { pass++; console.log('  ✓', msg); } else { fail++; console.log('  ✗ FALLÓ:', msg, extra); } };
async function call(method, path, token, body) {
  const r = await fetch(B + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data = null; try { data = await r.json(); } catch {}
  return { s: r.status, d: data };
}
const login = async (email, password) => (await call('POST', '/auth/login', null, { email, password })).d?.access_token;
const reg = async (n) => { const email = `t${Date.now()}${n}@test.com`; await call('POST', '/auth/register', null, { name: `Prueba Usuario${n}`, email, password: '123456' }); return { email, token: await login(email, '123456') }; };
const near = (a, b, t = 0.25) => Math.abs(a - b) <= t;
const day = 864e5;

const admin = await login('admin@admin.com', 'admin123');
ok(!!admin, 'login del admin');

console.log('\n== Roles y permisos');
const u1 = await reg(1);
ok((await call('GET', '/valuation/events', u1.token)).s === 403, 'asistente NO ve la valoración (403)');
ok((await call('POST', '/demo', u1.token)).s === 403, 'asistente NO carga datos demo (403)');
ok((await call('POST', '/registrations/checkin', u1.token, { token: 'x', eventoId: 1 })).s === 403, 'asistente NO hace check-in (403)');
ok((await call('GET', '/valuation/events')).s === 401, 'sin token (401)');

console.log('\n== Datos de demostración');
let t0 = Date.now();
let r = await call('POST', '/demo', admin);
ok(r.s === 201 && r.d.eventos === 21, `carga demo (${Date.now() - t0} ms)`, JSON.stringify(r));
ok((await call('POST', '/demo', admin)).s === 409, 'cargar dos veces da 409');

console.log('\n== Motor de valoración');
const val = (await call('GET', '/valuation/events', admin)).d;
const evs = val.eventos;
ok(evs.length === 19, 'hay 19 eventos finalizados', evs.length);
const by = (n) => evs.find((e) => e.nombre === n);
const cond = by('Íntimo Cóndor');
ok(cond.asistentes === 81 && cond.aforoTotal === 90 && near(cond.ocupacion, 90), 'ocupación = 81/90 = 90 %', JSON.stringify([cond.asistentes, cond.ocupacion]));
ok(cond.rango.nombre === 'Pequeño', 'aforo 90 → rango Pequeño');
ok(by('Gran Festival Aniversario').rango.nombre === 'Masivo', 'aforo 1100 → rango Masivo');
ok(by('Foro de Datos').rango.nombre === 'Mediano', 'aforo 350 → rango Mediano');
for (const e of evs.filter((e) => e.disponible)) {
  const esperado = 0.35 * e.ocupacion + 0.25 * e.calificacion + 0.4 * e.popularidadArtistas;
  if (!near(e.indiceValor, esperado, 0.35)) ok(false, `índice de ${e.nombre}`, `${e.indiceValor} vs ${esperado}`);
  const precio = e.rango.tarifaBase * (1 + e.indiceValor / 100);
  if (Math.abs(e.precioPaquete - precio) > 3) ok(false, `precio de ${e.nombre}`, `${e.precioPaquete} vs ${precio}`);
}
ok(true, 'índice = 35 % ocupación + 25 % calificación + 40 % popularidad (todos los eventos)');
ok(true, 'precio = tarifa base × (1 + índice/100) (todos los eventos)');
const first = by('Noche Andina I');
ok(first.popularidadArtistas === 0 && first.artistasSinHistorial === 1, 'primer evento de un artista: sin historial → popularidad 0');
const last = by('Noche Andina IV');
ok(last.popularidadArtistas > 0, 'evento posterior usa la popularidad de los anteriores', last.popularidadArtistas);
const mas = evs.filter((e) => e.rango.nombre === 'Mediano' && e.disponible);
ok(mas.every((e, i) => i === 0 || mas[i - 1].indiceValor >= e.indiceValor), 'orden por índice dentro del rango');
ok(mas[0].ranking === 1, 'ranking #1 en el rango');
console.log('    Top por rango:'); for (const n of ['Pequeño', 'Mediano', 'Masivo']) { const x = evs.filter((e) => e.rango.nombre === n && e.disponible)[0]; console.log(`     ${n}: ${x.nombre} índice ${x.indiceValor} precio $${x.precioPaquete}`); }

const rango = (await call('GET', '/valuation/events?from=2026-09-01&to=2026-09-30', admin)).d;
ok(rango.eventos.length < evs.length && rango.eventos.every((e) => e.fechaFin.slice(0, 7) === '2026-09'), 'filtro por rango de fechas', rango.eventos.length);
ok((await call('GET', '/valuation/events?from=2026-10-01&to=2026-09-01', admin)).s === 400, 'rango de fechas invertido → 400');

const arts = (await call('GET', '/valuation/artists', admin)).d;
const art = (n) => arts.find((a) => a.nombre === n);
ok(art('Luna Andina').tendencia === 'en_alza', 'Luna Andina en alza', JSON.stringify(art('Luna Andina').cambioOcupacion));
ok(art('Los Nómadas').tendencia === 'en_baja', 'Los Nómadas en baja', JSON.stringify(art('Los Nómadas').cambioOcupacion));
ok(art('Aurora Sur').tendencia === 'estable', 'Aurora Sur estable', JSON.stringify(art('Aurora Sur').cambioOcupacion));
ok(art('Dúo Cóndor').tendencia === 'sin_datos', 'Dúo Cóndor sin datos suficientes');
console.log('    Artistas:', arts.map((a) => `${a.nombre} ${a.popularidad} (${a.tendencia})`).join(' | '));

console.log('\n== Rangos y tarifas (validación en backend)');
const R = (arr) => call('PUT', '/valuation/ranges', admin, { rangos: arr });
ok((await R([{ nombre: 'A', minAforo: 5, maxAforo: null, tarifaBase: 1 }])).s === 400, 'primer rango no empieza en 0 → 400');
ok((await R([{ nombre: 'A', minAforo: 0, maxAforo: 100, tarifaBase: 1 }, { nombre: 'B', minAforo: 150, maxAforo: null, tarifaBase: 2 }])).s === 400, 'hueco entre rangos → 400');
ok((await R([{ nombre: 'A', minAforo: 0, maxAforo: 100, tarifaBase: 1 }, { nombre: 'B', minAforo: 90, maxAforo: null, tarifaBase: 2 }])).s === 400, 'traslape → 400');
ok((await R([{ nombre: 'A', minAforo: 0, maxAforo: 100, tarifaBase: -1 }, { nombre: 'B', minAforo: 101, maxAforo: null, tarifaBase: 2 }])).s === 400, 'tarifa negativa → 400');
ok((await R([{ nombre: 'A', minAforo: 0, maxAforo: 100, tarifaBase: 1 }, { nombre: 'a', minAforo: 101, maxAforo: null, tarifaBase: 2 }])).s === 400, 'nombre repetido → 400');
ok((await R([{ nombre: 'A', minAforo: 0, maxAforo: 100, tarifaBase: 1 }])).s === 400, 'último rango con límite → 400');
ok((await call('PUT', '/valuation/ranges', u1.token, { rangos: [] })).s === 403, 'asistente no cambia tarifas (403)');
const cur = (await call('GET', '/valuation/ranges', admin)).d;
ok((await R(cur)).s === 200, 'rangos válidos se guardan (200)');

console.log('\n== Usuarios del staff');
const doorEmail = `puerta${Date.now()}@test.com`, stEmail = `patro${Date.now()}@test.com`;
ok((await call('POST', '/staff', admin, { name: 'Puerta Uno', email: doorEmail, password: '123456', role: 'door' })).s === 201, 'admin crea personal de puerta');
ok((await call('POST', '/staff', admin, { name: 'Patro Uno', email: stEmail, password: '123456', role: 'stakeholder' })).s === 400, 'stakeholder sin empresa → 400');
ok((await call('POST', '/staff', admin, { name: 'Patro Uno', email: stEmail, password: '123456', role: 'stakeholder', empresa: 'Andes Bank', sector: 'Finanzas', contacto: 'a@andes.com' })).s === 201, 'admin crea stakeholder');
ok((await call('POST', '/staff', admin, { name: 'X', email: stEmail, password: '123456', role: 'door' })).s === 409, 'correo repetido → 409');
ok((await call('POST', '/staff', u1.token, { name: 'X', email: 'z@z.com', password: '123456', role: 'admin' })).s === 403, 'asistente no crea staff (403)');
const door = await login(doorEmail, '123456'), st = await login(stEmail, '123456');

console.log('\n== Inscripciones: aforo, concurrencia y lista de espera');
const cats = (await call('GET', '/categories', admin)).d;
const mk = async (nombre, days, aforo) => {
  const ev = (await call('POST', '/events', admin, { nombre, ubicacion: 'Test', fechaInicio: new Date(Date.now() + days * day).toISOString(), fechaFin: new Date(Date.now() + days * day + 36e5).toISOString(), categoriaId: cats[0].id })).d;
  const z = (await call('POST', '/zones', admin, { nombre: 'Única', aforo, precio: 10, eventoId: ev.id })).d;
  return { ev, z };
};
const E1 = await mk('Evento concurrencia', 5, 3), E2 = await mk('Otro evento', 6, 10);
const users = []; for (let i = 0; i < 10; i++) users.push(await reg(100 + i));
const res = await Promise.all(users.map((u) => call('POST', '/registrations', u.token, { zonaId: E1.z.id })));
const conf = res.filter((x) => x.d.estado === 'Confirmada').length, esp = res.filter((x) => x.d.estado === 'EnEspera').length;
ok(res.every((x) => x.s === 201), '10 peticiones simultáneas responden 201');
ok(conf === 3 && esp === 7, `aforo 3 → exactamente 3 Confirmadas y 7 en espera (hubo ${conf}/${esp})`);
const av = (await call('GET', `/registrations/availability?eventId=${E1.ev.id}`, u1.token)).d[0];
ok(av.ocupados === 3 && av.enEspera === 7 && av.disponibles === 0, 'disponibilidad: 3 ocupados, 7 en espera, 0 libres', JSON.stringify(av));
ok((await call('POST', '/registrations', users[0].token, { zonaId: E1.z.id })).s === 409, 'inscribirse dos veces → 409');

const mine = async (u) => (await call('GET', '/registrations/mine', u.token)).d;
const confirmados = []; const esperas = [];
for (const u of users) { const m = (await mine(u))[0]; (m.estado === 'Confirmada' ? confirmados : esperas).push({ u, m }); }
esperas.sort((a, b) => a.m.posicionEnEspera - b.m.posicionEnEspera);
ok(esperas[0].m.posicionEnEspera === 1 && esperas[6].m.posicionEnEspera === 7, 'posiciones de la lista de espera 1..7');
const cancelRes = await call('PATCH', `/registrations/${confirmados[0].m.id}/cancel`, confirmados[0].u.token);
ok(cancelRes.d.promovidoDeListaDeEspera === true, 'al cancelar una confirmada se promueve el primero de la lista');
ok((await mine(esperas[0].u))[0].estado === 'Confirmada', 'el #1 de la lista pasó a Confirmada');
ok((await mine(esperas[1].u))[0].estado === 'EnEspera', 'el #2 sigue en espera');
ok((await call('PATCH', `/registrations/${confirmados[0].m.id}/cancel`, confirmados[0].u.token)).s === 400, 'cancelar dos veces → 400');
ok((await call('PATCH', `/registrations/${confirmados[1].m.id}/cancel`, users.find((x) => x !== confirmados[1].u).token)).s === 404, 'no se puede cancelar la entrada de otro (404)');
const reinsc = await call('POST', '/registrations', confirmados[0].u.token, { zonaId: E1.z.id });
ok(reinsc.s === 201 && reinsc.d.estado === 'EnEspera', 'tras cancelar puede volver a inscribirse (queda en espera)');
const stressA = (await call('GET', `/registrations/availability?eventId=${E1.ev.id}`, u1.token)).d[0];
ok(stressA.ocupados === 3, 'el aforo nunca se supera', stressA.ocupados);

console.log('\n== Check-in por QR');
const a = confirmados[1]; // confirmada, evento E1
const ci = (token, eventoId, tk = door) => call('POST', '/registrations/checkin', tk, { token, eventoId });
let c = await ci(a.m.token, E2.ev.id); ok(c.d.resultado === 'otro_evento', 'QR de otro evento → otro_evento');
c = await ci('no-es-un-uuid', E1.ev.id); ok(c.d.resultado === 'invalida', 'texto que no es QR → invalida');
c = await ci('00000000-0000-4000-8000-000000000000', E1.ev.id); ok(c.d.resultado === 'invalida', 'QR inexistente → invalida');
c = await ci(esperas[2].m.token, E1.ev.id); ok(c.d.resultado === 'en_espera', 'en lista de espera → no entra');
const canc = (await mine(confirmados[0].u)).find((x) => x.estado === 'Cancelada');
c = await ci(canc.token, E1.ev.id); ok(c.d.resultado === 'cancelada', 'cancelada → no entra');
const dobles = await Promise.all([ci(a.m.token, E1.ev.id), ci(a.m.token, E1.ev.id), ci(a.m.token, E1.ev.id)]);
const validas = dobles.filter((x) => x.d.resultado === 'valida').length, usadas = dobles.filter((x) => x.d.resultado === 'ya_usada').length;
ok(validas === 1 && usadas === 2, `3 escaneos simultáneos del mismo QR → 1 válido y 2 ya usados (${validas}/${usadas})`);
c = await ci(a.m.token, E1.ev.id); ok(c.d.resultado === 'ya_usada' && !!c.d.checkedInAt && c.d.titular.startsWith('Prueba'), 'ya usada muestra titular y hora del primer ingreso', JSON.stringify(c.d));
ok((await call('GET', `/registrations/attendance?eventId=${E1.ev.id}`, door)).d.ingresados === 1, 'contador de ingresados = 1');
ok((await ci(a.m.token, E1.ev.id, admin)).s === 201, 'el admin también puede escanear');

console.log('\n== Reseñas y moderación');
const rv = (u, ins, cal = 5) => call('POST', '/reviews', u.token, { inscripcionId: ins, calificacion: cal, comentario: 'Muy bueno' });
const other = confirmados[2];
ok((await rv(other.u, other.m.id)).s === 400, 'reseñar sin haber ingresado → 400');
ok((await rv(a.u, other.m.id)).s === 404, 'reseñar la inscripción de otro → 404');
ok((await rv(a.u, a.m.id, 9)).s === 400, 'calificación fuera de 1-5 → 400');
const rr = await rv(a.u, a.m.id, 4); ok(rr.s === 201 && rr.d.estado === 'Pendiente', 'reseña válida queda Pendiente');
ok((await rv(a.u, a.m.id)).s === 409, 'segunda reseña de la misma inscripción → 409');
ok((await call('GET', `/reviews/event/${E1.ev.id}`, u1.token)).d.length === 0, 'una reseña pendiente no es pública');
ok((await call('PATCH', `/reviews/${rr.d.id}/moderate`, a.u.token, { estado: 'Aprobada' })).s === 403, 'asistente no modera (403)');
ok((await call('PATCH', `/reviews/${rr.d.id}/moderate`, admin, { estado: 'Hola' })).s === 400, 'estado inválido → 400');
const mo = await call('PATCH', `/reviews/${rr.d.id}/moderate`, admin, { estado: 'Aprobada', respuestaAdmin: '¡Gracias!' });
ok(mo.d.estado === 'Aprobada' && mo.d.respuestaAdmin === '¡Gracias!' && mo.d.moderadaPorId, 'admin aprueba y responde');
const pub = (await call('GET', `/reviews/event/${E1.ev.id}`, u1.token)).d;
ok(pub.length === 1 && pub[0].autor === 'Prueba', 'aprobada → pública, solo con el primer nombre');
ok((await call('GET', '/reviews?estado=Pendiente', admin)).d.length >= 6, 'admin ve las pendientes de la demo');

console.log('\n== Ofertas de patrocinio');
const stks = (await call('GET', '/staff/stakeholders', admin)).d; const stk = stks.filter((s) => s.empresa === 'Andes Bank').pop();
const target = by('Noche Andina IV');
ok((await call('POST', '/offers', admin, { eventoId: E1.ev.id, stakeholderId: stk.id })).s === 400, 'evento no finalizado → 400');
const sinRes = evs.find((e) => !e.disponible); 
const of = await call('POST', '/offers', admin, { eventoId: target.eventoId, stakeholderId: stk.id });
ok(of.s === 201 && of.d.precio === target.precioPaquete && of.d.indiceValor === target.indiceValor, 'oferta: precio e índice calculados por el servidor', JSON.stringify(of.d));
ok((await call('POST', '/offers', admin, { eventoId: target.eventoId, stakeholderId: stk.id })).s === 409, 'oferta duplicada publicada → 409');
ok((await call('POST', '/offers', u1.token, { eventoId: 1, stakeholderId: 1 })).s === 403, 'asistente no publica ofertas (403)');
const mineO = (await call('GET', '/offers/mine', st)).d; ok(mineO.length === 1 && mineO[0].estado === 'Publicada', 'stakeholder ve su oferta');
ok((await call('PATCH', `/offers/${of.d.id}/respond`, admin, { accion: 'aceptar' })).s === 403, 'admin no responde ofertas (403)');
ok((await call('PATCH', `/offers/${of.d.id}/respond`, st, { accion: 'quizas' })).s === 400, 'acción inválida → 400');
ok((await call('PATCH', `/offers/${of.d.id}/respond`, st, { accion: 'aceptar' })).d.estado === 'Aceptada', 'stakeholder acepta');
ok((await call('PATCH', `/offers/${of.d.id}/respond`, st, { accion: 'rechazar' })).s === 400, 'ya respondida → 400');
ok((await call('GET', '/valuation/events', st)).s === 200, 'stakeholder ve el ranking');
ok((await call('GET', '/reviews', st)).s === 403, 'stakeholder no ve la moderación (403)');

console.log('\n== Reglas de eventos y artistas');
const art2 = (await call('GET', '/artists', admin)).d;
ok((await call('PUT', `/events/${E2.ev.id}/artists`, admin, { artistaIds: [art2[0].id, art2[1].id] })).s === 200, 'asignar artistas a un evento');
ok((await call('PUT', `/events/${E2.ev.id}/artists`, admin, { artistaIds: [999999] })).s === 400, 'artista inexistente → 400');
ok((await call('GET', '/events', admin)).d.find((e) => e.id === E2.ev.id).artistas.length === 2, 'el evento lista sus artistas');
ok((await call('POST', '/artists', admin, { nombre: 'Luna Andina' })).s === 409, 'artista repetido → 409');

console.log('\n== Limpieza de demo');
const cl = await call('DELETE', '/demo', admin);
ok(cl.s === 200 && cl.d.eventos === 0 && cl.d.asistentes === 0, 'borrar datos demo', JSON.stringify(cl.d));
ok((await call('GET', '/valuation/events', admin)).d.eventos.length === 0, 'sin eventos finalizados tras limpiar');
ok((await call('GET', '/events', admin)).d.length >= 2, 'los eventos reales no se borran');
ok((await call('POST', '/demo', admin)).s === 201, 'se puede volver a cargar la demo');

console.log(`\n${pass} correctas, ${fail} fallidas`);
process.exit(fail ? 1 : 0);
