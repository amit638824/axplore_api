const dependentService = require('../../services/mobileapp/dependent.service');
const { success } = require('../../../utils/response');


exports.addFamilyDetails = async (req, res, next) => {
    try {
        const paxId = req.user.pax_id;
        const { tripId, children, infants } = req.body;

        if (!tripId) {
            return res.status(400).json({
                success: false,
                message: 'Trip ID is required'
            });
        }

        const result = await dependentService.addFamilyMembers(paxId, tripId, children, infants);

        return success(res, result);
    } catch (error) {
        console.error('Add Family Details Error:', error);
        next(error);
    }
};
