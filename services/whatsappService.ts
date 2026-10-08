/**
 * Meta WhatsApp Cloud API Service
 * Handles outbound messaging to WhatsApp users via official Graph API.
 */

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppMessage(
  recipientPhoneNumber: string,
  messageText: string
): Promise<WhatsAppSendResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

  if (!accessToken || !phoneNumberId) {
    const errorMsg = 'WhatsApp credentials (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID) missing.';
    console.error(`[WhatsApp Service Error] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
    };
  }

  // Ensure recipient phone number has only digits
  const cleanRecipient = recipientPhoneNumber.replace(/\D/g, '');
  if (!cleanRecipient) {
    return {
      success: false,
      error: 'Invalid recipient phone number format.',
    };
  }

  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanRecipient,
    type: 'text',
    text: {
      preview_url: false,
      body: messageText,
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      const errorDetail = responseData?.error?.message || response.statusText;
      const errorCode = responseData?.error?.code || response.status;
      // Structured safe log without leaking token
      console.error(
        `[WhatsApp Graph API Error] Status: ${response.status}, Code: ${errorCode}, Message: ${errorDetail}`
      );
      return {
        success: false,
        error: `Meta API error (${errorCode}): ${errorDetail}`,
      };
    }

    const messageId = responseData?.messages?.[0]?.id;
    console.log(`[WhatsApp Service] Message successfully dispatched to ${cleanRecipient}. MsgID: ${messageId}`);

    return {
      success: true,
      messageId,
    };
  } catch (err: any) {
    // Never leak token in exception logs
    console.error(`[WhatsApp Service Network Error] ${err?.message || err}`);
    return {
      success: false,
      error: err?.message || 'Network error while contacting WhatsApp API.',
    };
  }
}
