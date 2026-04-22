/**
 * country Service
 * Business logic for country management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');

/**
 * Get country list
 */
const getCountry = async () => {
  const list = await prisma.masterCountry.findMany({
    select: {
      countryId: true,
      name: true,
      isoCode: true,
      iso3: true,
      dial_code: true,
      currency_code: true,
      currency_symbol: true,
      time_zone: true,
      region: true,
      sub_region: true,
      language: true,
      country_description: true,
      places_to_visit: true,
      website: true,
      is_active: true,
    },
    orderBy: { name: 'asc' },
  });
  return list;
};

/**
 * Get country by ID
 */
const getCountryById = async (countryId) => {
  const country = await prisma.masterCountry.findUnique({
    where: { countryId },
  });
  if (!country) throw new NotFoundError('Country');
  return country;
};

/**
 * Create country (add)
 */
const createCountry = async (data) => {
  return prisma.masterCountry.create({
    data: {
      name: data.name,
      isoCode: data.isoCode || null,
      iso3: data.iso3 || null,
      dial_code: data.dial_code || null,
      currency_code: data.currency_code || null,
      currency_symbol: data.currency_symbol || null,
      time_zone: data.time_zone || null,
      region: data.region || null,
      sub_region: data.sub_region || null,
      language: data.language || null,
      country_description: data.country_description || null,
      places_to_visit: data.places_to_visit || null,
      website: data.website || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
    },
  });
};

/**
 * Update country (edit)
 */
const updateCountry = async (countryId, data) => {
  await getCountryById(countryId);
  return prisma.masterCountry.update({
    where: { countryId },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.isoCode !== undefined && { isoCode: data.isoCode || null }),
      ...(data.iso3 !== undefined && { iso3: data.iso3 || null }),
      ...(data.dial_code !== undefined && { dial_code: data.dial_code || null }),
      ...(data.currency_code !== undefined && { currency_code: data.currency_code || null }),
      ...(data.currency_symbol !== undefined && { currency_symbol: data.currency_symbol || null }),
      ...(data.time_zone !== undefined && { time_zone: data.time_zone || null }),
      ...(data.region !== undefined && { region: data.region || null }),
      ...(data.sub_region !== undefined && { sub_region: data.sub_region || null }),
      ...(data.language !== undefined && { language: data.language || null }),
      ...(data.country_description !== undefined && { country_description: data.country_description || null }),
      ...(data.places_to_visit !== undefined && { places_to_visit: data.places_to_visit || null }),
      ...(data.website !== undefined && { website: data.website || null }),
      ...(data.is_active !== undefined && { is_active: data.is_active }),
    },
  });
};



/**
 * Delete country
 */
const deleteCountry = async (countryId) => {
  await getCountryById(countryId);
  return prisma.masterCountry.delete({
    where: { countryId },
  });
};

module.exports = {
  getCountry,
  getCountryById,
  createCountry,
  updateCountry,
  deleteCountry,
};

