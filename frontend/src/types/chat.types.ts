export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  riesgo?: string;
  fragmentos?: number;
  escalado?: boolean;
  tiempoMs?: number;
  isError?: boolean;
  timestamp: string;
}

export interface ChatResponse {
  respuesta: string;
  intent: string;
  fragmentos_usados: number;
  tiempo_ms: number;
  escalado: boolean;
}

export interface ChatRequest {
  id_contexto: number;
  pregunta: string;
}
