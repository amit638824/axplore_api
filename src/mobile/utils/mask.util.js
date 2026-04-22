// src/utils/mask.util.js

const maskMobile = (mobile) => {
  if (!mobile || mobile.length < 4) return mobile;

  const last4 = mobile.slice(-4);
  return `******${last4}`;
};

module.exports = {
  maskMobile,
};