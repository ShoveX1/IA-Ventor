import axios from "axios";
import { config } from "../config/config.js";

export class WhatsAppService {
  private apiUrl: string;

  constructor() {
    // Usar la versión v20.0 como se observa en la consola de Meta Developers
    this.apiUrl = `https://graph.facebook.com/v20.0/${config.PHONE_NUMBER_ID}/messages`;
  }

  /**
   * Envía un mensaje de texto a un número de WhatsApp usando la API oficial de Cloud
   */
  async sendTextMessage(to: string, text: string): Promise<boolean> {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: {
        preview_url: false,
        body: text,
      },
    };

    try {
      console.log(`📱 Enviando mensaje de WhatsApp a ${to}...`);
      
      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${config.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 200 || response.status === 201) {
        console.log(`✅ Mensaje enviado exitosamente a ${to}. Message ID: ${response.data.messages?.[0]?.id}`);
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error(`❌ Error enviando mensaje de WhatsApp a ${to}:`, error.response?.data || error.message);
      return false;
    }
  }
}

export const whatsAppService = new WhatsAppService();
