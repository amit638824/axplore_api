const { prisma } = require("../../../config/database");


class DependentService {
    async addFamilyMembers(paxId, tripId, children = [], infants = []) {
        try {
            const addedMembers = [];

            // Add Children
            if (children.length > 0) {
                const childRecords = children.map(child => ({
                    pax_id: paxId,
                    first_name: child.first_name || child.firstName,
                    last_name: child.last_name || child.lastName,
                    date_of_birth: new Date(child.date_of_birth || child.dob),
                    gender: child.gender,
                    passport_number: child.passport_number || child.passportNo,
                    passport_expiry: (child.passport_expiry || child.passportExpiry) ? new Date(child.passport_expiry || child.passportExpiry) : null,
                    nationality: child.nationality,
                    relationship: child.relationship || 'CHILD',
                    type: 'CHILD'
                }));

                const result = await prisma.pax_dependents.createMany({
                    data: childRecords
                });
                addedMembers.push(...childRecords);
            }

            // Add Infants
            if (infants.length > 0) {
                const infantRecords = infants.map(infant => ({
                    pax_id: paxId,
                    first_name: infant.first_name || infant.firstName,
                    last_name: infant.last_name || infant.lastName,
                    date_of_birth: new Date(infant.date_of_birth || infant.dob),
                    gender: infant.gender,
                    passport_number: infant.passport_number || infant.passportNo,
                    passport_expiry: (infant.passport_expiry || infant.passportExpiry) ? new Date(infant.passport_expiry || infant.passportExpiry) : null,
                    nationality: infant.nationality,
                    relationship: infant.relationship || 'INFANT',
                    type: 'INFANT',
                    guardian_name: infant.guardian_name || infant.guardianName,
                    guardian_contact: infant.guardian_contact || infant.guardianContact
                }));

                await prisma.pax_dependents.createMany({
                    data: infantRecords
                });
                addedMembers.push(...infantRecords);
            }

            return {
                paxId,
                tripId,
                members: addedMembers,
                summary: {
                    total_children: children.length,
                    total_infants: infants.length,
                    total_members_added: children.length + infants.length
                }
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new DependentService();
