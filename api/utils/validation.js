const validateLead = (data) => {
  const { name, phone } = data;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return 'Please enter a valid name (at least 2 characters).';
  }

  if (name.length > 100) {
    return 'Name is too long.';
  }

  if (!phone || typeof phone !== 'string') {
    return 'Phone number is required.';
  }

  const cleanPhone = phone.replace(/\s+/g, '');
  if (cleanPhone.length < 8 || cleanPhone.length > 15) {
    return 'Please enter a valid phone number.';
  }

  return null;
};

module.exports = { validateLead };