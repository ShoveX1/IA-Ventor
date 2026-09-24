import dotenv from "dotenv";
import { z } from "zod";

// Cargar variables de entorno
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL debe ser una URL de conexión válida de PostgreSQL"),
  WHATSAPP_TOKEN: z.string().min(1, "WHATSAPP_TOKEN es requerido"),
  PHONE_NUMBER_ID: z.string().min(1, "PHONE_NUMBER_ID es requerido"),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1, "WHATSAPP_VERIFY_TOKEN es requerido"),
  DEEPSEEK_API_KEY: z.string().min(1, "DEEPSEEK_API_KEY es requerido"),
  DEEPSEEK_MODEL: z.string().default("deepseek-chat"),
  DEEPSEEK_BASE_URL: z.string().default("https://api.deepseek.com"),
  PAYMENT_YAPE_NUMBER: z.string().min(9, "PAYMENT_YAPE_NUMBER debe tener al menos 9 dígitos"),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default("*"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Error de validación en las variables de entorno:", _env.error.format());
  process.exit(1);
}

export const config = _env.data;
