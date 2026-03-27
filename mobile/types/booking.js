/**
 * @file Booking Type Definitions
 * @description Enterprise-level type definitions for Yachi booking system
 * @version 1.0.0
 * @module types/booking
 */

/**
 * @typedef {Object} BookingStatus
 * @property {'pending'} PENDING - Booking request sent, awaiting provider confirmation
 * @property {'confirmed'} CONFIRMED - Provider accepted the booking
 * @property {'in_progress'} IN_PROGRESS - Service is currently being performed
 * @property {'completed'} COMPLETED - Service finished successfully
 * @property {'cancelled'} CANCELLED - Booking was cancelled
 * @property {'expired'} EXPIRED - Booking request expired without confirmation
 * @property {'disputed'} DISPUTED - Booking has a dispute raised
 */

/**
 * @typedef {Object} BookingPriority
 * @property {'low'} LOW - Standard booking priority
 * @property {'medium'} MEDIUM - Priority booking with faster response
 * @property {'high'} HIGH - Urgent booking requiring immediate attention
 * @property {'emergency'} EMERGENCY - Critical service requirement
 */

/**
 * @typedef {Object} BookingType
 * @property {'standard'} STANDARD - Regular service booking
 * @property {'construction'} CONSTRUCTION - Construction project booking
 * @property {'government'} GOVERNMENT - Government infrastructure project
 * @property {'premium'} PREMIUM - Premium service booking
 * @property {'emergency'} EMERGENCY - Emergency service requirement
 */

/**
 * @typedef {Object} ServiceCategory
 * @property {'plumbing'} PLUMBING - Plumbing services
 * @property {'electrical'} ELECTRICAL - Electrical services
 * @property {'cleaning'} CLEANING - Cleaning services
 * @property {'construction'} CONSTRUCTION - Construction services
 * @property {'renovation'} RENOVATION - Renovation services
 * @property {'finishing'} FINISHING - Building finishing work
 * @property {'government'} GOVERNMENT - Government infrastructure
 * @property {'other'} OTHER - Other service categories
 */

/**
 * @typedef {Object} PaymentStatus
 * @property {'pending'} PENDING - Payment initiated but not completed
 * @property {'processing'} PROCESSING - Payment being processed
 * @property {'completed'} COMPLETED - Payment successfully completed
 * @property {'failed'} FAILED - Payment processing failed
 * @property {'refunded'} REFUNDED - Payment refunded to customer
 * @property {'partially_refunded'} PARTIALLY_REFUNDED - Partial refund issued
 * @property {'disputed'} DISPUTED - Payment under dispute
 */

/**
 * @typedef {Object} CancellationReason
 * @property {'client_unavailable'} CLIENT_UNAVAILABLE - Client not available at scheduled time
 * @property {'provider_unavailable'} PROVIDER_UNAVAILABLE - Provider cannot fulfill service
 * @property {'emergency'} EMERGENCY - Emergency situation occurred
 * @property {'price_issue'} PRICE_ISSUE - Disagreement on pricing
 * @property {'schedule_conflict'} SCHEDULE_CONFLICT - Scheduling conflict arose
 * @property {'service_not_needed'} SERVICE_NOT_NEEDED - Service no longer required
 * @property {'other'} OTHER - Other cancellation reason
 */

/**
 * @typedef {Object} BookingTimelineEvent
 * @property {string} id - Unique event identifier
 * @property {string} type - Event type (created, confirmed, started, completed, etc.)
 * @property {Date} timestamp - When the event occurred
 * @property {string} description - Human-readable description of the event
 * @property {string} [actorId] - ID of user who triggered the event
 * @property {string} [actorType] - Type of actor (client, provider, system, admin)
 * @property {Object} [metadata] - Additional event-specific data
 */

/**
 * @typedef {Object} Location
 * @property {string} address - Full address string
 * @property {string} city - City name
 * @property {string} region - Region or state
 * @property {string} [landmark] - Nearby landmark for easier location
 * @property {Object} coordinates - GPS coordinates
 * @property {number} coordinates.latitude - Latitude coordinate
 * @property {number} coordinates.longitude - Longitude coordinate
 * @property {string} [apartmentNumber] - Apartment or unit number
 * @property {string} [floor] - Floor number in building
 */

/**
 * @typedef {Object} ServiceDetails
 * @property {string} serviceId - ID of the service being booked
 * @property {string} serviceName - Name of the service
 * @property {ServiceCategory} category - Service category
 * @property {string} providerId - ID of the service provider
 * @property {string} providerName - Name of the service provider
 * @property {number} basePrice - Base price of the service in ETB
 * @property {number} duration - Estimated duration in minutes
 * @property {string[]} [includedItems] - Items included in the service
 * @property {string[]} [requiredTools] - Tools required for the service
 * @property {string} [specialInstructions] - Special instructions for provider
 */

/**
 * @typedef {Object} ConstructionProjectDetails
 * @property {string} projectType - Type of construction project
 * @property {number} squareArea - Total square area in square meters
 * @property {number} floorCount - Number of floors in the project
 * @property {string} buildingType - Type of building (residential, commercial, etc.)
 * @property {string[]} requiredSkills - Specific skills required for the project
 * @property {number} teamSize - Number of workers needed
 * @property {Object} timeline - Project timeline details
 * @property {Date} timeline.startDate - Project start date
 * @property {Date} timeline.estimatedEndDate - Estimated completion date
 * @property {number} timeline.durationDays - Total duration in days
 * @property {Object} budget - Budget allocation details
 * @property {number} budget.total - Total project budget in ETB
 * @property {number} budget.materials - Materials budget allocation
 * @property {number} budget.labor - Labor cost allocation
 * @property {number} budget.contingency - Contingency fund allocation
 */

/**
 * @typedef {Object} PricingBreakdown
 * @property {number} basePrice - Base service price in ETB
 * @property {number} [distanceFee] - Additional fee for distance
 * @property {number} [emergencyFee] - Emergency service fee if applicable
 * @property {number} [premiumFee] - Premium service fee if applicable
 * @property {number} [materialCost] - Cost of materials if provided by provider
 * @property {number} [taxAmount] - Tax amount if applicable
 * @property {number} [platformFee] - Platform service fee (currently 0 for Yachi)
 * @property {number} totalAmount - Total amount to be paid in ETB
 * @property {string} currency - Currency code (ETB)
 */

/**
 * @typedef {Object} Booking
 * @property {string} id - Unique booking identifier
 * @property {string} clientId - ID of the client making the booking
 * @property {string} clientName - Name of the client
 * @property {string} clientPhone - Client's phone number
 * @property {string} clientEmail - Client's email address
 * @property {ServiceDetails} service - Service being booked
 * @property {BookingType} type - Type of booking
 * @property {BookingStatus} status - Current booking status
 * @property {BookingPriority} priority - Booking priority level
 * @property {Location} location - Service location details
 * @property {Object} schedule - Booking schedule information
 * @property {Date} schedule.preferredDate - Preferred service date
 * @property {string} schedule.preferredTime - Preferred time slot
 * @property {Date} schedule.actualStart - Actual service start time
 * @property {Date} schedule.actualEnd - Actual service completion time
 * @property {PricingBreakdown} pricing - Detailed pricing information
 * @property {PaymentStatus} paymentStatus - Current payment status
 * @property {string} [paymentMethod] - Payment method used
 * @property {string} [paymentTransactionId] - Payment gateway transaction ID
 * @property {ConstructionProjectDetails} [constructionDetails] - Construction-specific details
 * @property {string[]} [assignedWorkerIds] - IDs of assigned workers (for construction)
 * @property {string} [aiAssignmentId] - ID of AI assignment that created this booking
 * @property {BookingTimelineEvent[]} timeline - Booking status timeline
 * @property {Object} [cancellation] - Cancellation details if cancelled
 * @property {CancellationReason} [cancellation.reason] - Reason for cancellation
 * @property {string} [cancellation.notes] - Additional cancellation notes
 * @property {string} [cancellation.cancelledBy] - ID of user who cancelled
 * @property {Date} [cancellation.timestamp] - When cancellation occurred
 * @property {Object} [rating] - Rating and review details
 * @property {number} [rating.score] - Rating score (1-5)
 * @property {string} [rating.comment] - Review comment
 * @property {Date} [rating.timestamp] - When rating was submitted
 * @property {string[]} [rating.images] - Review images URLs
 * @property {Object} metadata - Additional booking metadata
 * @property {boolean} metadata.isRescheduled - Whether booking was rescheduled
 * @property {number} metadata.rescheduleCount - Number of times rescheduled
 * @property {boolean} metadata.hasDispute - Whether dispute was raised
 * @property {string} metadata.bookingSource - How booking was created (app, web, referral)
 * @property {Date} createdAt - When booking was created
 * @property {Date} updatedAt - When booking was last updated
 * @property {string} createdBy - ID of user who created the booking
 */

/**
 * @typedef {Object} BookingCreateRequest
 * @property {string} serviceId - ID of service to book
 * @property {string} providerId - ID of service provider
 * @property {BookingType} type - Type of booking
 * @property {Location} location - Service location
 * @property {Object} schedule - Preferred schedule
 * @property {Date} schedule.preferredDate - Preferred date
 * @property {string} schedule.preferredTime - Preferred time
 * @property {string} [specialInstructions] - Special instructions for provider
 * @property {ConstructionProjectDetails} [constructionDetails] - For construction bookings
 * @property {BookingPriority} [priority] - Booking priority level
 */

/**
 * @typedef {Object} BookingUpdateRequest
 * @property {BookingStatus} [status] - New status to set
 * @property {Object} [schedule] - Updated schedule information
 * @property {Date} [schedule.preferredDate] - New preferred date
 * @property {string} [schedule.preferredTime] - New preferred time
 * @property {Location} [location] - Updated location
 * @property {string} [specialInstructions] - Updated instructions
 */

/**
 * @typedef {Object} BookingFilter
 * @property {BookingStatus[]} [status] - Filter by status
 * @property {ServiceCategory[]} [category] - Filter by service category
 * @property {BookingType[]} [type] - Filter by booking type
 * @property {Date} [fromDate] - Filter from date
 * @property {Date} [toDate] - Filter to date
 * @property {string} [clientId] - Filter by client ID
 * @property {string} [providerId] - Filter by provider ID
 * @property {string} [city] - Filter by city
 * @property {boolean} [hasRating] - Filter by whether rated or not
 */

/**
 * @typedef {Object} BookingStats
 * @property {number} totalBookings - Total number of bookings
 * @property {number} pendingBookings - Number of pending bookings
 * @property {number} completedBookings - Number of completed bookings
 * @property {number} cancelledBookings - Number of cancelled bookings
 * @property {number} totalRevenue - Total revenue in ETB
 * @property {number} averageRating - Average booking rating
 * @property {Object} byCategory - Stats grouped by service category
 * @property {Object} byStatus - Stats grouped by status
 * @property {Object} timeline - Monthly booking trends
 */

/**
 * Booking validation error types
 * @typedef {Object} BookingValidationError
 * @property {string} field - Field that failed validation
 * @property {string} code - Error code
 * @property {string} message - Human-readable error message
 * @property {*} [value] - Invalid value that caused error
 */

export {
  // Types
  BookingStatus,
  BookingPriority,
  BookingType,
  ServiceCategory,
  PaymentStatus,
  CancellationReason,
  
  // Interfaces
  BookingTimelineEvent,
  Location,
  ServiceDetails,
  ConstructionProjectDetails,
  PricingBreakdown,
  Booking,
  BookingCreateRequest,
  BookingUpdateRequest,
  BookingFilter,
  BookingStats,
  BookingValidationError
};