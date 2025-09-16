const axios = require('axios');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || 'welcome_message';

const sendWelcomeMessage = async (phoneNumber, firstName) => {
  try {
    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      throw new Error('WhatsApp credentials not configured');
    }

    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber.replace('+', ''),
      type: 'template',
      template: {
        name: TEMPLATE_NAME,
        language: {
          code: 'it'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: firstName
              }
            ]
          }
        ]
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('WhatsApp message sent successfully:', response.data);

    return {
      success: true,
      messageId: response.data.messages[0].id
    };

  } catch (error) {
    console.error('WhatsApp API Error:', error.response?.data || error.message);

    let errorMessage = 'Failed to send WhatsApp message';
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

module.exports = { sendWelcomeMessage };