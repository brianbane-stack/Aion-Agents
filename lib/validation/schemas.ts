import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export const recoverySchema = z.object({
  email: z.email("Informe um e-mail válido."),
});

export const registerSchema = z.object({
  name: z.string().trim().min(3, "Informe o seu nome.").max(80),
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(10, "Use pelo menos 10 caracteres.").max(200),
  clinicName: z.string().trim().min(2, "Informe o nome da clínica.").max(120),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(40),
  phone: z.string().trim().min(8).max(30),
  technicalManager: z.string().trim().min(3).max(80),
  crmv: z.string().trim().min(3).max(40),
});

export const clinicSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30),
  email: z.union([z.literal(""), z.email("E-mail inválido.")]),
  address: z.string().trim().max(160),
  city: z.string().trim().max(80),
  state: z.string().trim().max(40),
  technicalManager: z.string().trim().max(80),
  crmv: z.string().trim().max(40),
  formality: z.enum(["formal", "cordial", "acolhedor"]),
  emojiPolicy: z.enum(["none", "rare"]),
  signOff: z.string().trim().max(80),
  preferredPhrases: z.array(z.string().trim().min(2).max(180)).max(8),
  avoidedPhrases: z.array(z.string().trim().min(2).max(80)).max(12),
  communicationRules: z.string().trim().max(800),
});

export const memorySchema = z.object({
  kind: z.enum(["explicit_rule", "approved_example", "preferred_expression", "avoided_expression"]),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(3).max(500),
});

export const workflowSchema = z.object({
  workflowId: z.string().min(1),
  waitHours: z.number().int().min(0).max(168),
  maxAttempts: z.number().int().min(1).max(3),
  autonomy: z.enum(["suggestion", "supervised", "restricted"]),
  templateBody: z.string().trim().min(10).max(1000),
  providerTemplateName: z.string().trim().regex(/^[a-z0-9_]*$/, "Use apenas letras minúsculas, números e _.").max(128),
});

export const whatsappConfigSchema = z.object({
  phoneNumberId: z.string().trim().max(40),
  wabaId: z.string().trim().max(40),
  accessToken: z.string().max(4096),
  appSecret: z.string().max(512),
  verifyToken: z.string().max(256),
  clearAccessToken: z.boolean(),
  clearAppSecret: z.boolean(),
});

export const roleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(["owner", "admin", "operator", "approver", "viewer"]),
});

export const linesToList = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export type ClinicInput = z.infer<typeof clinicSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
