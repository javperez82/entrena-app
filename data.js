// ===== ENTRENA · Datos del programa de Javier =====
// Programa de fuerza progresiva 4 días/semana · imágenes: Free Exercise DB (licencia abierta)

const EJERCICIOS = {
  press_banca_mancuernas: { es: 'Press de banca con mancuernas', nota: 'Baja controlado, codos a ~45°. Exhala al empujar.' },
  press_militar_mancuernas: { es: 'Press militar sentado', nota: 'Respaldo alto. No arquees la espalda baja.' },
  jalon_al_pecho: { es: 'Jalón al pecho', nota: 'Pecho arriba, jala hacia la clavícula.' },
  remo_maquina: { es: 'Remo en máquina', nota: 'Aprieta escápulas 1 segundo al final.' },
  elevaciones_laterales: { es: 'Elevaciones laterales', nota: 'Peso ligero, control total, sin balanceo.' },
  triceps_polea: { es: 'Tríceps en polea', nota: 'Codos pegados al cuerpo.' },
  prensa_pierna: { es: 'Prensa de pierna', nota: 'Pies a la anchura de hombros, baja controlado.' },
  peso_muerto_rumano: { es: 'Peso muerto rumano c/ mancuernas', nota: 'Espalda recta; siente el estiramiento en femorales.' },
  extension_pierna: { es: 'Extensión de pierna', nota: 'Pausa breve arriba.' },
  curl_femoral: { es: 'Curl femoral', nota: 'Sin despegar la cadera del banco.' },
  pantorrilla_pie: { es: 'Pantorrilla de pie', nota: 'Pausa 1 seg arriba y abajo.' },
  plancha: { es: 'Plancha abdominal', nota: 'Cuerpo en línea recta. Suma 10 seg cada semana.', unidad: 'seg' },
  remo_barra: { es: 'Remo con barra', nota: 'El pesado del día: técnica impecable, exhala al jalar.' },
  press_inclinado_mancuernas: { es: 'Press inclinado c/ mancuernas', nota: 'Banca a 30°.' },
  jalon_neutro: { es: 'Jalón agarre neutro', nota: 'Alternativa: dominadas asistidas.' },
  press_pecho_maquina: { es: 'Press de pecho en máquina', nota: 'Rango completo, sin rebotar.' },
  curl_biceps: { es: 'Curl de bíceps c/ mancuernas', nota: 'Sin balancear el torso.' },
  face_pull: { es: 'Face pull en polea', nota: 'Peso ligero. Clave para la salud del hombro.' },
  sentadilla_goblet: { es: 'Sentadilla goblet', nota: 'Semanas 3-4: pasa a barra si la técnica va sólida.', alt: 'sentadilla_barra' },
  sentadilla_barra: { es: 'Sentadilla con barra', nota: 'Empieza ligero. Exhala al subir, nunca aguantes el aire.' },
  zancadas_mancuernas: { es: 'Zancadas con mancuernas', nota: 'Si molestan las rodillas: prensa a una pierna.', porLado: true },
  hip_thrust: { es: 'Hip thrust con barra', nota: 'Aprieta glúteo 1 seg arriba.' },
  pantorrilla_sentado: { es: 'Pantorrilla sentado', nota: 'Rango completo.' },
  elevacion_piernas: { es: 'Elevación de piernas', nota: 'Colgado o en banco; sin impulso.' },
};

const PLAN = {
  torso_a: { nombre: 'Torso A', sub: 'énfasis empuje', ejercicios: [
    { slug: 'press_banca_mancuernas', series: 3, reps: [8, 10] },
    { slug: 'press_militar_mancuernas', series: 3, reps: [8, 10] },
    { slug: 'jalon_al_pecho', series: 3, reps: [10, 12] },
    { slug: 'remo_maquina', series: 3, reps: [10, 12] },
    { slug: 'elevaciones_laterales', series: 2, reps: [12, 15] },
    { slug: 'triceps_polea', series: 2, reps: [12, 15] },
  ]},
  pierna_a: { nombre: 'Pierna A', sub: 'cadena completa', ejercicios: [
    { slug: 'prensa_pierna', series: 3, reps: [10, 12] },
    { slug: 'peso_muerto_rumano', series: 3, reps: [8, 10] },
    { slug: 'extension_pierna', series: 2, reps: [12, 15] },
    { slug: 'curl_femoral', series: 2, reps: [12, 15] },
    { slug: 'pantorrilla_pie', series: 3, reps: [12, 15] },
    { slug: 'plancha', series: 3, reps: [30, 60] },
  ]},
  torso_b: { nombre: 'Torso B', sub: 'énfasis jalón', ejercicios: [
    { slug: 'remo_barra', series: 3, reps: [8, 10] },
    { slug: 'press_inclinado_mancuernas', series: 3, reps: [8, 10] },
    { slug: 'jalon_neutro', series: 3, reps: [10, 12] },
    { slug: 'press_pecho_maquina', series: 2, reps: [12, 15] },
    { slug: 'curl_biceps', series: 2, reps: [12, 15] },
    { slug: 'face_pull', series: 2, reps: [15, 15] },
  ]},
  pierna_b: { nombre: 'Pierna B', sub: 'glúteo y unilateral', ejercicios: [
    { slug: 'sentadilla_goblet', series: 3, reps: [8, 10] },
    { slug: 'zancadas_mancuernas', series: 2, reps: [10, 10] },
    { slug: 'hip_thrust', series: 3, reps: [10, 12] },
    { slug: 'curl_femoral', series: 2, reps: [12, 15] },
    { slug: 'pantorrilla_sentado', series: 3, reps: [15, 15] },
    { slug: 'elevacion_piernas', series: 3, reps: [10, 12] },
  ]},
};

// Día de la semana (0=Dom) → tipo de jornada
const CALENDARIO = { 1: 'torso_a', 2: 'pierna_a', 3: 'caminata', 4: 'torso_b', 5: 'pierna_b', 6: 'caminata', 0: 'descanso' };

// Progresión por semana del programa
const SEMANAS = {
  1: { titulo: 'Reconocimiento', rir: 'RIR 4 · solo 2 series por ejercicio', seriesFactor: -1, tip: 'Encuentra tus pesos de trabajo. Que se sienta cómodo-retador. Anota todo.' },
  2: { titulo: 'Volumen completo', rir: 'RIR 3 · series completas', seriesFactor: 0, tip: 'Mismos pesos de la semana 1. Se sentirá más fácil: eso es adaptación.' },
  3: { titulo: 'Primera progresión', rir: 'RIR 2-3', seriesFactor: 0, tip: 'Si llegaste al tope de reps en todas las series: sube el peso y vuelve al mínimo del rango.' },
  4: { titulo: 'Consolidación', rir: 'RIR 2-3', seriesFactor: 0, tip: 'Progresión doble: tope de reps → sube peso. Tu registro es la evidencia para tus médicos.' },
};

// Medicamentos según receta vigente (Dr. Mondragón 17/06/2026 y Centro Metabólico 04/07/2026).
// Recordatorios personales: cualquier cambio de dosis lo define tu médico.
const MEDS_DIARIOS = [
  { id: 'valsartan', nombre: 'Valsartán 80 mg', momento: 'Mañana' },
  { id: 'rosuvastatina', nombre: 'Rosuvastatina 20 mg', momento: 'Mañana' },
  { id: 'aminoter', nombre: 'Aminoter D · 1 cápsula', momento: 'Con el desayuno' },
  { id: 'proteina', nombre: 'Proteína 1 scoop en 300 ml de agua', momento: 'Post-entreno / desayuno' },
  { id: 'gomitas_multi', nombre: 'Multivitamínico · 2 gomitas', momento: 'Durante el día' },
  { id: 'gomitas_biotina', nombre: 'Biotina con zinc · 2 gomitas', momento: 'Durante el día' },
  { id: 'bezafibrato', nombre: 'Bezafibrato 200 mg', momento: 'Noche' },
];

const INYECTABLES = [
  { id: 'mounjaro', nombre: 'Mounjaro (tirzepatida)', cadaDias: 7, detalle: 'SC · 1 vez por semana' },
  { id: 'testosterona', nombre: 'Enantato de testosterona 250 mg', cadaDias: 21, detalle: 'IM · cada 3 semanas' },
];

// Biblioteca inicial de meditaciones (Simply Still · Nick Keomahavong)
const MEDITACIONES_SEED = [
  { titulo: 'Morning Mind Shower · despertar', url: 'https://nickkeomahavong.com/guided-meditation/morning/1' },
  { titulo: 'A Moment of Peace · mañana', url: 'https://nickkeomahavong.com/guided-meditation/morning/3' },
  { titulo: 'Eye of the Storm · estrés', url: 'https://nickkeomahavong.com/guided-meditation/stress/1' },
  { titulo: 'Soothing the Overactive Mind', url: 'https://nickkeomahavong.com/guided-meditation/stress/4' },
  { titulo: 'Restful Sleep · dormir', url: 'https://nickkeomahavong.com/guided-meditation/sleep/2' },
  { titulo: '1 Minute Reset · grounding', url: 'https://nickkeomahavong.com/guided-meditation/grounding/2' },
];

const RESPIRACIONES = {
  '478': { nombre: 'Respiración 4-7-8', fases: [['Inhala', 4], ['Sostén', 7], ['Exhala', 8]], ciclos: 6, desc: 'Para dormir y bajar revoluciones. Ideal antes de acostarte.' },
  caja: { nombre: 'Respiración de caja', fases: [['Inhala', 4], ['Sostén', 4], ['Exhala', 4], ['Sostén', 4]], ciclos: 8, desc: 'Para el estrés del día. Discreta: puedes hacerla en cualquier lugar.' },
};
