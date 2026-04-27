const Joi = require('joi');

const notificationSchema = {
    markAsRead: Joi.object({
        notification_id: Joi.string().guid({ version: 'uuidv4' }).required(),
        is_read: Joi.number().valid(0, 1).required()
    })
};

module.exports = notificationSchema;
