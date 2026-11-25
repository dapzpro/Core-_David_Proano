import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Artista } from './entities/artista.entity';
import { Inscripcion } from './entities/inscripcion.entity';
import { Resena } from './entities/resena.entity';
import { Evento } from '../events/entities/evento.entity';
import { ZonaEntrada } from '../events/entities/zona-entrada.entity';
import { CategoriaEvento } from '../events/entities/categoria-evento.entity';

const DAY = 86_400_000;
const HOUR = 3_600_000;

// Generador pseudoaleatorio con semilla: los datos de demostración son siempre los mismos
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ARTISTAS = [
  ['Luna Andina', 'Folk andino contemporáneo'],
  ['Los Nómadas', 'Rock alternativo'],
  ['Aurora Sur', 'Pop y música electrónica'],
  ['Compañía Mirlo', 'Teatro clásico y contemporáneo'],
  ['Dúo Cóndor', 'Acústico íntimo'],
  ['Club Atlético Quitu', 'Equipo de fútbol local'],
  ['Dra. Elena Paz', 'Conferencista en innovación y datos'],
];

type Z = [string, number, number];
type EvDef = {
  nombre: string; cat: string; dias: number; artistas: number[]; zonas: Z[];
  fill: number; occ: number; fillFrac?: number; rating: number; pendientes?: number;
};
const PASADOS: EvDef[] = [
  { nombre: 'Noche Andina I', cat: 'Concierto', dias: 130, artistas: [0], zonas: [['General', 300, 15], ['VIP', 60, 40]], fill: 0.75, occ: 0.45, rating: 3.9 },
  { nombre: 'Nómadas en Vivo', cat: 'Concierto', dias: 120, artistas: [1], zonas: [['General', 800, 20], ['VIP', 150, 55]], fill: 1, occ: 0.8, fillFrac: 0.35, rating: 4.4 },
  { nombre: 'Festival Sur I', cat: 'Concierto', dias: 110, artistas: [2], zonas: [['General', 500, 12], ['Preferencia', 200, 30]], fill: 0.9, occ: 0.6, rating: 4.0 },
  { nombre: 'Noche de Teatro Clásico', cat: 'Teatro', dias: 100, artistas: [3], zonas: [['Platea', 120, 25], ['Balcón', 60, 15]], fill: 1, occ: 0.7, fillFrac: 0.5, rating: 4.5 },
  { nombre: 'Noche Andina II', cat: 'Concierto', dias: 95, artistas: [0], zonas: [['General', 300, 15], ['VIP', 60, 40]], fill: 0.85, occ: 0.55, rating: 4.1 },
  { nombre: 'Clásico Quiteño', cat: 'Deportes', dias: 90, artistas: [5], zonas: [['Tribuna', 700, 10], ['Palco', 100, 60], ['General', 400, 6]], fill: 0.55, occ: 0.5, rating: 3.8 },
  { nombre: 'Nómadas Reloaded', cat: 'Concierto', dias: 85, artistas: [1], zonas: [['General', 800, 20], ['VIP', 150, 55]], fill: 1, occ: 0.72, fillFrac: 0.5, rating: 4.1 },
  { nombre: 'Congreso de Innovación', cat: 'Conferencia', dias: 80, artistas: [6], zonas: [['General', 250, 30], ['Estudiantes', 100, 10]], fill: 0.8, occ: 0.5, rating: 4.2 },
  { nombre: 'Íntimo Cóndor', cat: 'Concierto', dias: 75, artistas: [4], zonas: [['Única', 90, 18]], fill: 1, occ: 0.9, fillFrac: 0.25, rating: 4.7 },
  { nombre: 'Festival Sur II', cat: 'Concierto', dias: 70, artistas: [2], zonas: [['General', 500, 12], ['Preferencia', 200, 30]], fill: 0.9, occ: 0.62, rating: 4.0 },
  { nombre: 'Noche Andina III', cat: 'Concierto', dias: 60, artistas: [0], zonas: [['General', 300, 15], ['VIP', 60, 40]], fill: 0.9, occ: 0.68, rating: 4.5 },
  { nombre: 'Nómadas Tour', cat: 'Concierto', dias: 50, artistas: [1], zonas: [['General', 800, 20], ['VIP', 150, 55]], fill: 0.85, occ: 0.6, rating: 3.9 },
  { nombre: 'Teatro Clásico II', cat: 'Teatro', dias: 45, artistas: [3], zonas: [['Platea', 120, 25], ['Balcón', 60, 15]], fill: 1, occ: 0.78, fillFrac: 0.4, rating: 4.6 },
  { nombre: 'Clásico Quiteño II', cat: 'Deportes', dias: 40, artistas: [5], zonas: [['Tribuna', 700, 10], ['Palco', 100, 60], ['General', 400, 6]], fill: 0.58, occ: 0.55, rating: 3.9 },
  { nombre: 'Festival Sur III', cat: 'Concierto', dias: 35, artistas: [2], zonas: [['General', 500, 12], ['Preferencia', 200, 30]], fill: 0.9, occ: 0.6, rating: 4.1 },
  { nombre: 'Foro de Datos', cat: 'Conferencia', dias: 30, artistas: [6], zonas: [['General', 250, 30], ['Estudiantes', 100, 10]], fill: 0.85, occ: 0.6, rating: 4.4 },
  { nombre: 'Noche Andina IV', cat: 'Concierto', dias: 25, artistas: [0], zonas: [['General', 300, 15], ['VIP', 60, 40]], fill: 1, occ: 0.85, fillFrac: 0.3, rating: 4.8, pendientes: 3 },
  { nombre: 'Nómadas Despedida', cat: 'Concierto', dias: 20, artistas: [1], zonas: [['General', 800, 20], ['VIP', 150, 55]], fill: 0.7, occ: 0.48, rating: 3.7 },
  { nombre: 'Gran Festival Aniversario', cat: 'Concierto', dias: 15, artistas: [0, 1, 2], zonas: [['General', 900, 25], ['VIP', 200, 70]], fill: 0.6, occ: 0.55, rating: 4.3, pendientes: 3 },
];

const COMENTARIOS: Record<number, string[]> = {
  1: ['No cumplió lo prometido.', 'La organización fue deficiente.'],
  2: ['Podría mejorar bastante.', 'Esperaba más del espectáculo.'],
  3: ['Estuvo bien, sin más.', 'Cumplió, aunque con filas largas.'],
  4: ['Muy buena experiencia.', 'Buen sonido y buen ambiente.', 'Volvería sin dudarlo.'],
  5: ['Excelente, superó mis expectativas.', 'Una noche inolvidable.', 'Todo perfecto, felicitaciones.'],
};

@Injectable()
export class DemoService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Artista) private artistas: Repository<Artista>,
    @InjectRepository(Evento) private eventos: Repository<Evento>,
    @InjectRepository(ZonaEntrada) private zonas: Repository<ZonaEntrada>,
    @InjectRepository(CategoriaEvento) private categorias: Repository<CategoriaEvento>,
    @InjectRepository(Inscripcion) private insc: Repository<Inscripcion>,
    @InjectRepository(Resena) private resenas: Repository<Resena>,
  ) {}

  async status() {
    return {
      cargados: (await this.eventos.count({ where: { demo: true } })) > 0,
      eventos: await this.eventos.count({ where: { demo: true } }),
      artistas: await this.artistas.count({ where: { demo: true } }),
      asistentes: await this.users.count({ where: { demo: true } }),
    };
  }

  async clear() {
    // Los eventos demo arrastran por cascada zonas, inscripciones, reseñas y ofertas
    await this.eventos.delete({ demo: true });
    await this.users.delete({ demo: true });
    await this.artistas.delete({ demo: true });
    return this.status();
  }

  private async bulk<T>(repo: Repository<any>, rows: T[], size = 400) {
    const ids: number[] = [];
    for (let i = 0; i < rows.length; i += size) {
      const res = await repo.insert(rows.slice(i, i + size));
      ids.push(...res.identifiers.map((x: any) => x.id));
    }
    return ids;
  }

  async seed() {
    if ((await this.eventos.count({ where: { demo: true } })) > 0) {
      throw new ConflictException('Los datos de demostración ya están cargados');
    }
    try {
      return await this.doSeed();
    } catch (e) {
      await this.clear(); // si falla a medias, no dejamos datos huérfanos
      throw e;
    }
  }

  private async doSeed() {
    const rand = rng(42);
    const now = Date.now();
    const cats = new Map((await this.categorias.find()).map((c) => [c.nombre, c.id]));

    const artistas = await this.artistas.save(ARTISTAS.map(([nombre, descripcion]) => this.artistas.create({ nombre, descripcion, demo: true })));

    const hash = await bcrypt.hash(randomUUID(), 10);
    const pool = await this.bulk(
      this.users,
      Array.from({ length: 1000 }, (_, i) => ({ name: `Asistente ${i + 1}`, email: `demo${i + 1}@demo.local`, password: hash, role: 'user', demo: true })),
    );

    let evIdx = 0;
    for (const def of PASADOS) {
      const start = new Date(now - def.dias * DAY);
      const end = new Date(start.getTime() + 3 * HOUR);
      const created = new Date(start.getTime() - 35 * DAY);
      const window = start.getTime() - created.getTime();
      const evento = await this.eventos.save(
        this.eventos.create({
          nombre: def.nombre,
          descripcion: `Evento de demostración de la categoría ${def.cat}.`,
          ubicacion: 'Quito, Ecuador',
          fechaInicio: start,
          fechaFin: end,
          estado: 'Finalizado',
          accesibilidad: evIdx % 2 === 0,
          categoriaId: cats.get(def.cat),
          artistas: def.artistas.map((i) => artistas[i]),
          createdAt: created,
          demo: true,
        }),
      );
      const zonas = await this.zonas.save(def.zonas.map(([nombre, aforo, precio]) => this.zonas.create({ nombre, aforo, precio, eventoId: evento.id })));

      const rows: any[] = [];
      let counter = 0;
      const offset = evIdx * 37;
      zonas.forEach((z) => {
        const nConf = Math.round(z.aforo * def.fill);
        const nAtt = Math.min(nConf, Math.round(z.aforo * def.occ));
        const frac = def.fill >= 1 ? def.fillFrac ?? 1 : 0.9;
        for (let j = 0; j < nConf; j++) {
          const ingresada = j < nAtt;
          const conf = new Date(created.getTime() + ((j + 1) / nConf) * frac * window);
          rows.push({
            token: randomUUID(),
            estado: ingresada ? 'Ingresada' : 'Confirmada',
            usuarioId: pool[(offset + counter++) % pool.length],
            zonaId: z.id,
            eventoId: evento.id,
            confirmadaAt: conf,
            createdAt: conf,
            checkedInAt: ingresada ? new Date(start.getTime() + rand() * HOUR) : null,
          });
        }
      });
      const ids = await this.bulk(this.insc, rows);
      const asistentes = ids.filter((_, i) => rows[i].estado === 'Ingresada');

      const n = Math.min(asistentes.length, 18 + ((evIdx * 7) % 25));
      const step = asistentes.length / n;
      const reviews = Array.from({ length: n }, (_, k) => {
        const cal = Math.min(5, Math.max(1, Math.round(def.rating + (rand() - 0.5) * 2.4)));
        const opciones = COMENTARIOS[cal];
        return {
          inscripcionId: asistentes[Math.floor(k * step)],
          eventoId: evento.id,
          calificacion: cal,
          comentario: opciones[Math.floor(rand() * opciones.length)],
          estado: k >= n - (def.pendientes ?? 0) ? 'Pendiente' : 'Aprobada',
          createdAt: new Date(end.getTime() + (k + 1) * HOUR),
        };
      });
      await this.bulk(this.resenas, reviews);
      evIdx++;
    }

    // Eventos futuros: uno para inscribirse y otro con cupo lleno y lista de espera
    const futuros = [
      { nombre: 'Festival de Música Andina', cat: 'Concierto', dias: 25, artistas: [0, 2], zonas: [['General', 500, 22], ['VIP', 80, 60]] as Z[], conf: 120 },
      { nombre: 'Taller Cerrado de Actuación', cat: 'Teatro', dias: 10, artistas: [3], zonas: [['Sala', 5, 20]] as Z[], conf: 5, espera: 2 },
    ];
    for (const f of futuros) {
      const start = new Date(now + f.dias * DAY);
      const evento = await this.eventos.save(
        this.eventos.create({
          nombre: f.nombre,
          descripcion: 'Evento de demostración con inscripciones abiertas.',
          ubicacion: 'Quito, Ecuador',
          fechaInicio: start,
          fechaFin: new Date(start.getTime() + 3 * HOUR),
          accesibilidad: true,
          categoriaId: cats.get(f.cat),
          artistas: f.artistas.map((i) => artistas[i]),
          createdAt: new Date(now - 3 * DAY),
          demo: true,
        }),
      );
      const zonas = await this.zonas.save(f.zonas.map(([nombre, aforo, precio]) => this.zonas.create({ nombre, aforo, precio, eventoId: evento.id })));
      const rows: any[] = [];
      zonas.forEach((z, zi) => {
        const nConf = zi === 0 ? f.conf : 0;
        for (let j = 0; j < nConf + (zi === 0 ? f.espera ?? 0 : 0); j++) {
          const espera = j >= nConf;
          const t = new Date(now - 2 * DAY + j * 60_000);
          rows.push({
            token: randomUUID(),
            estado: espera ? 'EnEspera' : 'Confirmada',
            usuarioId: pool[(300 + j) % pool.length],
            zonaId: z.id,
            eventoId: evento.id,
            confirmadaAt: espera ? null : t,
            createdAt: t,
            checkedInAt: null,
          });
        }
      });
      await this.bulk(this.insc, rows);
    }
    return this.status();
  }
}
