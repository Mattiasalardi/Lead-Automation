const { parsePhoneNumber, isValidPhoneNumber } = require('libphonenumber-js');
const supabase = require('../services/supabase');
const whatsapp = require('../services/whatsapp');
const email = require('../services/email');
const { validateLead } = require('../utils/validation');

const submitLead = async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (req.body.honeypot) {
      console.log('Bot detected - honeypot filled');
      return res.json({ success: true, message: 'Thank you for your submission!' });
    }

    const validationError = validateLead(req.body);
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const { name, phone, consent, source } = req.body;

    if (!consent) {
      return res.status(400).json({
        success: false,
        message: 'Consent is required to process your information.'
      });
    }

    let normalizedPhone;
    try {
      if (!isValidPhoneNumber(phone, 'IT')) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid mobile number.'
        });
      }
      const phoneNumber = parsePhoneNumber(phone, 'IT');
      normalizedPhone = phoneNumber.format('E.164');
    } catch (error) {
      console.error('Phone parsing error:', error);
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid mobile number.'
      });
    }

    const leadData = {
      name: name.trim(),
      phone: normalizedPhone,
      consent: true,
      source: source || null,
      ip: clientIp,
      created_at: new Date().toISOString()
    };

    const { data: dbLead, error: dbError } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save your information. Please try again.'
      });
    }

    console.log('Lead saved successfully:', dbLead.id);

    const whatsappResult = await whatsapp.sendWelcomeMessage(
      normalizedPhone,
      name.split(' ')[0]
    );

    if (!whatsappResult.success) {
      console.error('WhatsApp send failed:', whatsappResult.error);

      await supabase
        .from('leads')
        .update({ whatsapp_status: 'failed', whatsapp_error: whatsappResult.error })
        .eq('id', dbLead.id);
    } else {
      await supabase
        .from('leads')
        .update({ whatsapp_status: 'sent', whatsapp_message_id: whatsappResult.messageId })
        .eq('id', dbLead.id);
    }

    try {
      await email.sendLeadNotification(leadData);
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
    }

    if (!whatsappResult.success) {
      return res.status(200).json({
        success: true,
        message: 'Thank you! We received your information but couldn\'t send the WhatsApp message. We\'ll contact you soon.',
        warning: true
      });
    }

    res.json({
      success: true,
      message: 'Thank you! Check your WhatsApp for our welcome message.'
    });

  } catch (error) {
    console.error('Lead submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
};

module.exports = { submitLead };