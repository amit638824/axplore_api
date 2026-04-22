const tripService = require("../../../../mobile/services/mobileapp/trip.service");
const { paginated ,success} = require("../../../../utils/response");

exports.getMyTrips = async (req, res, next) => {
  try {
    const userId = req.user.pax_id;

    const { page, limit, search, status } = req.query;

    const result = await tripService.getMyTrips(userId, {
      page,
      limit,
      search,
      status
    });

    return paginated(res, result.data, result.meta);

  } catch (err) {
    next(err);
  }
};
exports.getTripById = async (req, res, next) => {
  try {
    const userId = req.user.pax_id;
    const { tripId } = req.params;

    const result = await tripService.getTripById(userId, tripId);

    return success(res, result);
  } catch (err) {
    next(err);
  }
};
exports.joinTrip = async (req, res, next) => {
  try {
    const paxId = req.user.pax_id;
    const appUserId = req.user.userId;

    const { tripCode, joinedVia } = req.body;

    const result = await tripService.joinTrip(paxId, appUserId, {
      tripCode,
      joinedVia,
    });

    return success(res, result);
  } catch (err) {
    next(err);
  }
};