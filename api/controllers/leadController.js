const { parsePhoneNumber, isValidPhoneNumber } = require('libphonenumber-js');
const supabase = require('../services/supabase');
const whatsapp = require('../services/whatsapp');
const email = require('../services/email');
const { validateLead } = require('../utils/validation');

// Check if phone number is obviously fake (for email filtering)
const isObviouslyFakeNumber = (phone) => {
  const cleaned = phone.replace(/[\s\-\+]/g, '');

  // Too short or too long
  if (cleaned.length < 8 || cleaned.length > 15) return true;

  // All same digit
  if (/^(\d)\1{7,}$/.test(cleaned)) return true;

  // Sequential numbers
  if (/^(0123456789|1234567890|9876543210)/.test(cleaned)) return true;

  // All zeros or ones
  if (/^0{8,}$/.test(cleaned) || /^1{8,}$/.test(cleaned)) return true;

  // Common test numbers
  const testPatterns = [
    /^123456/,
    /^111111/,
    /^000000/,
    /^999999/
  ];

  return testPatterns.some(pattern => pattern.test(cleaned));
};

const submitLead = async (req, res) => {
  try {
    // Log all incoming requests
    console.log('New lead submission:', {
      body: req.body,
      headers: req.headers.origin || req.headers.referer,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    });

    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (req.body.honeypot) {
      console.log('Bot detected - honeypot filled');
      return res.json({ success: true, message: 'Thank you for your submission!' });
    }

    const validationError = validateLead(req.body);
    if (validationError) {
      console.log('Validation failed:', validationError, 'for data:', req.body);
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const { name, phone, consent, source, page } = req.body;

    if (!consent) {
      console.log('Consent not provided for:', name, phone);
      return res.status(400).json({
        success: false,
        message: 'Consent is required to process your information.'
      });
    }

    // Check if phone is obviously fake - block completely if so
    if (isObviouslyFakeNumber(phone)) {
      console.log('Obviously fake phone number rejected:', phone);
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid mobile number.'
      });
    }

    let normalizedPhone;
    let phoneIsValid = false;
    try {
      // Clean up common input errors
      let cleanedPhone = phone.trim();

      // Smart detection of double country codes
      // Italian numbers: mobile starts with 3, so +3939 followed by non-3 might be double
      // But +3933 is valid (starts with 33), +3932 is valid (starts with 32), etc.
      if (cleanedPhone.startsWith('+3939')) {
        // Check if what follows looks like a mobile number (starts with 3)
        const afterCode = cleanedPhone.substring(5);
        if (afterCode.startsWith('3')) {
          // +39393... is likely +39 + 393... (double country code)
          cleanedPhone = '+39' + afterCode;
          console.log('Fixed Italian double country code:', phone, '->', cleanedPhone);
        }
        // Otherwise +3939xxx might be valid if xxx doesn't start with 3
      }

      // UK double country code detection
      // UK mobiles start with 7, so +4444 followed by 7 is likely double
      if (cleanedPhone.startsWith('+4444')) {
        const afterCode = cleanedPhone.substring(5);
        if (afterCode.startsWith('7')) {
          // +44447... is likely +44 + 447... (double country code)
          cleanedPhone = '+44' + afterCode;
          console.log('Fixed UK double country code:', phone, '->', cleanedPhone);
        }
      }

      // Alternative approach: Try to parse, if it fails, try removing potential double code
      let phoneNumber;
      let parseAttempts = [];

      // If number starts with +, parse as international
      if (cleanedPhone.startsWith('+')) {
        // First try: parse as-is
        try {
          if (isValidPhoneNumber(cleanedPhone)) {
            phoneNumber = parsePhoneNumber(cleanedPhone);
            parseAttempts.push(`Direct parse successful: ${cleanedPhone}`);
          } else {
            // Second try: Check for double country codes more aggressively
            // For +39 numbers that don't parse
            if (cleanedPhone.startsWith('+39') && cleanedPhone.length > 13) {
              const withoutPlus = cleanedPhone.substring(1); // Remove +
              if (withoutPlus.startsWith('3939')) {
                // Definitely double: 39 + 39...
                const fixed = '+39' + withoutPlus.substring(2);
                if (isValidPhoneNumber(fixed)) {
                  phoneNumber = parsePhoneNumber(fixed);
                  cleanedPhone = fixed;
                  console.log('Fixed double country code on second attempt:', phone, '->', fixed);
                }
              }
            }

            if (!phoneNumber || !phoneNumber.isValid()) {
              console.log('Invalid international phone number after all attempts:', cleanedPhone);
              console.log('Parse attempts:', parseAttempts);
              // Don't reject - continue with original phone and mark as invalid
              normalizedPhone = cleanedPhone;
              phoneIsValid = false;
            } else {
              normalizedPhone = phoneNumber.format('E.164');
              phoneIsValid = true;
            }
          }
        } catch (error) {
          console.log('Phone parsing error:', error, 'for number:', cleanedPhone);
          // Don't reject - continue with original phone and mark as invalid
          normalizedPhone = cleanedPhone;
          phoneIsValid = false;
        }
      } else {
        // If no + prefix, try common formats
        // First try as-is (might have country code without +)
        try {
          phoneNumber = parsePhoneNumber('+' + cleanedPhone);
          if (!phoneNumber.isValid()) {
            // If that fails, assume Italian number
            phoneNumber = parsePhoneNumber(cleanedPhone, 'IT');
          }
        } catch {
          // Last resort: assume Italian
          phoneNumber = parsePhoneNumber(cleanedPhone, 'IT');
        }

        if (!phoneNumber.isValid()) {
          console.log('Phone number invalid after all attempts:', cleanedPhone);
          normalizedPhone = cleanedPhone;
          phoneIsValid = false;
        } else {
          normalizedPhone = phoneNumber.format('E.164');
          phoneIsValid = true;
        }
      }
    } catch (error) {
      console.error('Phone parsing error:', error);
      normalizedPhone = cleanedPhone;
      phoneIsValid = false;
    }

    const leadData = {
      name: name.trim(),
      phone: normalizedPhone,
      consent: true,
      source: source || null,
      ip: clientIp,
      created_at: new Date().toISOString()
    };

    // Only add page if the column exists (for backward compatibility)
    if (page) {
      leadData.page = page;
    }

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

    console.log('Lead saved successfully:', dbLead.id, 'Phone valid:', phoneIsValid);

    let whatsappResult = { success: false, error: 'Phone invalid' };

    // Only try WhatsApp if phone is valid
    if (phoneIsValid) {
      whatsappResult = await whatsapp.sendWelcomeMessage(
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
    } else {
      console.log('Skipping WhatsApp - invalid phone number:', normalizedPhone);
      await supabase
        .from('leads')
        .update({ whatsapp_status: 'skipped', whatsapp_error: 'Invalid phone number format' })
        .eq('id', dbLead.id);
    }

    try {
      await email.sendLeadNotification(leadData);
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
    }

    // Always return success since we saved the lead and sent email
    let responseMessage;
    if (whatsappResult.success) {
      responseMessage = 'Thank you! Check your WhatsApp for our welcome message.';
    } else if (phoneIsValid) {
      responseMessage = 'Thank you! We received your information but couldn\'t send the WhatsApp message. We\'ll contact you soon.';
    } else {
      responseMessage = 'Thank you! We received your information. We\'ll contact you soon to verify your phone number.';
    }

    res.json({
      success: true,
      message: responseMessage,
      warning: !whatsappResult.success
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