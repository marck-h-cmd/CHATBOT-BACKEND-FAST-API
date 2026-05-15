export interface Course {
  id_curso: number;
  nombre: string;
  codigo: string;
  creditos: number;
  es_activo: boolean;
  fecha_creacion: string;
}

export interface Period {
  id_periodo: number;
  nombre: string;
  es_actual: boolean;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_creacion: string;
}

export interface Enrollment {
  id_contexto: number;
  id_usuario: number;
  id_curso: number;
  id_periodo: number;
  curso: string;
  periodo: string;
  silabo_validado: boolean;
  fecha_inscripcion: string;
  pu1?: number;
  pu2?: number;
  pu3?: number;
}

export interface ContextoCursoUsuario {
  id_contexto: number;
  id_usuario: number;
  id_curso: number;
  id_periodo: number;
  pu1?: number;
  pu2?: number;
  pu3?: number;
  silabo_validado: boolean;
  fecha_creacion: string;
}
