/**
 * City
 * Business logic for City management operations
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');

/**
 * Get City list (optionally filtered by countryId)
 */
const getCityById = async (countryId) => {
  const where = {};
  if (countryId) {
    where.countryId = countryId;
  }

  return prisma.masterCity.findMany({
    where,
    select: {
      cityId: true,
      name: true,
      stateId: true,
      countryId: true,
      timezone: true,
      timezone_gmt: true,
      city_image: true,
      city_description: true,
      state: {
        select: {
          name: true,
          country: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });
};


/**
 * Create City (add)
 */
const createCity = async (data) => {
  return prisma.masterCity.create({
    data: {
      name: data.name,
      countryId: data.countryId,
      stateId: data.stateId || null,
      timezone: data.timezone || null,
      timezone_gmt: data.timezone_gmt || null,
      city_image: data.city_image || null,
      city_description: data.city_description || null,
    },
  });
};

/**
 * Update city (edit)
 */
const updateCity = async (cityId, data) => {
  return prisma.masterCity.update({
    where: { cityId },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.stateId !== undefined && { stateId: data.stateId || null }),
      ...(data.countryId !== undefined && { countryId: data.countryId || null }),
      ...(data.timezone !== undefined && { timezone: data.timezone || null }),
      ...(data.timezone_gmt !== undefined && { timezone_gmt: data.timezone_gmt || null }),
      ...(data.city_image !== undefined && { city_image: data.city_image || null }),
      ...(data.city_description !== undefined && { city_description: data.city_description || null }),
    },
  });
};


/**
 * Delete city
 */
const deleteCity = async (cityId) => {
  return prisma.masterCity.delete({
    where: { cityId },
  });
};

// origin list
// const getOriginsdata = async () => {
//   const origins = await prisma.vwCityWithTravelType.findMany({
//     select: {
//       cityId: true,
//       countryId: true,
//       cityName: true,
//       countryName: true,
//     },
//   });

//   if (origins.length === 0) {
//     throw new NotFoundError('Origin');
//   }

//   const formatted = origins.map((item) => ({
//     cityId: item.cityId,
//     countryId: item.countryId,
//     origin: `${item.cityName}, ${item.countryName}`,
//   }));

//   return formatted;
// };


const getOriginsdata = async () => {
  const origins = await prisma.masterCity.findMany({
    select: {
      cityId: true,
      name: true,
      country: {
        select: {
          countryId: true,
          name: true,
          isoCode: true,
        },
      },
    },
  });


  if (origins.length === 0) {
    throw new NotFoundError('Origin');
  }

  const domestic = [];
  const international = [];

  origins.forEach((item) => {
    const country = item?.country;
    if (!country) return;

    // Domestic (India)
    if (country.isoCode === "IN") {
      domestic.push({
        cityId: item.cityId,
        countryId: country.countryId,
        cityIsoCode: `${item.name}, ${country.name}`,
        countryName: country.name
      });
    }
    // International
    else {
      international.push({
        cityId: item.cityId,
        countryId: country.countryId,
        cityIsoCode: `${item.name}, ${country.name}`,
        countryName: country.name
      });
    }
  });

  return {
    domestic,
    international
  };
};



module.exports = {
  getCityById,
  createCity,
  updateCity,
  deleteCity,
  getOriginsdata,
};


