export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  riesgo?: string;
  fragmentos?: number;
  escalado?: boolean;
  tiempoMs?: number;
  tokensUsados?: number;
  isError?: boolean;
  timestamp: string;
}

export interface ChatResponse {
  respuesta: string;
  intent: string;
  id_sesion: number;
  fragmentos_usados: number;
  tiempo_ms: number;
  escalado: boolean;
  tokens_usados?: number;
}

export interface ChatRequest {
  id_contexto: number;
  pregunta: string;
  id_sesion?: number;
  historial?: { role: string; content: string }[];
}

