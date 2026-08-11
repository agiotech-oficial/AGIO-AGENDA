import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getNormalizedMediaUrl(content: string): string {
  if (!content) return '';
  let url = content.trim();

  // Replace backslashes (Windows path style e.g. \public\arte_1_geral.jpg)
  url = url.replace(/\\/g, '/');

  // Fix old or legacy file names to the updated public asset path
  url = url.replace(/\/arte_4\s*\(1\)-agio_agenda\.jpg/i, '/arte_4-(1)-agio_agenda.jpg');

  // If already an absolute URL or data URI, return as is
  if (/^(https?:\/\/|data:)/i.test(url)) {
    return url;
  }

  // Remove public/ or /public/ prefix since Next.js serves public folder at root
  url = url.replace(/^\/?public\//i, '/');

  // Ensure leading slash
  if (!url.startsWith('/')) {
    url = '/' + url;
  }

  // URL encode special characters (spaces, parentheses, etc.) while preserving slashes
  return encodeURI(url);
}

export const DEFAULT_MARKETING_MATERIALS = [
  { 
    id: 'mat_1', 
    type: 'image', 
    title: 'Arte 1 - Ágio Agenda Geral', 
    content: '/arte_1_geral.jpg',
    description: '🚀 Transforme a gestão de agendamentos e clientes do seu negócio com a Ágio Agenda! Teste grátis e simplifique sua rotina hoje mesmo.' 
  },
  { 
    id: 'mat_2', 
    type: 'image', 
    title: 'Arte 2 - Ágio Agenda', 
    content: '/arte2-agio_agenda.jpg',
    description: '📅 Organize seus horários, evite faltas com confirmações no WhatsApp e aumente o faturamento da sua empresa com a Ágio Agenda!' 
  },
  { 
    id: 'mat_3', 
    type: 'image', 
    title: 'Arte 3 - Ágio Agenda', 
    content: '/arte_3-agio_agenda.jpg',
    description: '⏰ Seus clientes agendando sozinhos 24 horas por dia! Conheça a Ágio Agenda e automatize seu atendimento.' 
  },
  { 
    id: 'mat_4', 
    type: 'image', 
    title: 'Arte 4 - Ágio Agenda', 
    content: '/arte4-agio_agenda_.jpg',
    description: '💡 O aplicativo perfeito para prestadores de serviços e profissionais liberais. Agende seus clientes sem complicação!' 
  },
  { 
    id: 'mat_5', 
    type: 'image', 
    title: 'Arte 5 - Ágio Agenda', 
    content: '/arte_5-agio_agenda.jpg',
    description: '✨ Chega de perder tempo organizando agenda no papel. Venha para o futuro da gestão com a Ágio Agenda!' 
  },
  { 
    id: 'mat_6', 
    type: 'image', 
    title: 'Arte 6 - Ágio Agenda (Variação)', 
    content: '/arte_4-(1)-agio_agenda.jpg',
    description: '🔥 Ganhe tempo e profissionalize seu negócio com o sistema Ágio Agenda.' 
  },
];
