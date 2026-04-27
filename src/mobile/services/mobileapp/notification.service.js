const { prisma } = require("../../../config/database");


class NotificationService {
    async getNotifications(paxId) {
        try {
            return await prisma.pax_notifications.findMany({
                where: {
                    pax_id: paxId
                },
                orderBy: {
                    created_at: 'desc'
                }
            });
        } catch (error) {
            throw error;
        }
    }

    async markAsRead(notificationId) {
        try {
            return await prisma.pax_notifications.update({
                where: {
                    notification_id: notificationId
                },
                data: {
                    is_read: true,
                    read_at: new Date()
                }
            });
        } catch (error) {
            throw error;
        }
    }

    async deleteNotification(notificationId) {
        try {
            return await prisma.pax_notifications.delete({
                where: {
                    notification_id: notificationId
                }
            });
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new NotificationService();
