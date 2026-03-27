/**
 * @file Service Type Definitions
 * @description Enterprise-level type definitions for Yachi service marketplace
 * @version 1.0.0
 * @module types/service
 */

/**
 * @typedef {Object} ServiceStatus
 * @property {'active'} ACTIVE - Service is available for booking
 * @property {'inactive'} INACTIVE - Service is temporarily unavailable
 * @property {'suspended'} SUSPENDED - Service suspended by admin
 * @property {'deleted'} DELETED - Service has been deleted
 * @property {'pending_approval'} PENDING_APPROVAL - Awaiting admin approval
 * @property {'expired'} EXPIRED - Service listing has expired
 */

/**
 * @typedef {Object} ServiceCategory
 * @property {'plumbing'} PLUMBING - Plumbing and pipe work
 * @property {'electrical'} ELECTRICAL - Electrical installations and repairs
 * @property {'cleaning'} CLEANING - Residential and commercial cleaning
 * @property {'construction'} CONSTRUCTION - Building construction services
 * @property {'renovation'} RENOVATION - Home and building renovations
 * @property {'finishing'} FINISHING - Interior and exterior finishing
 * @property {'carpentry'} CARPENTRY - Woodwork and furniture
 * @property {'painting'} PAINTING - Painting and decoration
 * @property {'gardening'} GARDENING - Landscaping and gardening
 * @property {'moving'} MOVING - Moving and relocation services
 * @property {'government'} GOVERNMENT - Government infrastructure projects
 * @property {'other'} OTHER - Other service categories
 */

/**
 * @typedef {Object} ServiceProviderType
 * @property {'individual'} INDIVIDUAL - Individual service provider
 * @property {'company'} COMPANY - Registered business or company
 * @property {'government'} GOVERNMENT - Government entity or contractor
 * @property {'premium'} PREMIUM - Premium verified provider
 */

/**
 * @typedef {Object} VerificationLevel
 * @property {'unverified'} UNVERIFIED - Not yet verified
 * @property {'basic'} BASIC - Basic identity verification
 * @property {'enhanced'} ENHANCED - Enhanced verification with documents
 * @property {'premium'} PREMIUM - Premium verification with background check
 * @property {'government'} GOVERNMENT - Government entity verification
 */

/**
 * @typedef {Object} PricingModel
 * @property {'fixed'} FIXED - Fixed price for service
 * @property {'hourly'} HOURLY - Hourly rate pricing
 * @property {'square_meter'} SQUARE_METER - Price per square meter (construction)
 * @property {'negotiable'} NEGOTIABLE - Price is negotiable
 * @property {'custom'} CUSTOM - Custom pricing based on requirements
 */

/**
 * @typedef {Object} AvailabilityStatus
 * @property {'available'} AVAILABLE - Available for immediate booking
 * @property {'busy'} BUSY - Currently busy but can schedule
 * @property {'unavailable'} UNAVAILABLE - Temporarily unavailable
 * @property {'on_leave'} ON_LEAVE - On leave/vacation
 * @property {'emergency_only'} EMERGENCY_ONLY - Only available for emergencies
 */

/**
 * @typedef {Object} ServiceScope
 * @property {'small'} SMALL - Small scale projects (1-2 workers)
 * @property {'medium'} MEDIUM - Medium scale projects (3-5 workers)
 * @property {'large'} LARGE - Large scale projects (6+ workers)
 * @property {'enterprise'} ENTERPRISE - Enterprise/government scale projects
 * @property {'custom'} CUSTOM - Custom scope based on requirements
 */

/**
 * @typedef {Object} ServiceLocation
 * @property {string} address - Full service address
 * @property {string} city - City name
 * @property {string} region - Region or state
 * @property {Object} coordinates - GPS coordinates
 * @property {number} coordinates.latitude - Latitude coordinate
 * @property {number} coordinates.longitude - Longitude coordinate
 * @property {string[]} coverageAreas - Areas where service is provided
 * @property {number} travelRadius - Maximum travel radius in kilometers
 * @property {boolean} providesRemoteService - Whether remote service is available
 * @property {string} [remoteServiceDetails] - Details about remote service offering
 */

/**
 * @typedef {Object} ServicePricing
 * @property {PricingModel} model - Pricing model type
 * @property {number} basePrice - Base price in ETB
 * @property {string} currency - Currency code (ETB)
 * @property {number} [hourlyRate] - Hourly rate if applicable
 * @property {number} [minHours] - Minimum hours for booking
 * @property {number} [maxHours] - Maximum hours per day
 * @property {number} [pricePerSquareMeter] - Price per m² for construction
 * @property {Object} [additionalFees] - Additional fee structure
 * @property {number} [additionalFees.travelFee] - Travel fee if outside radius
 * @property {number} [additionalFees.materialFee] - Material cost if provided
 * @property {number} [additionalFees.emergencyFee] - Emergency service fee
 * @property {number} [additionalFees.platformFee] - Platform fee (currently 0)
 * @property {Object} [discounts] - Available discounts
 * @property {number} [discounts.firstBooking] - First booking discount percentage
 * @property {number} [discounts.bulkBooking] - Bulk booking discount
 * @property {number} [discounts.seasonal] - Seasonal discount percentage
 */

/**
 * @typedef {Object} ServiceAvailability
 * @property {AvailabilityStatus} status - Current availability status
 * @property {Object} schedule - Weekly availability schedule
 * @property {string[]} workingDays - Available days (mon, tue, wed, etc.)
 * @property {string} startTime - Daily start time (HH:MM)
 * @property {string} endTime - Daily end time (HH:MM)
 * @property {boolean} availableWeekends - Whether available on weekends
 * @property {string[]} unavailableDates - Specific dates when unavailable
 * @property {number} advanceBookingDays - How many days in advance can book
 * @property {number} sameDayBooking - Whether same-day booking allowed
 * @property {number} maxDailyBookings - Maximum bookings per day
 */

/**
 * @typedef {Object} ServiceRequirements
 * @property {string[]} requiredTools - Tools required for the service
 * @property {string[]} requiredMaterials - Materials needed (provided by client)
 * @property {string[]} providedMaterials - Materials provided by service provider
 * @property {string[]} skillsRequired - Specific skills needed
 * @property {string[]} certifications - Required certifications
 * @property {number} minWorkers - Minimum workers needed
 * @property {number} maxWorkers - Maximum workers for the service
 * @property {string} experienceLevel - Required experience level
 * @property {string[]} languages - Languages spoken by provider
 */

/**
 * @typedef {Object} ServiceMedia
 * @property {string} id - Media item ID
 * @property {string} url - Media file URL
 * @property {string} type - Media type (image, video, document)
 * @property {string} caption - Media caption/description
 * @property {boolean} isPrimary - Whether this is primary media
 * @property {Date} uploadedAt - When media was uploaded
 * @property {string} [thumbnailUrl] - Thumbnail URL for videos
 */

/**
 * @typedef {Object} ServiceReview
 * @property {string} id - Review ID
 * @property {string} bookingId - Associated booking ID
 * @property {string} clientId - Client who wrote the review
 * @property {string} clientName - Client's display name
 * @property {string} clientAvatar - Client's avatar URL
 * @property {number} rating - Rating score (1-5)
 * @property {string} comment - Review comment text
 * @property {string[]} mediaUrls - Review media URLs
 * @property {Object} providerResponse - Provider's response to review
 * @property {string} [providerResponse.comment] - Provider's response comment
 * @property {Date} [providerResponse.timestamp] - When provider responded
 * @property {string[]} tags - Review tags (professional, punctual, etc.)
 * @property {boolean} isVerified - Whether review is from verified booking
 * @property {boolean} isRecommended - Whether client recommends the service
 * @property {Date} createdAt - When review was created
 * @property {Date} updatedAt - When review was last updated
 */

/**
 * @typedef {Object} ServiceStatistics
 * @property {number} totalBookings - Total number of bookings
 * @property {number} completedBookings - Number of completed bookings
 * @property {number} cancelledBookings - Number of cancelled bookings
 * @property {number} totalRevenue - Total revenue generated in ETB
 * @property {number} averageRating - Average rating score
 * @property {number} reviewCount - Number of reviews
 * @property {number} repeatClientRate - Percentage of repeat clients
 * @property {number} responseRate - Percentage of booking requests accepted
 * @property {number} completionRate - Percentage of bookings completed
 * @property {Object} ratingBreakdown - Detailed rating breakdown
 * @property {number} ratingBreakdown.fiveStar - Number of 5-star ratings
 * @property {number} ratingBreakdown.fourStar - Number of 4-star ratings
 * @property {number} ratingBreakdown.threeStar - Number of 3-star ratings
 * @property {number} ratingBreakdown.twoStar - Number of 2-star ratings
 * @property {number} ratingBreakdown.oneStar - Number of 1-star ratings
 */

/**
 * @typedef {Object} ConstructionServiceDetails
 * @property {string} projectType - Type of construction project
 * @property {number} minSquareArea - Minimum area in square meters
 * @property {number} maxSquareArea - Maximum area in square meters
 * @property {number} maxFloors - Maximum number of floors supported
 * @property {string[]} buildingTypes - Supported building types
 * @property {string[]} specializedSkills - Specialized construction skills
 * @property {Object} teamComposition - Default team composition
 * @property {number} teamComposition.supervisors - Number of supervisors
 * @property {number} teamComposition.skilledWorkers - Number of skilled workers
 * @property {number} teamComposition.laborers - Number of laborers
 * @property {Object} equipment - Available equipment
 * @property {string[]} equipment.owned - Equipment owned by provider
 * @property {string[]} equipment.rented - Equipment available for rent
 * @property {boolean} providesMaterials - Whether materials are provided
 * @property {string[]} materialSuppliers - Preferred material suppliers
 * @property {Object} safetyStandards - Safety standards compliance
 * @property {boolean} safetyStandards.oshCompliant - OSH compliance
 * @property {string[]} safetyStandards.certifications - Safety certifications
 */

/**
 * @typedef {Object} GovernmentServiceDetails
 * @property {string} ministry - Associated government ministry
 * @property {string} projectCategory - Government project category
 * @property {string} tenderNumber - Government tender number
 * @property {number} budgetRange - Project budget range
 * @property {string} timeline - Project timeline requirements
 * @property {string[]} complianceRequirements - Government compliance requirements
 * @property {string[]} requiredLicenses - Required government licenses
 * @property {string} procurementProcess - Procurement process type
 * @property {boolean} isPublicTender - Whether it's a public tender
 * @property {Date} submissionDeadline - Tender submission deadline
 */

/**
 * @typedef {Object} Service
 * @property {string} id - Unique service identifier
 * @property {string} title - Service title/name
 * @property {string} description - Detailed service description
 * @property {ServiceCategory} category - Service category
 * @property {string[]} tags - Service tags for search
 * @property {ServiceStatus} status - Current service status
 * @property {ServiceProviderType} providerType - Type of service provider
 * @property {string} providerId - ID of the service provider
 * @property {string} providerName - Name of the service provider
 * @property {VerificationLevel} verificationLevel - Provider verification level
 * @property {boolean} isPremium - Whether this is a premium service
 * @property {ServiceLocation} location - Service location details
 * @property {ServicePricing} pricing - Pricing information
 * @property {ServiceAvailability} availability - Availability schedule
 * @property {ServiceRequirements} requirements - Service requirements
 * @property {ServiceMedia[]} media - Service photos and videos
 * @property {ServiceReview[]} reviews - Service reviews and ratings
 * @property {ServiceStatistics} stats - Service performance statistics
 * @property {ConstructionServiceDetails} [constructionDetails] - Construction-specific details
 * @property {GovernmentServiceDetails} [governmentDetails] - Government project details
 * @property {Object} aiMatching - AI matching preferences
 * @property {string[]} aiMatching.preferredSkills - Skills for AI matching
 * @property {string[]} aiMatching.excludedSkills - Skills to avoid in matching
 * @property {number} aiMatching.matchScore - AI matching score
 * @property {Object} metadata - Additional service metadata
 * @property {number} metadata.views - Number of service views
 * @property {number} metadata.favorites - Number of times favorited
 * @property {number} metadata.impressions - Search impression count
 * @property {string} metadata.featuredUntil - Date until service is featured
 * @property {string[]} metadata.badges - Service badges and awards
 * @property {Date} createdAt - When service was created
 * @property {Date} updatedAt - When service was last updated
 * @property {Date} expiresAt - When service listing expires
 * @property {string} createdBy - ID of user who created the service
 */

/**
 * @typedef {Object} ServiceCreateRequest
 * @property {string} title - Service title
 * @property {string} description - Service description
 * @property {ServiceCategory} category - Service category
 * @property {string[]} tags - Service tags
 * @property {ServiceLocation} location - Service location
 * @property {ServicePricing} pricing - Pricing configuration
 * @property {ServiceAvailability} availability - Availability settings
 * @property {ServiceRequirements} requirements - Service requirements
 * @property {ConstructionServiceDetails} [constructionDetails] - For construction services
 * @property {GovernmentServiceDetails} [governmentDetails] - For government services
 * @property {string[]} [mediaUrls] - Initial media URLs
 */

/**
 * @typedef {Object} ServiceUpdateRequest
 * @property {string} [title] - Updated title
 * @property {string} [description] - Updated description
 * @property {ServiceStatus} [status] - Updated status
 * @property {ServicePricing} [pricing] - Updated pricing
 * @property {ServiceAvailability} [availability] - Updated availability
 * @property {ServiceLocation} [location] - Updated location
 * @property {string[]} [tags] - Updated tags
 */

/**
 * @typedef {Object} ServiceSearchFilter
 * @property {string} [query] - Search query string
 * @property {ServiceCategory[]} [categories] - Filter by categories
 * @property {string} [city] - Filter by city
 * @property {string} [region] - Filter by region
 * @property {number} [minPrice] - Minimum price filter
 * @property {number} [maxPrice] - Maximum price filter
 * @property {number} [minRating] - Minimum rating filter
 * @property {VerificationLevel[]} [verificationLevels] - Filter by verification
 * @property {ServiceProviderType[]} [providerTypes] - Filter by provider type
 * @property {boolean} [availableNow] - Filter by immediate availability
 * @property {boolean} [premiumOnly] - Filter premium services only
 * @property {string[]} [tags] - Filter by specific tags
 * @property {ServiceScope} [scope] - Filter by project scope
 * @property {PricingModel} [pricingModel] - Filter by pricing model
 * @property {string} [sortBy] - Sort field (rating, price, distance, etc.)
 * @property {string} [sortOrder] - Sort order (asc, desc)
 * @property {number} [page] - Page number for pagination
 * @property {number} [limit] - Results per page
 */

/**
 * @typedef {Object} ServiceSearchResult
 * @property {Service[]} services - Matching services
 * @property {number} totalCount - Total number of matching services
 * @property {number} page - Current page number
 * @property {number} totalPages - Total number of pages
 * @property {Object} filters - Applied filters
 * @property {Object} metadata - Search metadata
 * @property {number} metadata.searchTime - Search execution time in ms
 * @property {string} metadata.searchId - Unique search identifier
 */

/**
 * @typedef {Object} ServiceRecommendation
 * @property {Service} service - Recommended service
 * @property {number} matchScore - Recommendation match score (0-100)
 * @property {string[]} matchReasons - Reasons for recommendation
 * @property {string} recommendationType - Type of recommendation
 */

/**
 * @typedef {Object} ServiceValidationError
 * @property {string} field - Field that failed validation
 * @property {string} code - Error code
 * @property {string} message - Human-readable error message
 * @property {*} [value] - Invalid value that caused error
 */

export {
  // Status and Type Enums
  ServiceStatus,
  ServiceCategory,
  ServiceProviderType,
  VerificationLevel,
  PricingModel,
  AvailabilityStatus,
  ServiceScope,

  // Core Interfaces
  ServiceLocation,
  ServicePricing,
  ServiceAvailability,
  ServiceRequirements,
  ServiceMedia,
  ServiceReview,
  ServiceStatistics,
  ConstructionServiceDetails,
  GovernmentServiceDetails,
  Service,
  
  // Request/Response Interfaces
  ServiceCreateRequest,
  ServiceUpdateRequest,
  ServiceSearchFilter,
  ServiceSearchResult,
  ServiceRecommendation,
  ServiceValidationError
};