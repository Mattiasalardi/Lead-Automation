const axios = require('axios');

// WATI Configuration
const WATI_API_URL = process.env.WATI_API_URL || 'https://eu-api.wati.io/1111595';
const WATI_ACCESS_TOKEN = process.env.WATI_ACCESS_TOKEN;
const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || 'conferma_ricezione_dati';

const sendWelcomeMessage = async (phoneNumber, firstName) => {
  try {
    if (!WATI_ACCESS_TOKEN) {
      throw new Error('WATI credentials not configured');
    }

    const url = `${WATI_API_URL}/api/v1/sendTemplateMessage`;

    const payload = {
      whatsAppNumber: phoneNumber,
      template_name: TEMPLATE_NAME,
      broadcast_name: 'lead_welcome',
      language_code: 'it',
      parameters: [
        {
          name: 'name',
          value: firstName || 'Cliente'
        }
      ]
    };

    console.log('WATI API Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': WATI_ACCESS_TOKEN, // Token already includes "Bearer"
        'Content-Type': 'application/json'
      }
    });

    console.log('WhatsApp message sent successfully via WATI:', response.data);

    return {
      success: true,
      messageId: response.data.messageId || response.data.id || response.data.result
    };

  } catch (error) {
    console.error('WATI API Error:', error.response?.data || error.message);

    let errorMessage = 'Failed to send WhatsApp message';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.result) {
      errorMessage = error.response.data.result;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

module.exports = { sendWelcomeMessage };