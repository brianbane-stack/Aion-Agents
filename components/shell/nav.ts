import { Activity, Cable, House, LineChart, MessageCircle, Settings, Star } from "lucide-react";

export const MAIN_NAV = [
  { href: "/hoje", label: "Hoje", icon: House, exact: true },
  { href: "/reputacao", label: "Reputação", icon: Star, exact: false },
  { href: "/pos-consulta", label: "Pós-consulta", icon: MessageCircle, exact: false },
  { href: "/atividade", label: "Atividade", icon: Activity, exact: false },
  { href: "/resultados", label: "Resultados", icon: LineChart, exact: false },
  { href: "/integracoes", label: "Integrações", icon: Cable, exact: false },
] as const;

export const SETTINGS_NAV = [
  { href: "/configuracoes", label: "Clínica" },
  { href: "/configuracoes/memoria", label: "Memória" },
  { href: "/configuracoes/agentes", label: "Agentes" },
  { href: "/configuracoes/equipe", label: "Equipe" },
] as const;

export const COMMAND_LINKS = [
  ...MAIN_NAV.map((item) => ({ href: item.href, label: item.label, group: "Áreas" })),
  ...SETTINGS_NAV.map((item) => ({ href: item.href, label: `Configurações · ${item.label}`, group: "Configurações" })),
];

export { Settings };
