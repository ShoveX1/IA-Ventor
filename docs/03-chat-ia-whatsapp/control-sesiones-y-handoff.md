# 👥 Control de Sesiones, Historial JSONB y Handoff a Humanos

Este documento explica cómo el backend gestiona la memoria a largo plazo de cada cliente y el traspaso fluido entre la IA y los asesores humanos.

---

## 1. Memoria Persistida (`ChatSession`)

A diferencia de otros bots que pierden el contexto o que requieren bases de datos vectoriales costosas, el backend almacena el historial de conversación completo directamente en PostgreSQL utilizando el tipo de dato nativo `Json` (`JSONB`).

- **Modelo Prisma:** `ChatSession`
  ```prisma
  model ChatSession {
    id        Int      @id @default(autoincrement())
    userId    Int      @unique
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    history   Json     @default("[]")
    updatedAt DateTime @updatedAt
  }
  ```
- **Ventaja:** Cada vez que el cliente vuelve a escribir horas o días después, Gemini carga el historial exacto con sus roles (`user`, `model`, `functionResponse`) sin perder el hilo de la compra.

---

## 2. Handoff a Asesor Humano (`handoff_to_human`)

Cuando un cliente escribe:
- *"Quiero hablar con una persona"*
- *"Pásame con un asesor"*
- O cuando el cliente manifiesta un reclamo complejo que la IA no puede resolver...

### Flujo de Handoff:
1. Gemini invoca automáticamente la herramienta **`handoff_to_human(reason)`**.
2. El backend actualiza en la base de datos:
   ```sql
   UPDATE "User" SET "activeBot" = false WHERE id = $userId;
   ```
3. La IA le responde cordialmente al cliente:
   > *"Entiendo perfectamente. Un asesor humano tomará la conversación en breve para ayudarte personalmente. ¡Muchas gracias por tu paciencia!"*
4. A partir de ese momento, los mensajes que el cliente envíe por WhatsApp serán ignorados por el bot para que un asesor pueda chatear libremente desde la aplicación de WhatsApp Business.

---

## 3. Reactivar el Bot para un Usuario

Si el asesor humano terminó de atender al cliente y desea que la IA vuelva a responderle automáticamente, puede reactivar el bot mediante la base de datos o mediante el endpoint de usuarios:

```sql
UPDATE "User" SET "activeBot" = true WHERE phone = '51999999999';
```

---

[⬅️ Volver al Módulo de Chat](./README.md)
