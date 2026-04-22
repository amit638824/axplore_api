const service = require("../../services/mobileapp/faq.service");
const { success } = require("../../../utils/response");
const { asyncHandler } = require("../../../middleware/errorHandler");

exports.faq = asyncHandler(async (req, res) => {
  const data = await service.getFaqList(req.query);

  return success(res, data, "FAQ list fetched successfully");
});