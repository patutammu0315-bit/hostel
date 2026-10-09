/**
 * Telegram Bot API Service
 * Handles outbound messaging and webhook management for Telegram Bot.
 *
 * Environment variable required: TELEGRAM_BOT_TOKEN
 */

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export interface TelegramWebhookInfoResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Dispatches a text message to a specific Telegram chat_id.
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    const errorMsg = 'TELEGRAM_BOT_TOKEN is not configured in environment variables.';
    console.error(`[Telegram Service Error] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
    };
  }

  if (!chatId) {
    const errorMsg = 'Chat ID is required to send Telegram message.';
    console.error(`[Telegram Service Error] ${errorMsg}`);
    return {
      success: false,
      error: errorMsg,
    };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData: any = null;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Requirement 7: Log Telegram API response status and body
    console.log(`[Telegram API Response] status: ${response.status}`);
    console.log(
      `[Telegram API Response] body:`,
      typeof responseData === 'object' ? JSON.stringify(responseData) : responseData
    );

    if (!response.ok || !responseData?.ok) {
      const errorDescription =
        responseData?.description || `HTTP ${response.status} ${response.statusText}`;
      const errorCode = responseData?.error_code || response.status;

      console.error(
        `[Telegram API Error] Status: ${response.status}, Code: ${errorCode}, Description: ${errorDescription}`
      );
      return {
        success: false,
        error: `Telegram API error (${errorCode}): ${errorDescription}`,
      };
    }

    const messageId = responseData?.result?.message_id;
    console.log(
      `[Telegram Service] Message dispatched to chat ${chatId}. MsgID: ${messageId}`
    );

    return {
      success: true,
      messageId,
    };
  } catch (err: any) {
    // Safe logging without leaking bot token
    console.error(`[Telegram Service Network Error] ${err?.message || err}`);
    return {
      success: false,
      error: err?.message || 'Network error while contacting Telegram API.',
    };
  }
}

/**
 * Registers the webhook URL with Telegram Bot API.
 */
export async function setTelegramWebhook(webhookUrl: string): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    return {
      success: false,
      error: 'TELEGRAM_BOT_TOKEN is not configured.',
    };
  }

  const endpoint = `https://api.telegram.org/bot${token}/setWebhook`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      return {
        success: false,
        error: data?.description || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      result: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while configuring webhook.',
    };
  }
}

/**
 * Retrieves the current webhook status from Telegram.
 */
export async function getTelegramWebhookInfo(): Promise<TelegramWebhookInfoResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    return {
      success: false,
      error: 'TELEGRAM_BOT_TOKEN is not configured.',
    };
  }

  const endpoint = `https://api.telegram.org/bot${token}/getWebhookInfo`;

  try {
    const response = await fetch(endpoint, { method: 'GET' });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      return {
        success: false,
        error: data?.description || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      data: data.result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while fetching webhook info.',
    };
  }
}

/**
 * Retrieves bot details (e.g. username, name) to test token validity.
 */
export async function getTelegramBotInfo(): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    return {
      success: false,
      error: 'TELEGRAM_BOT_TOKEN is not configured.',
    };
  }

  const endpoint = `https://api.telegram.org/bot${token}/getMe`;

  try {
    const response = await fetch(endpoint, { method: 'GET' });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok) {
      return {
        success: false,
        error: data?.description || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      data: data.result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while fetching bot info.',
    };
  }
}
