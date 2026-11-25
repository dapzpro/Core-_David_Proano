import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { RangoAforo } from './entities/rango-aforo.entity';
import { Artista } from './entities/artista.entity';
import { Inscripcion } from './entities/inscripcion.entity';
import { Resena } from './entities/resena.entity';
import { Evento } from '../events/entities/evento.entity';
import { RangoDto } from './dto';

type Base = {
  evento: Evento;
  aforoTotal: number;
  asistentes: number;
  ocupacion: number; // 0-100
  resenas: number;
  calificacion: number | null; // 0-100
  rapidez: number; // 0-100
  zonas: { id: number; nombre: string; aforo: number; asistentes: number; ocupacion: number }[];
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

@Injectable()
export class ValuationService implements OnModuleInit {
  constructor(
    private ds: DataSource,
    @InjectRepository(RangoAforo) private rangos: Repository<RangoAforo>,
    @InjectRepository(Evento) private eventos: Repository<Evento>,
    @InjectRepository(Artista) private artistas: Repository<Artista>,
    @InjectRepository(Inscripcion) private insc: Repository<Inscripcion>,
    @InjectRepository(Resena) private resenas: Repository<Resena>,
  ) {}

  // Rangos y tarifas por defecto (el admin los puede cambiar)
  async onModuleInit() {
    if ((await this.rangos.count()) === 0) {
      await this.rangos.save([
        this.rangos.create({ nombre: 'Pequeño', minAforo: 0, maxAforo: 200, tarifaBase: 500 }),
        this.rangos.create({ nombre: 'Mediano', minAforo: 201, maxAforo: 1000, tarifaBase: 1500 }),
        this.rangos.create({ nombre: 'Masivo', minAforo: 1001, maxAforo: null, tarifaBase: 4000 }),
      ]);
    }
  }

  // ---------- Rangos de aforo y tarifas base (dato sensible: define el precio de las ofertas) ----------

  getRangos() {
    return this.rangos.find({ order: { minAforo: 'ASC' } });
  }

  async setRangos(input: RangoDto[]) {
    if (!input.length) throw new BadRequestException('Debe existir al menos un rango');
    const rangos = [...input]
      .map((r) => ({ ...r, nombre: r.nombre.trim(), maxAforo: r.maxAforo ?? null }))
      .sort((a, b) => a.minAforo - b.minAforo);
    if (rangos[0].minAforo !== 0) throw new BadRequestException('El primer rango debe comenzar en 0');
    const nombres = new Set<string>();
    rangos.forEach((r, i) => {
      if (!r.nombre) throw new BadRequestException('Todos los rangos necesitan un nombre');
      const key = r.nombre.toLowerCase();
      if (nombres.has(key)) throw new BadRequestException(`El nombre "${r.nombre}" está repetido`);
      nombres.add(key);
      const last = i === rangos.length - 1;
      if (last) {
        if (r.maxAforo !== null) throw new BadRequestException('El último rango debe quedar sin límite superior');
      } else {
        if (r.maxAforo === null) throw new BadRequestException(`El rango "${r.nombre}" necesita un máximo porque no es el último`);
        if (r.maxAforo < r.minAforo) throw new BadRequestException(`En "${r.nombre}" el máximo no puede ser menor que el mínimo`);
        if (rangos[i + 1].minAforo !== r.maxAforo + 1) {
          throw new BadRequestException(
            `Hay un hueco o un traslape: después de "${r.nombre}" (hasta ${r.maxAforo}) el siguiente rango debe empezar en ${r.maxAforo + 1}`,
          );
        }
      }
    });
    await this.ds.transaction(async (m) => {
      await m.createQueryBuilder().delete().from(RangoAforo).execute();
      await m.save(RangoAforo, rangos.map((r) => m.create(RangoAforo, r)));
    });
    return this.getRangos();
  }

  // ---------- Métricas base de todos los eventos finalizados ----------

  private async baseMetrics(): Promise<Base[]> {
    const eventos = await this.eventos.find({
      where: { fechaFin: LessThan(new Date()) },
      relations: { zonas: true, artistas: true, categoria: true },
      order: { fechaInicio: 'ASC' },
    });
    if (!eventos.length) return [];
    const ids = eventos.map((e) => e.id);

    const asist = await this.insc
      .createQueryBuilder('i')
      .select('i.zonaId', 'zonaId')
      .addSelect('COUNT(*)', 'n')
      .where('i.estado = :e AND i.eventoId IN (:...ids)', { e: 'Ingresada', ids })
      .groupBy('i.zonaId')
      .getRawMany();
    const asistByZone = new Map(asist.map((r) => [Number(r.zonaId), Number(r.n)]));

    const fills = await this.insc
      .createQueryBuilder('i')
      .select('i.eventoId', 'eventoId')
      .addSelect('i.confirmadaAt', 'at')
      .where(`i.estado IN ('Confirmada','Ingresada') AND i.confirmadaAt IS NOT NULL AND i.eventoId IN (:...ids)`, { ids })
      .orderBy('i.confirmadaAt', 'ASC')
      .getRawMany();
    const fillByEvent = new Map<number, Date[]>();
    for (const f of fills) {
      const k = Number(f.eventoId);
      if (!fillByEvent.has(k)) fillByEvent.set(k, []);
      fillByEvent.get(k).push(new Date(f.at));
    }

    const rev = await this.resenas
      .createQueryBuilder('r')
      .select('r.eventoId', 'eventoId')
      .addSelect('AVG(r.calificacion)', 'avg')
      .addSelect('COUNT(*)', 'n')
      .where('r.estado = :e AND r.eventoId IN (:...ids)', { e: 'Aprobada', ids })
      .groupBy('r.eventoId')
      .getRawMany();
    const revByEvent = new Map(rev.map((r) => [Number(r.eventoId), { avg: Number(r.avg), n: Number(r.n) }]));

    return eventos.map((e) => {
      const zonas = e.zonas
        .sort((a, b) => a.id - b.id)
        .map((z) => {
          const asistentes = asistByZone.get(z.id) ?? 0;
          return { id: z.id, nombre: z.nombre, aforo: z.aforo, asistentes, ocupacion: z.aforo ? clamp((asistentes / z.aforo) * 100) : 0 };
        });
      const aforoTotal = zonas.reduce((s, z) => s + z.aforo, 0);
      const asistentes = zonas.reduce((s, z) => s + z.asistentes, 0);
      const ocupacion = aforoTotal ? clamp((asistentes / aforoTotal) * 100) : 0;
      const rv = revByEvent.get(e.id);
      const calificacion = rv ? clamp((rv.avg / 5) * 100) : null;

      // Rapidez de agotamiento: si llenó el aforo, 100 - % del tiempo de venta que tardó. Si nunca lo llenó, 0.
      let rapidez = 0;
      const dates = fillByEvent.get(e.id) ?? [];
      if (aforoTotal > 0 && dates.length >= aforoTotal) {
        const tFill = dates[aforoTotal - 1].getTime();
        const start = new Date(e.createdAt).getTime();
        const end = new Date(e.fechaInicio).getTime();
        const frac = end > start ? clamp((tFill - start) / (end - start), 0, 1) : 1;
        rapidez = (1 - frac) * 100;
      }
      return { evento: e, aforoTotal, asistentes, ocupacion, resenas: rv?.n ?? 0, calificacion, rapidez, zonas };
    });
  }

  // Popularidad de un artista según una lista de eventos finalizados (ordenados por fecha)
  private popularity(history: Base[]) {
    if (!history.length) return null;
    const occ = mean(history.map((h) => h.ocupacion));
    const cals = history.filter((h) => h.calificacion !== null).map((h) => h.calificacion as number);
    const cal = mean(cals);
    const rap = mean(history.map((h) => h.rapidez));
    const last3 = history.slice(-3);
    const prev = history.slice(0, -3);
    const delta = prev.length ? mean(last3.map((h) => h.ocupacion)) - mean(prev.map((h) => h.ocupacion)) : 0;
    const tendencia = clamp(50 + delta / 2); // 50 = neutra; sube suma, baja resta
    const popularidad = 0.4 * occ + 0.3 * cal + 0.2 * rap + 0.1 * tendencia;
    return { popularidad, ocupacionProm: occ, calificacionProm: cal, rapidezProm: rap, tendencia, delta, eventos: history.length, hayPrevios: prev.length > 0 };
  }

  private rangoFor(rangos: RangoAforo[], aforo: number) {
    return rangos.find((r) => aforo >= r.minAforo && (r.maxAforo === null || aforo <= r.maxAforo)) ?? null;
  }

  // ---------- Valoración de eventos ----------

  async events(from?: string, to?: string) {
    if (from && to && from > to) throw new BadRequestException('La fecha inicial no puede ser posterior a la final');
    const fromD = from ? new Date(`${from.slice(0, 10)}T00:00:00.000Z`) : null;
    const toD = to ? new Date(`${to.slice(0, 10)}T23:59:59.999Z`) : null;
    const [bases, rangos] = await Promise.all([this.baseMetrics(), this.getRangos()]);
    const inRange = bases.filter((b) => {
      const fin = new Date(b.evento.fechaFin);
      return (!fromD || fin >= fromD) && (!toD || fin <= toD);
    });

    const rows = inRange.map((b) => {
      const e = b.evento;
      const disponible = b.asistentes > 0 && b.resenas > 0;
      const rango = this.rangoFor(rangos, b.aforoTotal);
      const prev = (aId: number) =>
        bases.filter((x) => x.evento.id !== e.id && new Date(x.evento.fechaInicio) < new Date(e.fechaInicio) && x.evento.artistas.some((a) => a.id === aId));
      const artistas = e.artistas.map((a) => {
        const p = this.popularity(prev(a.id));
        return { id: a.id, nombre: a.nombre, popularidad: p ? r1(p.popularidad) : null };
      });
      const conHistorial = artistas.filter((a) => a.popularidad !== null);
      const popMedia = conHistorial.length ? mean(conHistorial.map((a) => a.popularidad as number)) : 0;
      let indice: number | null = null;
      let precio: number | null = null;
      if (disponible) {
        indice = 0.35 * b.ocupacion + 0.25 * (b.calificacion as number) + 0.4 * popMedia;
        precio = rango ? rango.tarifaBase * (1 + indice / 100) : null;
      }
      return {
        eventoId: e.id,
        nombre: e.nombre,
        categoria: e.categoria?.nombre ?? '',
        fechaInicio: e.fechaInicio,
        fechaFin: e.fechaFin,
        aforoTotal: b.aforoTotal,
        asistentes: b.asistentes,
        resenasAprobadas: b.resenas,
        ocupacion: r1(b.ocupacion),
        calificacion: b.calificacion === null ? null : r1(b.calificacion),
        popularidadArtistas: r1(popMedia),
        artistasSinHistorial: artistas.length - conHistorial.length,
        artistas,
        zonas: b.zonas.map((z) => ({ ...z, ocupacion: r1(z.ocupacion) })),
        rango: rango ? { id: rango.id, nombre: rango.nombre, tarifaBase: rango.tarifaBase } : null,
        disponible,
        motivo: disponible ? null : b.asistentes === 0 ? 'No disponible: sin asistentes con check-in' : 'No disponible: sin reseñas aprobadas',
        indiceValor: indice === null ? null : r1(indice),
        precioPaquete: precio === null ? null : r2(precio),
        ranking: 0,
      };
    });

    // Orden: por rango de aforo y, dentro de cada uno, por índice de valor (mayor primero)
    const orden = new Map(rangos.map((r, i) => [r.id, i]));
    rows.sort((a, b) => {
      const ra = a.rango ? orden.get(a.rango.id) : 99;
      const rb = b.rango ? orden.get(b.rango.id) : 99;
      if (ra !== rb) return ra - rb;
      if (a.disponible !== b.disponible) return a.disponible ? -1 : 1;
      return (b.indiceValor ?? -1) - (a.indiceValor ?? -1);
    });
    const counters = new Map<number, number>();
    for (const r of rows) {
      if (!r.disponible) continue;
      const k = r.rango?.id ?? -1;
      counters.set(k, (counters.get(k) ?? 0) + 1);
      r.ranking = counters.get(k);
    }
    return { rangos, eventos: rows };
  }

  async valuateOne(eventoId: number) {
    const { eventos } = await this.events();
    return eventos.find((e) => e.eventoId === eventoId) ?? null;
  }

  // ---------- Comparación de artistas ----------

  async artists() {
    const [bases, artistas] = await Promise.all([this.baseMetrics(), this.artistas.find({ order: { nombre: 'ASC' } })]);
    const rows = artistas.map((a) => {
      const history = bases.filter((b) => b.evento.artistas.some((x) => x.id === a.id));
      const p = this.popularity(history);
      let tendenciaEstado = 'sin_datos';
      if (p && p.hayPrevios) tendenciaEstado = p.delta > 5 ? 'en_alza' : p.delta < -5 ? 'en_baja' : 'estable';
      return {
        id: a.id,
        nombre: a.nombre,
        descripcion: a.descripcion,
        eventosFinalizados: history.length,
        popularidad: p ? r1(p.popularidad) : null,
        ocupacionPromedio: p ? r1(p.ocupacionProm) : null,
        calificacionPromedio: p ? r1(p.calificacionProm) : null,
        rapidezAgotamiento: p ? r1(p.rapidezProm) : null,
        cambioOcupacion: p && p.hayPrevios ? r1(p.delta) : null,
        tendencia: tendenciaEstado,
        trayectoria: history.map((h) => ({ evento: h.evento.nombre, fecha: h.evento.fechaInicio, ocupacion: r1(h.ocupacion) })),
      };
    });
    rows.sort((a, b) => (b.popularidad ?? -1) - (a.popularidad ?? -1));
    return rows;
  }
}
