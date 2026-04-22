/**
 * Dashboard Service (Optimized)
 */

const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../config/constants');

const getTeamUserIds = async (userId) => {
    const result = [];
    const visited = new Set();

    const fetchTeam = async (ids) => {
        console.log("ids", ids);
        const users = await prisma.appUser.findMany({
            where: { primary_manager_user_id: { in: ids } },
            select: { userId: true },
        });

        const newIds = users.map(u => u.userId).filter(u => !visited.has(u));
        newIds.forEach(id => visited.add(id));
        if (newIds.length > 0) await fetchTeam(newIds);
        result.push(...newIds);
    };

    visited.add(userId);
    result.push(userId); // include self
    await fetchTeam([userId]);
    return result;
};


const isAdmin = async (userId, roleId = null) => {
    if (!roleId) return false;

    const roles = await prisma.userRole.findMany({
        where: {
            userId,
            roleId,
            role: { roleCode: { in: ['admin', 'superadmin', 'super_admin', 'owner'], mode: 'insensitive' } },
        },
        select: { roleId: true },
    });
    return roles.length > 0;
};
/* ==============================
    COMMON HELPERS
================================*/

// Get Financial Year Start
const getFinancialYearStart = (now) => {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return currentMonth >= 3 ? currentYear : currentYear - 1;
};

// Get Last Day of Month
const getLastDayOfMonth = (year, month) => {
    return new Date(year, month + 1, 0, 23, 59, 59, 999);
};

// Get Date Range based on type
const getDateRange = (dataType) => {
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth(); // 0-11 (UTC)
    const currentDate = now.getUTCDate();

    // Financial Year Start (April 1st) - UTC logic
    const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    let startDate = null;
    let endDate = null;

    const type = (dataType || "").toLowerCase();

    switch (type) {
        case "mtd":
            // Full Current Month (1st to last day)
            startDate = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0, 0));
            endDate = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));
            break;
        case "ytd":
            // Full Financial Year (April 1st to March 31st)
            startDate = new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0, 0));
            endDate = new Date(Date.UTC(fyStartYear + 1, 2, 31, 23, 59, 59, 999));
            break;
        case "q1":
            startDate = new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0, 0));
            endDate = new Date(Date.UTC(fyStartYear, 5, 30, 23, 59, 59, 999));
            break;
        case "q2":
            startDate = new Date(Date.UTC(fyStartYear, 6, 1, 0, 0, 0, 0));
            endDate = new Date(Date.UTC(fyStartYear, 8, 30, 23, 59, 59, 999));
            break;
        case "q3":
            startDate = new Date(Date.UTC(fyStartYear, 9, 1, 0, 0, 0, 0));
            endDate = new Date(Date.UTC(fyStartYear, 11, 31, 23, 59, 59, 999));
            break;
        case "q4":
            startDate = new Date(Date.UTC(fyStartYear + 1, 0, 1, 0, 0, 0, 0));
            endDate = new Date(Date.UTC(fyStartYear + 1, 2, 31, 23, 59, 59, 999));
            break;
        case "all":
        default:
            startDate = null;
            endDate = null;
            break;
    }

    return { startDate, endDate };
};

/**
 * Determines the Reference Travel Date for a lead based on priority:
 * 1. Destination (Option 1) Check-in
 * 2. Trip Info Check-in
 * 3. Fallback: null (Exclude leads without travel dates)
 */
const getReferenceDate = (lead) => {
    // 1. Final trip start date (Prioritized if lead is Won/Confirmed)
    if (lead.trip?.start_date) return new Date(lead.trip.start_date);

    // 2. Destination (Option 1) Check-in - Pick earliest if multiple legs exist
    const destDates = (lead.destinations || [])
        .filter(d => d.optionNo === 1 && d.checkInDate)
        .map(d => new Date(d.checkInDate).getTime());

    if (destDates.length > 0) {
        return new Date(Math.min(...destDates));
    }

    // 3. Trip Info Check-in (Lead Step 2)
    const tripDate = lead.tripInfo?.checkInDate;
    if (tripDate) return new Date(tripDate);

    return null;
};

// Role Filter
const applyRoleFilter = async (where, createdBy, email, useRelation = false, roleId = null) => {
    let userId = createdBy;
    const admin = await isAdmin(userId, roleId);
    if (admin) {
        return;
    }
    // get full team hierarchy
    const teamUserIds = await getTeamUserIds(userId);

    if (useRelation) {
        where.lead = {
            OR: [
                { salesUserId: { in: teamUserIds } },
                { contractingHeadUserId: { in: teamUserIds } },
                { createdBy: { in: teamUserIds } },
                { ops_head_user_id: { in: teamUserIds } },
                { contractingTeam: { some: { userId: { in: teamUserIds } } } },
            ],
        };
    } else {
        where.OR = [
            { salesUserId: { in: teamUserIds } },
            { contractingHeadUserId: { in: teamUserIds } },
            { createdBy: { in: teamUserIds } },
            { ops_head_user_id: { in: teamUserIds } },
            { contractingTeam: { some: { userId: { in: teamUserIds } } } },
        ];
    }

    return where;
};

/**
 * Common fetcher for Dashboard leads (Filtered by Role/Team only)
 */
const fetchBaseDashboardLeads = async (createdBy, email, roleId = null) => {
    let where = {};
    const roleFilter = await applyRoleFilter(where, createdBy, email, false, roleId);
    if (roleFilter) where = { AND: [roleFilter] };

    return await prisma.lead.findMany({
        where,
        select: {
            leadId: true,
            corporateId: true,
            corporate: { select: { corporateName: true } },
            createdAt: true,
            modifiedAt: true,
            approvedAmount: true,
            leadStatusId: true,
            stage: true,
            leadStatus: { select: { statusCode: true, statusName: true } },
            creator: { select: { firstName: true, lastName: true } },
            salesUser: { select: { firstName: true, lastName: true } },
            contractingHead: { select: { firstName: true, lastName: true } },
            contractingTeam: {
                select: {
                    user: { select: { firstName: true, lastName: true } }
                }
            },
            destinations: {
                select: { optionNo: true, checkInDate: true }
            },
            tripInfo: {
                select: { checkInDate: true, totalBudget: true, tripName: true, numberOfTravelers: true }
            },
            trip: {
                select: { start_date: true }
            }
        }
    });
};

/**
 * Filter leads by the calculated Reference Date.
 * Excludes leads without travel dates (checkInDate).
 */
const filterLeadsByDateRange = (leads, startDate, endDate) => {
    // 1. Specific range filter
    if (!startDate || !endDate) return leads;

    const startNum = startDate.getTime();
    const endNum = endDate.getTime();

    // 2. Filter Leads
    return leads.filter(lead => {
        const refDate = getReferenceDate(lead);
        if (!refDate) return false;

        const refNum = refDate.getTime();
        return refNum >= startNum && refNum <= endNum;
    });
};


/* ==============================
    MAIN FUNCTIONS
================================*/

// Lead Count
// const getLeadCount = async (createdBy, email, dataType) => {
//     let where = {};
//     const { startDate, endDate } = getDateRange(dataType);

//     applyRoleFilter(where, createdBy, email);
//     applyDateFilter(where, startDate, endDate);

//     return await prisma.lead.count({ where }) || 0;
// };

const getLeadCount = async (createdBy, email, dataType, roleId = null) => {
    const { startDate, endDate } = getDateRange(dataType);
    const allLeads = await fetchBaseDashboardLeads(createdBy, email, roleId);
    const filtered = filterLeadsByDateRange(allLeads, startDate, endDate);
    return filtered.length;
};

const getCustomerCount = async (createdBy, email, dataType) => {
    // Total active clients from corporate table
    return await prisma.corporate.count({
        where: { isActive: true }
    });
};

// Total Budget
const getTotalBudget = async (createdBy, email, dataType, roleId = null) => {
    const { startDate, endDate } = getDateRange(dataType);
    const allLeads = await fetchBaseDashboardLeads(createdBy, email, roleId);
    const filtered = filterLeadsByDateRange(allLeads, startDate, endDate);

    const total = filtered.reduce((acc, lead) => {
        const budget = lead.tripInfo?.totalBudget ? Number(lead.tripInfo.totalBudget) : 0;
        return acc + budget;
    }, 0);

    return total || 0;
};

// Total Revenue
const getTotalRevenue = async (createdBy, email, dataType, roleId = null) => {
    const { startDate, endDate } = getDateRange(dataType);
    const allLeads = await fetchBaseDashboardLeads(createdBy, email, roleId);
    const filtered = filterLeadsByDateRange(allLeads, startDate, endDate);

    const total = filtered.reduce((acc, lead) => {
        const rev = lead.approvedAmount ? Number(lead.approvedAmount) : 0;
        return acc + rev;
    }, 0);

    return total || 0;
};

// Lead Status Count
const getTotalLeadStatusTime = async (createdBy, email, dataType, roleId = null) => {
    const { startDate, endDate } = getDateRange(dataType);
    const allLeads = await fetchBaseDashboardLeads(createdBy, email, roleId);
    const filtered = filterLeadsByDateRange(allLeads, startDate, endDate);

    // Group and count in JS
    const statusMap = filtered.reduce((acc, lead) => {
        const id = lead.leadStatusId;
        if (!acc[id]) {
            acc[id] = {
                status_code: lead.leadStatus?.statusCode,
                status_name: lead.leadStatus?.statusName,
                total: 0
            };
        }
        acc[id].total += 1;
        return acc;
    }, {});

    return Object.values(statusMap);
};

// Graph (Time-series grouped by Month and Stage)
const getGraph = async (createdBy, email, dataType, roleId = null) => {
    const { startDate, endDate } = getDateRange(dataType);
    const allLeads = await fetchBaseDashboardLeads(createdBy, email, roleId);
    const filtered = filterLeadsByDateRange(allLeads, startDate, endDate);

    // Grouping by Month and Stage in JS
    const graphLeads = filtered.filter(l => getReferenceDate(l) !== null);
    const grouped = graphLeads.reduce((acc, lead) => {
        const stageLabel = lead.stage || "Lead"; // Critical: Default to "Lead" if missing
        const travelDate = getReferenceDate(lead);
        const d = new Date(travelDate);
        const monthLabel = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
        const sortKey = d.toISOString().slice(0, 7); // "2026-03" for sorting

        const key = `${sortKey}_${stageLabel}`;

        if (!acc[key]) {
            acc[key] = {
                month: monthLabel,
                stage: stageLabel,
                total: 0,
                sortKey
            };
        }
        acc[key].total += 1;
        return acc;
    }, {});

    // Sort by chronological order and return
    return Object.values(grouped).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
};

/**
 * Unified Dashboard Stats (Combined for performance)
 */
const getDashboardStats = async (createdBy, email, dataType, roleId = null) => {
    const { startDate, endDate } = getDateRange(dataType);
    const allLeads = await fetchBaseDashboardLeads(createdBy, email, roleId);
    const filtered = filterLeadsByDateRange(allLeads, startDate, endDate);

    // 1. Lead Count
    const leadCount = filtered.length;

    // 2. Customer Count (Total active clients từ corporate table)
    const customerCount = await getCustomerCount(createdBy, email, dataType);

    // 3. Total Budget
    const totalBudget = filtered.reduce((acc, lead) => {
        const budget = lead.tripInfo?.totalBudget ? Number(lead.tripInfo.totalBudget) : 0;
        return acc + budget;
    }, 0);

    // 4. Total Revenue
    const totalRevenue = filtered.reduce((acc, lead) => {
        const rev = lead.approvedAmount ? Number(lead.approvedAmount) : 0;
        return acc + rev;
    }, 0);

    // 5. Lead Status Distribution
    const statusMap = filtered.reduce((acc, lead) => {
        const id = lead.leadStatusId;
        if (!acc[id]) {
            acc[id] = {
                status_code: lead.leadStatus?.statusCode,
                status_name: lead.leadStatus?.statusName,
                total: 0
            };
        }
        acc[id].total += 1;
        return acc;
    }, {});
    const leadStatusTime = Object.values(statusMap);

    // 6. Graph Data (Matches getGraph logic)
    const graphLeads = filtered.filter(l => getReferenceDate(l) !== null);
    const graphMap = graphLeads.reduce((acc, lead) => {
        const stageLabel = lead.stage || "Lead"; // Critical fallback
        const d = getReferenceDate(lead);
        const monthLabel = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
        const sortKey = d.toISOString().slice(0, 7);
        const key = `${sortKey}_${stageLabel}`;
        if (!acc[key]) {
            acc[key] = { month: monthLabel, stage: stageLabel, total: 0, sortKey };
        }
        acc[key].total += 1;
        return acc;
    }, {});
    const graphData = Object.values(graphMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // 7. Recent Leads
    const recentLeads = [...filtered]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

    // 8. Recent Lead Activity Logs
    const admin = await isAdmin(createdBy, roleId);
    const teamUserIds = await getTeamUserIds(createdBy);

    // Activity filter
    let activityWhere = admin ? {} : {
        lead: {
            OR: [
                { createdBy: { in: teamUserIds } },
                { salesUserId: { in: teamUserIds } },
                { contractingHeadUserId: { in: teamUserIds } },
                { ops_head_user_id: { in: teamUserIds } },
                { contractingTeam: { some: { userId: { in: teamUserIds } } } },
            ]
        }
    };

    if (startDate && endDate) {
        activityWhere.createdAt = { gte: startDate, lte: endDate };
    }

    const activityLogs = await prisma.leadActivityLog.findMany({
        where: activityWhere,
        include: {
            user: { select: { firstName: true, lastName: true } },
            lead: { select: { leadId: true, tripInfo: { select: { tripName: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        take: 7
    });

    return {
        leadCount,
        customerCount,
        totalBudget,
        totalRevenue,
        leadStatusTime,
        graphData,
        recentLeads,
        activityLogs,
        dateRange: { startDate, endDate, dataType }
    };
};

module.exports = {
    getLeadCount,
    getCustomerCount,
    getTotalBudget,
    getTotalRevenue,
    getTotalLeadStatusTime,
    getGraph,
    getDashboardStats,
};