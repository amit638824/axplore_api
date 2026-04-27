const notificationService = require('../../services/mobileapp/notification.service');
const notificationValidator = require('../../validators/notification.validator');

class NotificationController {
    async list(req, res) {
        try {
            const { paxId } = req.user; // Assuming paxId is stored in JWT token
            const notifications = await notificationService.getNotifications(paxId);

            return res.status(200).json({
                success: true,
                message: 'Notifications fetched successfully',
                data: notifications
            });
        } catch (error) {
            console.error('List Notifications Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    async updateStatus(req, res) {
        try {
            const { error } = notificationValidator.markAsRead.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    message: error.details[0].message
                });
            }

            const { notification_id } = req.body;
            const updated = await notificationService.markAsRead(notification_id);

            return res.status(200).json({
                success: true,
                message: 'Notification marked as read',
                data: updated
            });
        } catch (error) {
            console.error('Update Notification Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    async remove(req, res) {
        try {
            const { notification_id } = req.body;
            if (!notification_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Notification ID is required'
                });
            }

            await notificationService.deleteNotification(notification_id);

            return res.status(200).json({
                success: true,
                message: 'Notification deleted successfully'
            });
        } catch (error) {
            console.error('Delete Notification Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

module.exports = new NotificationController();
