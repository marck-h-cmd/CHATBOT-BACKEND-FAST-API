export interface Metric {
  id: number;
  nombre: string;
  valor: number | string;
  fecha: string;
  categoria: string;
}

export interface ServiceDeskMetrics {
  total_solicitudes: number;
  total_incidentes: number;
  solicitudes_pendientes: number;
  tiempo_promedio_resolucion: number;
  tasa_escalamiento: number;
}

export interface UserMetrics {
  id_usuario: number;
  consultas_realizadas: number;
  cálculos_solicitados: number;
  incidentes_generados: number;
  tiempo_promedio_respuesta: number;
}

export interface SystemMetrics {
  usuarios_activos: number;
  sesiones_activas: number;
  solicitudes_hoy: number;
  disponibilidad_sistema: number;
}
