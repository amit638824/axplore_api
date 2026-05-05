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
            trip_pax_id: true,
            booking_status: true,
            response_status: true,
            joined_via: true,
            trip_pax_document: {
              select: {
                verification_status: true,
                master_document: {
                  select: {
                    document_name: true
                  }
                }
              }
            }
          }
        }
      }
    }),
    prisma.trip.count({ where })
  ]);

  // Fetch destination images for cities
  const cityNames = [...new Set(trips.map(t => t.destination_city).filter(Boolean))];
  const cityImages = await prisma.masterCity.findMany({
    where: {
      name: { in: cityNames }
    },
    select: {
      name: true,
      city_image: true
    }
  });

  const cityImageMap = cityImages.reduce((acc, city) => {
    acc[city.name] = city.city_image;
    return acc;
  }, {});

  const data = trips.map(({ trip_pax, ...trip }) => {
    const userStatus = trip_pax?.[0] || null;
    const documents = userStatus?.trip_pax_document || [];

    // Logistic status calculation
    const visaDoc = documents.find(d => 
      d.master_document.document_name.toLowerCase().includes('visa')
    );
    const ticketDoc = documents.find(d => 
      d.master_document.document_name.toLowerCase().includes('ticket')
    );

    return {
      ...trip,
      destination_image_url: cityImageMap[trip.destination_city] || null,
      visa_status: visaDoc ? visaDoc.verification_status : 'NOT_SUBMITTED',
      ticket_status: ticketDoc ? ticketDoc.verification_status : 'NOT_ISSUED',
      profile_status: 'INCOMPLETE', // Placeholder logic
      user_status: userStatus
    };
  });

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

  const tripPax = await prisma.trip_pax.findFirst({
    where: {
      trip_id: tripId,
      pax_id: paxId
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

  /* if (
    trip.booking_deadline &&
    new Date(trip.booking_deadline) < new Date()
  ) {
    throw new ValidationError("Booking deadline has expired");
  } */

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
      added_by: appUserId || "6e819b21-98d4-4ae0-830a-707b6aa393b5",
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

exports.getStatusTracker = async (paxId, tripId) => {
  if (!paxId || !tripId) {
    throw new Error("Pax ID and Trip ID are required");
  }

  const tripPax = await prisma.trip_pax.findFirst({
    where: { pax_id: paxId, trip_id: tripId },
    include: {
      pax: true,
      trip_pax_document: {
        include: { master_document: true }
      }
    }
  });

  if (!tripPax) {
    throw new Error("Trip participation not found");
  }

  const docs = tripPax.trip_pax_document;
  
  // NEW: Using the status columns from trip_pax table
  return {
    paxId,
    tripId,
    status_tracker: {
      profile_completed: tripPax.profile_completed,
      passport_verified: tripPax.passport_verified,
      visa_submitted: tripPax.visa_submitted,
      visa_approved: tripPax.visa_approved,
      in_progress: tripPax.in_progress,
      tickets_issued: tripPax.tickets_issued,
      ready_to_travel: tripPax.ready_to_travel
    }
  };
};

exports.updateTripUserDetails = async (paxId, tripId, userDetails) => {
  try {
    // 1. Update basic Pax info
    const updatedPax = await prisma.pax.update({
      where: { pax_id: paxId },
      data: {
        first_name: userDetails.firstName,
        date_of_birth: userDetails.dob ? new Date(userDetails.dob.split('/').reverse().join('-')) : undefined,
        gender: userDetails.gender,
        current_address_line_1: userDetails.address,
        current_city: userDetails.city,
        current_state_name: userDetails.state,
        current_postal_code: userDetails.pincode,
        nationality_code: userDetails.country
      }
    });

    // 2. Add or Update Emergency Contact for this Pax (simple version)
    if (userDetails.contactName) {
       const existingContact = await prisma.pax_emergency_contact.findFirst({
         where: { pax_id: paxId }
       });
       
       if (existingContact) {
         await prisma.pax_emergency_contact.update({
           where: { emergency_contact_id: existingContact.emergency_contact_id },
           data: {
             contact_name: userDetails.contactName,
             relationship: userDetails.relationship,
             mobile_no: userDetails.phoneNumber
           }
         });
       } else {
         await prisma.pax_emergency_contact.create({
           data: {
             pax_id: paxId,
             contact_name: userDetails.contactName,
             relationship: userDetails.relationship,
             mobile_no: userDetails.phoneNumber
           }
         });
       }
    }

    return {
      tripId,
      paxId,
      ...userDetails,
      createdAt: new Date()
    };
  } catch (error) {
    throw error;
  }
};

exports.uploadPaxDocument = async (paxId, tripId, documentType, fileUrl, scannedText) => {
  try {
    const tripPax = await prisma.trip_pax.findFirst({
      where: {
        trip_id: tripId,
        pax_id: paxId
      }
    });

    if (!tripPax) {
      throw new Error("Trip participation not found");
    }

    // Find the master document ID for 'Passport' or specified type
    const masterDoc = await prisma.master_document.findFirst({
      where: {
        document_code: {
          contains: documentType.split('_')[0], // e.g., 'passport' from 'passport_front'
          mode: 'insensitive'
        }
      }
    });

    if (!masterDoc) {
      throw new ValidationError(`Invalid document type: ${documentType}`);
    }

    const isPassportFront = documentType === 'passport_front';

    // Create or update the document record
    const doc = await prisma.trip_pax_document.create({
      data: {
        trip_pax_id: tripPax.trip_pax_id,
        document_id: masterDoc.document_id,
        file_url: fileUrl,
        file_name: isPassportFront ? 'Passport Front' : 'Passport Back',
        document_value_json: scannedText,
        is_submitted: true,
        verification_status: 'PENDING'
      }
    });

    // AUTO UPDATE STATUS TRACKER
    const updatePayload = {};
    const docNameLow = (masterDoc?.document_name || '').toLowerCase();
    
    if (docNameLow.includes('visa')) {
      updatePayload.visa_submitted = true;
    }

    if (Object.keys(updatePayload).length > 0) {
      await prisma.trip_pax.update({
        where: { trip_pax_id: tripPax.trip_pax_id },
        data: updatePayload
      });
    }

    return {
      paxId,
      tripId,
      documentType,
      imageUrl: fileUrl,
      scannedText,
      uploadedAt: new Date()
    };
  } catch (error) {
    throw error;
  }
};

exports.getFlightDetails = async (paxId, tripId) => {
  const tripPax = await prisma.trip_pax.findUnique({
    where: { trip_id_pax_id: { trip_id: tripId, pax_id: paxId } }
  });
  if (!tripPax) throw new NotFoundError("Trip participation");

  const ticket = await prisma.ops_ticketing.findFirst({
    where: { trip_pax_id: tripPax.trip_pax_id },
    include: {
      flight_sector: {
        include: {
          master_city_flight_sector_from_city_idTomaster_city: true,
          master_city_flight_sector_to_city_idTomaster_city: true
        }
      }
    }
  });

  if (!ticket || ticket.flight_sector.length === 0) {
    throw new NotFoundError("Flight details");
  }

  const primarySector = ticket.flight_sector[0];
  const fromCity = primarySector.master_city_flight_sector_from_city_idTomaster_city;
  const toCity = primarySector.master_city_flight_sector_to_city_idTomaster_city;

  // Retrieve Airport Info from Cities
  let departureHub = null;
  if (primarySector.from_city_id) {
    departureHub = await prisma.master_pickup_hub.findFirst({
      where: { city_id: primarySector.from_city_id, is_active: true }
    });
  }

  let arrivalHub = null;
  if (primarySector.to_city_id) {
    arrivalHub = await prisma.master_pickup_hub.findFirst({
      where: { city_id: primarySector.to_city_id, is_active: true }
    });
  }

  return {
    flight: {
      airline: ticket.airline_code || primarySector.airline_code,
      flightNumber: primarySector.flight_number
    },
    departure: {
      time: primarySector.departure_time,
      date: primarySector.departure_time,
      airport: {
        name: departureHub ? departureHub.hub_name : (fromCity ? fromCity.name : "N/A"),
        code: departureHub ? departureHub.hub_code_iata : "N/A",
        terminal: primarySector.departure_terminal || null
      }
    },
    duration: "N/A", // Calculated on UI or Needs custom logic
    arrival: {
      time: primarySector.arrival_time,
      date: primarySector.arrival_time,
      airport: {
        name: arrivalHub ? arrivalHub.hub_name : (toCity ? toCity.name : "N/A"),
        code: arrivalHub ? arrivalHub.hub_code_iata : "N/A",
        terminal: primarySector.arrival_terminal || null
      }
    },
    bookingInfo: {
      bookingReference: ticket.pnr,
      class: ticket.travel_class || "Economy",
      seatNumber: ticket.seat_no,
      baggage: ticket.baggage || "20 kg"
    }
  };
};

exports.getHotelDetails = async (paxId, tripId) => {
  const tripPax = await prisma.trip_pax.findFirst({
    where: { trip_id: tripId, pax_id: paxId }
  });
  if (!tripPax) throw new NotFoundError("Trip participation");

  // Assuming hotel is booked at the trip level and pax is mapped via room allocation
  const hotel = await prisma.ops_hotel_booking.findFirst({
    where: { trip_id: tripId },
    include: {
      master_vendor: true,
      ops_room_allocation: {
        include: {
          ops_room_pax_mapping: {
            where: { trip_pax_id: tripPax.trip_pax_id }
          }
        }
      }
    }
  });

  if (!hotel) throw new NotFoundError("Hotel details");

  let userRoom = hotel.ops_room_allocation.find(room => room.ops_room_pax_mapping.length > 0);
  if (!userRoom && hotel.ops_room_allocation.length > 0) {
     userRoom = hotel.ops_room_allocation[0]; // fallback
  }

  const vendor = hotel.master_vendor;

  return {
    hotel: {
      name: hotel.hotel_name || (vendor ? vendor.vendor_name : null),
      address: vendor ? vendor.address : null
    },
    stayDetails: {
      checkIn: {
        date: hotel.checkin,
        time: hotel.checkin
      },
      checkOut: {
        date: hotel.checkout,
        time: hotel.checkout
      },
      numberOfNights: null, // UI handles or can be diff of dates
      roomType: userRoom ? userRoom.room_type : null,
      guests: userRoom ? userRoom.ops_room_pax_mapping.length : 1
    },
    bookingInfo: {
      bookingReference: hotel.booking_reference || hotel.booking_id
    },
    contactInformation: {
      phone: vendor ? vendor.contact_number : null,
      email: vendor ? vendor.contact_email : null
    }
  };
};

exports.getItinerary = async (paxId, tripId) => {
  const items = await prisma.ops_itinerary.findMany({
    where: { trip_id: tripId },
    orderBy: { day_no: 'asc' }
  });

  const trip = await prisma.trip.findUnique({ where: { trip_id: tripId }, select: { start_date: true }});
  
  if (items.length === 0) {
     throw new NotFoundError("Itinerary not found");
  }

  const days = items.map(item => {
    let date = null;
    if (trip && trip.start_date) {
        date = new Date(trip.start_date);
        date.setDate(date.getDate() + (item.day_no - 1));
    }
    
    let activities = [];
    if (item.activity_details) {
      if (typeof item.activity_details === 'string') {
        try { activities = JSON.parse(item.activity_details); } catch(e) {}
      } else if (Array.isArray(item.activity_details)) {
        activities = item.activity_details;
      }
    }

    return {
      day: item.day_no,
      date: date,
      totalActivities: activities.length,
      activities: activities
    };
  });

  return {
    tripId,
    paxId,
    itinerary: days
  };
};

exports.getAdditionalDocuments = async (paxId, tripId) => {
  const tripPax = await prisma.trip_pax.findFirst({
    where: { trip_id: tripId, pax_id: paxId }
  });

  if (!tripPax) throw new NotFoundError("Trip participation");

  const docs = await prisma.trip_pax_document.findMany({
    where: { trip_pax_id: tripPax.trip_pax_id },
    include: { master_document: true }
  });

  return {
    paxId,
    tripId,
    documents: docs.map(d => ({
      documentType: d.master_document.document_code,
      documentName: d.master_document.document_name,
      status: d.verification_status,
      uploaded: d.is_submitted,
      uploadedAt: d.created_at,
      fileUrl: d.file_url,
      remarks: d.remarks
    }))
  };
};

exports.getDownloadableFiles = async (paxId, tripId) => {
  const tripPax = await prisma.trip_pax.findUnique({
    where: { trip_id_pax_id: { trip_id: tripId, pax_id: paxId } }
  });

  if (!tripPax) throw new NotFoundError("Trip participation");

  // 1. Fetch Pax Documents
  const paxDocs = await prisma.trip_pax_document.findMany({
    where: { trip_pax_id: tripPax.trip_pax_id, is_submitted: true },
    include: { master_document: true }
  });

  // 2. Fetch Tickets
  const tickets = await prisma.ops_ticketing.findMany({
    where: { trip_pax_id: tripPax.trip_pax_id, is_active: true }
  });

  const allDocuments = [];

  paxDocs.forEach(d => {
    if(d.file_url) {
      allDocuments.push({
        documentId: d.trip_pax_document_id,
        title: d.file_name || d.master_document.document_name,
        type: 'document',
        fileFormat: d.mime_type || 'PDF',
        fileSize: d.file_size_bytes ? `${Math.round(Number(d.file_size_bytes)/1024)} KB` : 'N/A',
        uploadedDate: d.created_at,
        fileUrl: d.file_url
      });
    }
  });

  tickets.forEach(t => {
    if(t.ticket_pdf) {
      allDocuments.push({
        documentId: t.ticket_id,
        title: 'Flight Ticket - ' + (t.airline_code || t.pnr || 'Air'),
        type: 'ticket',
        fileFormat: 'PDF',
        fileSize: 'N/A',
        uploadedDate: t.created_at,
        fileUrl: t.ticket_pdf
      });
    }
  });

  return {
    paxId,
    tripId,
    totalFiles: allDocuments.length,
    downloadAllUrl: null, // Placeholder
    documents: allDocuments
  };
};

exports.getTripQRCode = async (paxId, tripId) => {
  const tripPax = await prisma.trip_pax.findUnique({
    where: { trip_id_pax_id: { trip_id: tripId, pax_id: paxId } },
    include: { trip: true }
  });

  if (!tripPax) throw new NotFoundError("Trip participation");

  return {
    paxId,
    tripId,
    qrCodeUrl: tripPax.qr_code || "https://placeholder-qr-link.com",
    expiresAt: tripPax.qr_expires_at || tripPax.trip.end_date
  };
};

exports.addTrip = async (paxId, tripId) => {
  // Check if trip exists
  const trip = await prisma.trip.findUnique({
    where: { trip_id: tripId }
  });
  if (!trip) throw new NotFoundError("Trip");

  // Check if already joined
  const existing = await prisma.trip_pax.findUnique({
    where: { trip_id_pax_id: { trip_id: tripId, pax_id: paxId } }
  });

  if (existing) {
    return { success: true, message: "Trip already added" };
  }

  await prisma.trip_pax.create({
    data: {
      trip_id: tripId,
      pax_id: paxId,
      added_by: "6e819b21-98d4-4ae0-830a-707b6aa393b5", // System/Admin fallback
      booking_status: "CONFIRMED",
      pax_type: "PRIMARY"
    }
  });

  return { success: true, message: "Trip Added Successfully" };
};


