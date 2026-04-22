const { prisma } = require("../../../config/database");
const { ValidationError, AuthorizationError, NotFoundError, ConflictError } = require("../../../utils/errors");

exports.getMyTrips = async (paxId, query) => {
  if (!paxId) {
    throw new Error("Pax ID is required");
  }

  let { page = 1, limit = 10, search, status } = query;

  page = Number.isInteger(+page) && +page > 0 ? +page : 1;
  limit = Number.isInteger(+limit) && +limit > 0 ? +limit : 10;

  const MAX_LIMIT = 50;
  limit = Math.min(limit, MAX_LIMIT);

  const skip = (page - 1) * limit;

  const where = {
    trip_pax: {
      some: {
        pax_id: paxId,
        booking_status: {
          not: "CANCELLED"
        }
      }
    }
  };

  if (status) {
    where.status = status;
  }

  if (search && search.trim()) {
    where.OR = [
      {
        trip_name: {
          contains: search.trim(),
          mode: "insensitive"
        }
      },
      {
        destination_city: {
          contains: search.trim(),
          mode: "insensitive"
        }
      },
      {
        trip_code: {
          contains: search.trim(),
          mode: "insensitive"
        }
      }
    ];
  }

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        start_date: "desc"
      },
      select: {
        trip_id: true,
        trip_name: true,
        trip_code: true,
        start_date: true,
        end_date: true,
        destination_city: true,
        status: true,
        trip_pax: {
          where: {
            pax_id: paxId
          },
          select: {
            booking_status: true,
            response_status: true,
            joined_via: true
          }
        }
      }
    }),
    prisma.trip.count({ where })
  ]);

  const data = trips.map(({ trip_pax, ...trip }) => ({
    ...trip,
    user_status: trip_pax?.[0] || null
  }));

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
};

exports.getTripById = async (paxId, tripId) => {
  if (!paxId) {
    throw new Error("Pax ID is required");
  }

  if (!tripId) {
    throw new Error("Trip ID is required");
  }

  const tripPax = await prisma.trip_pax.findUnique({
    where: {
      trip_id_pax_id: {
        trip_id: tripId,
        pax_id: paxId
      }
    },
    select: {
      trip_pax_id: true,
      booking_status: true,
      response_status: true,
      joined_via: true
    }
  });

  if (!tripPax) {
    throw new Error("Unauthorized or trip not found");
  }

  const tripPaxId = tripPax.trip_pax_id;

  const [trip, questions, documents] = await Promise.all([
    prisma.trip.findUnique({
      where: {
        trip_id: tripId
      },
      select: {
        trip_id: true,
        trip_name: true,
        trip_code: true,
        start_date: true,
        end_date: true,
        destination_city: true,
        status: true
      }
    }),

    prisma.trip_question.findMany({
      where: {
        trip_id: tripId,
        is_active: true
      },
      orderBy: {
        display_order: "asc"
      },
      include: {
        master_trip_question: true,
        trip_pax_answer: {
          where: {
            trip_pax_id: tripPaxId
          },
          select: {
            answer_text: true,
            answer_json: true
          }
        }
      }
    }),

    prisma.trip_pax_document.findMany({
      where: {
        trip_pax_id: tripPaxId
      },
      select: {
        trip_pax_document_id: true,
        document_id: true,
        file_name: true,
        file_url: true,
        is_submitted: true,
        verification_status: true,
        created_at: true
      }
    })
  ]);

  const formattedQuestions = questions.map((q) => ({
    question_id: q.trip_question_id,
    question: q.master_trip_question,
    is_mandatory: q.is_mandatory,
    answer: q.trip_pax_answer?.[0] || null
  }));

  return {
    trip,
    user_status: tripPax,
    questions: formattedQuestions,
    documents
  };
};
exports.joinTripold = async (paxId, appUserId, data) => {
  const { tripCode, joinedVia } = data;

  if (!paxId) {
    throw new Error("Pax ID is required");
  }

  if (!tripCode || !tripCode.trim()) {
    throw new Error("Trip code is required");
  }

  const allowedJoinMethods = ["EMAIL", "QR", "LINK", "WHATSAPP", "SMS"];

  const finalJoinedVia = allowedJoinMethods.includes(joinedVia)
    ? joinedVia
    : "LINK";

  const trip = await prisma.trip.findUnique({
    where: {
      trip_code: tripCode.trim(),
    },
    select: {
      trip_id: true,
      trip_name: true,
      trip_code: true,
      start_date: true,
      end_date: true,
      destination_city: true,
      booking_deadline: true,
      status: true,
    },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const allowedStatuses = ["DRAFT", "ACTIVE", "OPEN"];

  if (!allowedStatuses.includes(trip.status)) {
    throw new Error("Trip is not open for joining");
  }

  if (
    trip.booking_deadline &&
    new Date(trip.booking_deadline) < new Date()
  ) {
    throw new Error("Booking deadline has expired");
  }

  const existingTripPax = await prisma.trip_pax.findFirst({
    where: {
      trip_id: trip.trip_id,
      pax_id: paxId,
    },
    select: {
      trip_pax_id: true,
      booking_status: true,
      response_status: true,
      joined_via: true,
    },
  });

  if (existingTripPax) {
    return {
      alreadyJoined: true,
      message: "You have already joined this trip",
      trip: {
        trip_id: trip.trip_id,
        trip_name: trip.trip_name,
        trip_code: trip.trip_code,
        start_date: trip.start_date,
        end_date: trip.end_date,
        destination_city: trip.destination_city,
        status: trip.status,
      },
      user_status: existingTripPax,
    };
  }

  const tripPax = await prisma.trip_pax.create({
    data: {
      trip_id: trip.trip_id,
      pax_id: paxId,
      pax_type: "PRIMARY",
      booking_status: "PENDING",
      invitation_status: "ACCEPTED",
      response_status: "ACCEPTED",
      joined_via: finalJoinedVia,
      added_by: appUserId,
    },
    select: {
      trip_pax_id: true,
      booking_status: true,
      response_status: true,
      invitation_status: true,
      joined_via: true,
      added_at: true,
    },
  });

  return {
    alreadyJoined: false,
    message: "Trip joined successfully",
    trip: {
      trip_id: trip.trip_id,
      trip_name: trip.trip_name,
      trip_code: trip.trip_code,
      start_date: trip.start_date,
      end_date: trip.end_date,
      destination_city: trip.destination_city,
      status: trip.status,
    },
    user_status: tripPax,
    questions,
    required_documents: documents,
  };
};
exports.joinTrip = async (paxId, appUserId, data) => {
  const { tripCode, joinedVia } = data;

  if (!paxId) {
    throw new AuthorizationError("Pax authentication required");
  }

  if (!tripCode || !tripCode.trim()) {
    throw new ValidationError("Trip code is required");
  }

  const allowedJoinMethods = ["EMAIL", "QR", "LINK", "WHATSAPP", "SMS"];

  const finalJoinedVia = allowedJoinMethods.includes(joinedVia)
    ? joinedVia
    : "LINK";

  const trip = await prisma.trip.findUnique({
    where: {
      trip_code: tripCode.trim(),
    },
    select: {
      trip_id: true,
      trip_name: true,
      trip_code: true,
      start_date: true,
      end_date: true,
      destination_city: true,
      booking_deadline: true,
      status: true,
    },
  });

  if (!trip) {
    throw new NotFoundError("Trip");
  }

  const allowedStatuses = ["DRAFT", "ACTIVE", "OPEN"];

  if (!allowedStatuses.includes(trip.status)) {
    throw new ValidationError("Trip is not open for joining");
  }

  if (
    trip.booking_deadline &&
    new Date(trip.booking_deadline) < new Date()
  ) {
    throw new ValidationError("Booking deadline has expired");
  }

  const existingTripPax = await prisma.trip_pax.findFirst({
    where: {
      trip_id: trip.trip_id,
      pax_id: paxId,
    },
    select: {
      trip_pax_id: true,
      booking_status: true,
      response_status: true,
      joined_via: true,
    },
  });

  if (existingTripPax) {
    throw new ConflictError("You have already joined this trip");
  }

  const tripPax = await prisma.trip_pax.create({
    data: {
      trip_id: trip.trip_id,
      pax_id: paxId,
      pax_type: "PRIMARY",
      booking_status: "PENDING",
      invitation_status: "ACCEPTED",
      response_status: "ACCEPTED",
      joined_via: finalJoinedVia,
      added_by: appUserId,
    },
    select: {
      trip_pax_id: true,
      booking_status: true,
      response_status: true,
      invitation_status: true,
      joined_via: true,
      added_at: true,
    },
  });

  return {
    message: "Trip joined successfully",
    redirect_to: `/trip/${trip.trip_id}`,
    trip: {
      trip_id: trip.trip_id,
      trip_name: trip.trip_name,
      trip_code: trip.trip_code,
      start_date: trip.start_date,
      end_date: trip.end_date,
      destination_city: trip.destination_city,
      status: trip.status,
    },
    user_status: tripPax,
  };
};