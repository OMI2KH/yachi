const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const prisma = new PrismaClient();
const { verifyToken, authorizeRoles } = require('../utils/authHelpers');
const validate = require('../middleware/validate');
const { YachiGamification } = require('../services/yachiGamification');
const { YachiNotifications } = require('../services/yachiNotifications');
const { YachiPayments } = require('../services/yachiPayments');
const { YachiAnalytics } = require('../services/yachiAnalytics');
const { BookingEngine } = require('../services/bookingEngine');
const { AvailabilityService } = require('../services/availabilityService');
const redis = require('../config/redis');

const router = express.Router();

// 🎯 INPUT VALIDATION SCHEMAS
const BookingSchema = {
  create: z.object({
    serviceId: z.number().int().positive(),
    providerId: z.number().int().positive(),
    schedule: z.object({
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      duration: z.number().int().positive(), // in minutes
      timezone: z.string().default('UTC')
    }),
    location: z.object({
      type: z.enum(['remote', 'onsite', 'hybrid']),
      address: z.string().optional(),
      coordinates: z.object({
        latitude: z.number(),
        longitude: z.number()
      }).optional(),
      instructions: z.string().max(500).optional()
    }),
    serviceDetails: z.object({
      quantity: z.number().int().positive().default(1),
      customRequirements: z.string().max(1000).optional(),
      attachments: z.array(z.string().url()).optional(),
      urgency: z.enum(['standard', 'urgent', 'emergency']).default('standard')
    }),
    payment: z.object({
      method: z.enum(['telebirr', 'cbebirr', 'cash', 'card', 'wallet']),
      useYachiPoints: z.boolean().default(false),
      pointsToUse: z.number().int().min(0).default(0),
      savePaymentMethod: z.boolean().default(false)
    }),
    preferences: z.object({
      providerGender: z.enum(['any', 'male', 'female']).optional(),
      communicationMethod: z.enum(['chat', 'phone', 'video']).default('chat'),
      allowSubstitute: z.boolean().default(true),
      specialRequirements: z.string().max(500).optional()
    }).optional()
  }).refine(data => new Date(data.schedule.endTime) > new Date(data.schedule.startTime), {
    message: 'End time must be after start time',
    path: ['schedule.endTime']
  }),

  updateStatus: z.object({
    status: z.enum(['accepted', 'rejected', 'completed', 'cancelled', 'rescheduled']),
    reason: z.string().max(500).optional(),
    rescheduleTo: z.string().datetime().optional()
  }),

  review: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
    categories: z.array(z.string()).optional(),
    wouldRecommend: z.boolean().default(true),
    anonymous: z.boolean().default(false)
  })
};

// 🎯 CACHE KEYS
const CACHE_KEYS = {
  USER_BOOKINGS: (userId, type) => `bookings:${type}:${userId}`,
  PROVIDER_AVAILABILITY: (providerId) => `availability:provider:${providerId}`,
  BOOKING_DETAILS: (bookingId) => `booking:details:${bookingId}`,
  BOOKING_TIMELINE: (bookingId) => `booking:timeline:${bookingId}`
};

// 🚀 CREATE INTELLIGENT BOOKING
router.post('/', verifyToken, authorizeRoles(['client']), async (req, res) => {
  try {
    // 🛡️ Validate input
    const validatedData = BookingSchema.create.parse(req.body);

    // 🎯 Start transaction for atomic operations
    const transaction = await prisma.$transaction(async (prisma) => {
      // 🔍 Verify service and provider
      const service = await prisma.service.findUnique({
        where: { id: validatedData.serviceId },
        include: {
          provider: {
            include: {
              profile: true,
              availability: true
            }
          },
          category: true
        }
      });

      if (!service) {
        throw new Error('SERVICE_NOT_FOUND');
      }

      if (service.providerId !== validatedData.providerId) {
        throw new Error('PROVIDER_MISMATCH');
      }

      // 🎯 Check provider availability
      const isAvailable = await AvailabilityService.checkProviderAvailability(
        validatedData.providerId,
        validatedData.schedule.startTime,
        validatedData.schedule.endTime
      );

      if (!isAvailable.available) {
        throw new Error('PROVIDER_UNAVAILABLE');
      }

      // 💰 Calculate pricing with dynamic factors
      const pricing = await calculateBookingPricing({
        service,
        schedule: validatedData.schedule,
        location: validatedData.location,
        serviceDetails: validatedData.serviceDetails,
        customerId: req.user.userId
      });

      // 🎪 Check and apply Yachi points
      let pointsUsed = 0;
      let pointsDiscount = 0;

      if (validatedData.payment.useYachiPoints) {
        const pointsApplication = await YachiGamification.applyPointsToBooking(
          req.user.userId,
          validatedData.payment.pointsToUse,
          pricing.totalAmount
        );
        
        pointsUsed = pointsApplication.pointsUsed;
        pointsDiscount = pointsApplication.discountAmount;
      }

      // 🔐 Create booking with unique reference
      const bookingReference = generateBookingReference();
      
      const booking = await prisma.booking.create({
        data: {
          reference: bookingReference,
          serviceId: validatedData.serviceId,
          customerId: req.user.userId,
          providerId: validatedData.providerId,
          status: 'pending',
          paymentStatus: 'pending',
          
          // Schedule details
          scheduledStart: new Date(validatedData.schedule.startTime),
          scheduledEnd: new Date(validatedData.schedule.endTime),
          duration: validatedData.schedule.duration,
          timezone: validatedData.schedule.timezone,
          
          // Location details
          locationType: validatedData.location.type,
          locationAddress: validatedData.location.address,
          locationCoordinates: validatedData.location.coordinates,
          locationInstructions: validatedData.location.instructions,
          
          // Service details
          quantity: validatedData.serviceDetails.quantity,
          customRequirements: validatedData.serviceDetails.customRequirements,
          attachments: validatedData.serviceDetails.attachments,
          urgency: validatedData.serviceDetails.urgency,
          
          // Payment details
          paymentMethod: validatedData.payment.method,
          basePrice: pricing.basePrice,
          serviceFee: pricing.serviceFee,
          commission: pricing.commission,
          urgencyFee: pricing.urgencyFee,
          locationFee: pricing.locationFee,
          pointsUsed: pointsUsed,
          pointsDiscount: pointsDiscount,
          totalAmount: pricing.totalAmount - pointsDiscount,
          currency: pricing.currency,
          
          // Preferences
          preferences: validatedData.preferences,
          
          // Metadata
          metadata: {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            createdVia: 'web'
          }
        },
        include: {
          service: true,
          customer: {
            include: {
              profile: true
            }
          },
          provider: {
            include: {
              profile: true
            }
          }
        }
      });

      // 📱 Create booking timeline
      await prisma.bookingTimeline.create({
        data: {
          bookingId: booking.id,
          event: 'created',
          description: 'Booking request submitted',
          metadata: {
            source: 'customer',
            automated: false
          }
        }
      });

      // 🎪 Award booking creation points
      await YachiGamification.awardBookingCreation(req.user.userId, booking);

      return { booking, pricing, pointsUsed, pointsDiscount };
    });

    // 📧 Send notifications
    await YachiNotifications.sendBookingCreatedNotifications(transaction.booking);

    // 🔍 Clear relevant caches
    await clearBookingCaches(req.user.userId, transaction.booking.providerId);

    // 📊 Track booking analytics
    await YachiAnalytics.trackBookingEvent('created', transaction.booking);

    res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully',
      data: {
        booking: transaction.booking,
        financial: {
          totalAmount: transaction.booking.totalAmount,
          pointsUsed: transaction.pointsUsed,
          pointsDiscount: transaction.pointsDiscount,
          currency: transaction.booking.currency
        },
        nextSteps: ['awaiting_provider_confirmation', 'payment_processing']
      },
      gamification: {
        pointsEarned: 25,
        achievementProgress: await YachiGamification.getBookingAchievementProgress(req.user.userId)
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }

    console.error('Booking Creation Error:', error);

    const errorMap = {
      'SERVICE_NOT_FOUND': { message: 'Service not found', code: 'SERVICE_NOT_FOUND', status: 404 },
      'PROVIDER_MISMATCH': { message: 'Service provider mismatch', code: 'PROVIDER_MISMATCH', status: 400 },
      'PROVIDER_UNAVAILABLE': { message: 'Provider is not available at the requested time', code: 'PROVIDER_UNAVAILABLE', status: 409 },
      'INSUFFICIENT_POINTS': { message: 'Insufficient Yachi points', code: 'INSUFFICIENT_POINTS', status: 400 }
    };

    const errorConfig = errorMap[error.message] || { 
      message: 'Failed to create booking', 
      code: 'BOOKING_CREATION_FAILED', 
      status: 500 
    };

    res.status(errorConfig.status).json({
      success: false,
      message: errorConfig.message,
      code: errorConfig.code
    });
  }
});

// 🎯 GET CUSTOMER BOOKINGS WITH ADVANCED FILTERING
router.get('/customer', verifyToken, authorizeRoles(['client']), async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 10, 
      sortBy = 'created_desc',
      dateFrom,
      dateTo 
    } = req.query;

    const cacheKey = CACHE_KEYS.USER_BOOKINGS(req.user.userId, `customer_${status}_${page}_${limit}_${sortBy}`);
    const cachedBookings = await redis.get(cacheKey);

    if (cachedBookings) {
      return res.json({
        success: true,
        ...JSON.parse(cachedBookings),
        source: 'cache'
      });
    }

    // 🎯 Build where clause
    const where = { customerId: req.user.userId };
    
    if (status) {
      where.status = status;
    }
    
    if (dateFrom || dateTo) {
      where.scheduledStart = {};
      if (dateFrom) where.scheduledStart.gte = new Date(dateFrom);
      if (dateTo) where.scheduledStart.lte = new Date(dateTo);
    }

    // 🎯 Build order by
    const orderBy = buildBookingSortOrder(sortBy);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          service: {
            include: {
              category: true
            }
          },
          provider: {
            include: {
              profile: true
            }
          },
          timeline: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          },
          review: true
        },
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.booking.count({ where })
    ]);

    // 🎪 Enhance with gamification data
    const enhancedBookings = await YachiGamification.enhanceBookingsWithGamification(bookings);

    const result = {
      bookings: enhancedBookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: await getCustomerBookingSummary(req.user.userId)
    };

    // 💾 Cache for 2 minutes
    await redis.setex(cacheKey, 120, JSON.stringify(result));

    res.json({
      success: true,
      ...result,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Customer Bookings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      code: 'FETCH_BOOKINGS_FAILED'
    });
  }
});

// 🎯 GET PROVIDER BOOKINGS WITH INTELLIGENT FILTERING
router.get('/provider', verifyToken, authorizeRoles(['provider']), async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 10, 
      sortBy = 'schedule_asc',
      urgency 
    } = req.query;

    const cacheKey = CACHE_KEYS.USER_BOOKINGS(req.user.userId, `provider_${status}_${page}_${limit}_${sortBy}`);
    const cachedBookings = await redis.get(cacheKey);

    if (cachedBookings) {
      return res.json({
        success: true,
        ...JSON.parse(cachedBookings),
        source: 'cache'
      });
    }

    const where = { providerId: req.user.userId };
    if (status) where.status = status;
    if (urgency) where.urgency = urgency;

    const orderBy = buildBookingSortOrder(sortBy);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          service: true,
          customer: {
            include: {
              profile: true
            }
          },
          timeline: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.booking.count({ where })
    ]);

    const result = {
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: await getProviderBookingSummary(req.user.userId),
      availability: await AvailabilityService.getProviderAvailability(req.user.userId)
    };

    // 💾 Cache for 1 minute (provider bookings change frequently)
    await redis.setex(cacheKey, 60, JSON.stringify(result));

    res.json({
      success: true,
      ...result,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Provider Bookings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      code: 'FETCH_BOOKINGS_FAILED'
    });
  }
});

// 🎯 GET BOOKING DETAILS
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    
    const cacheKey = CACHE_KEYS.BOOKING_DETAILS(bookingId);
    const cachedBooking = await redis.get(cacheKey);

    if (cachedBooking) {
      return res.json({
        success: true,
        data: JSON.parse(cachedBooking),
        source: 'cache'
      });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          include: {
            category: true
          }
        },
        customer: {
          include: {
            profile: true
          }
        },
        provider: {
          include: {
            profile: true
          }
        },
        timeline: {
          orderBy: { createdAt: 'asc' }
        },
        review: true,
        payments: true
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // 🛡️ Check authorization
    if (booking.customerId !== req.user.userId && booking.providerId !== req.user.userId && !req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this booking',
        code: 'ACCESS_DENIED'
      });
    }

    // 💾 Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(booking));

    res.json({
      success: true,
      data: booking,
      source: 'database'
    });

  } catch (error) {
    console.error('Get Booking Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details',
      code: 'FETCH_BOOKING_FAILED'
    });
  }
});

// 🎯 UPDATE BOOKING STATUS WITH INTELLIGENT WORKFLOW
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const validatedData = BookingSchema.updateStatus.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        provider: true,
        service: true
      }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    // 🛡️ Authorization check
    const isAuthorized = await checkBookingAuthorization(booking, req.user, validatedData.status);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this booking',
        code: 'UPDATE_UNAUTHORIZED'
      });
    }

    // 🎯 Validate status transition
    const isValidTransition = await validateStatusTransition(booking.status, validatedData.status);
    if (!isValidTransition) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${booking.status} to ${validatedData.status}`,
        code: 'INVALID_STATUS_TRANSITION'
      });
    }

    // 💼 Start transaction
    const transaction = await prisma.$transaction(async (prisma) => {
      // 📝 Update booking status
      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: validatedData.status,
          ...(validatedData.status === 'completed' && { completedAt: new Date() }),
          ...(validatedData.status === 'cancelled' && { cancelledAt: new Date() })
        },
        include: {
          customer: true,
          provider: true,
          service: true
        }
      });

      // 📋 Add timeline event
      await prisma.bookingTimeline.create({
        data: {
          bookingId,
          event: validatedData.status,
          description: getStatusDescription(validatedData.status, validatedData.reason),
          metadata: {
            userId: req.user.userId,
            userRole: req.user.role,
            reason: validatedData.reason,
            automated: false
          }
        }
      });

      // 🎪 Handle gamification and payments based on status
      await handleBookingStatusChange(updatedBooking, validatedData.status, req.user);

      return updatedBooking;
    });

    // 📧 Send notifications
    await YachiNotifications.sendBookingStatusUpdateNotifications(transaction, validatedData.status);

    // 🗑️ Clear caches
    await clearBookingCaches(transaction.customerId, transaction.providerId, bookingId);

    res.json({
      success: true,
      message: `Booking ${validatedData.status} successfully`,
      data: transaction,
      gamification: await YachiGamification.getBookingStatusUpdateRewards(transaction, validatedData.status)
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Update Booking Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      code: 'UPDATE_STATUS_FAILED'
    });
  }
});

// 🎯 SUBMIT BOOKING REVIEW
router.post('/:id/review', verifyToken, authorizeRoles(['client']), async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const validatedData = BookingSchema.review.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });

    if (!booking || booking.customerId !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or access denied',
        code: 'BOOKING_NOT_FOUND'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed bookings',
        code: 'BOOKING_NOT_COMPLETED'
      });
    }

    if (booking.reviewed) {
      return res.status(400).json({
        success: false,
        message: 'Booking already reviewed',
        code: 'ALREADY_REVIEWED'
      });
    }

    const review = await prisma.$transaction(async (prisma) => {
      // 📝 Create review
      const newReview = await prisma.review.create({
        data: {
          bookingId,
          reviewerId: req.user.userId,
          revieweeId: booking.providerId,
          rating: validatedData.rating,
          comment: validatedData.comment,
          categories: validatedData.categories,
          wouldRecommend: validatedData.wouldRecommend,
          anonymous: validatedData.anonymous,
          metadata: {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        }
      });

      // 🏷️ Mark booking as reviewed
      await prisma.booking.update({
        where: { id: bookingId },
        data: { reviewed: true }
      });

      // 🎪 Award review points
      await YachiGamification.awardReviewSubmission(req.user.userId, booking, validatedData.rating);

      // 📈 Update provider rating
      await updateProviderRating(booking.providerId);

      return newReview;
    });

    res.json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
      gamification: {
        pointsAwarded: 50,
        achievement: 'First Review'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }

    console.error('Submit Review Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      code: 'REVIEW_SUBMISSION_FAILED'
    });
  }
});

// 🚀 UTILITY FUNCTIONS

// 💰 Calculate Booking Pricing
async function calculateBookingPricing({ service, schedule, location, serviceDetails, customerId }) {
  const basePrice = service.price * serviceDetails.quantity;
  
  // 🎯 Calculate dynamic fees
  const urgencyMultiplier = {
    'standard': 1,
    'urgent': 1.2,
    'emergency': 1.5
  }[serviceDetails.urgency];

  const locationFee = location.type === 'onsite' ? basePrice * 0.1 : 0;
  const urgencyFee = basePrice * (urgencyMultiplier - 1);
  
  // 🎪 Check for premium customer discount
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    include: { profile: true }
  });
  
  const customerDiscount = customer.premiumListing ? 0.05 : 0;
  
  // 💼 Calculate commission and service fee
  const commissionRate = customer.premiumListing ? 0.03 : 0.05;
  const commission = basePrice * commissionRate;
  const serviceFee = basePrice * 0.02; // Platform fee
  
  const subtotal = basePrice + locationFee + urgencyFee;
  const discountAmount = subtotal * customerDiscount;
  const totalAmount = subtotal - discountAmount + serviceFee;

  return {
    basePrice,
    locationFee,
    urgencyFee,
    commission,
    serviceFee,
    customerDiscount,
    discountAmount,
    totalAmount,
    currency: service.currency || 'USD'
  };
}

// 🎯 Build Booking Sort Order
function buildBookingSortOrder(sortBy) {
  const sortMap = {
    'created_desc': [{ createdAt: 'desc' }],
    'created_asc': [{ createdAt: 'asc' }],
    'schedule_asc': [{ scheduledStart: 'asc' }],
    'schedule_desc': [{ scheduledStart: 'desc' }],
    'price_asc': [{ totalAmount: 'asc' }],
    'price_desc': [{ totalAmount: 'desc' }],
    'urgency': [{ urgency: 'desc' }, { scheduledStart: 'asc' }]
  };

  return sortMap[sortBy] || sortMap['created_desc'];
}

// 🛡️ Check Booking Authorization
async function checkBookingAuthorization(booking, user, newStatus) {
  if (user.roles.includes('admin')) return true;

  switch (newStatus) {
    case 'accepted':
    case 'rejected':
    case 'completed':
      return booking.providerId === user.userId;
    case 'cancelled':
      return booking.customerId === user.userId || booking.providerId === user.userId;
    default:
      return false;
  }
}

// 🔄 Validate Status Transition
async function validateStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    'pending': ['accepted', 'rejected', 'cancelled'],
    'accepted': ['completed', 'cancelled', 'rescheduled'],
    'completed': [], // Final state
    'rejected': [], // Final state
    'cancelled': [], // Final state
    'rescheduled': ['accepted', 'cancelled']
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

// 🎯 Generate Booking Reference
function generateBookingReference() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `YCH-${timestamp}-${random}`;
}

// 🗑️ Clear Booking Caches
async function clearBookingCaches(customerId, providerId, bookingId = null) {
  const patterns = [
    CACHE_KEYS.USER_BOOKINGS(customerId, 'customer_*'),
    CACHE_KEYS.USER_BOOKINGS(providerId, 'provider_*'),
    ...(bookingId ? [
      CACHE_KEYS.BOOKING_DETAILS(bookingId),
      CACHE_KEYS.BOOKING_TIMELINE(bookingId)
    ] : [])
  ];

  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// 📊 Get Customer Booking Summary
async function getCustomerBookingSummary(customerId) {
  const summary = await prisma.booking.groupBy({
    by: ['status'],
    where: { customerId },
    _count: { id: true },
    _sum: { totalAmount: true }
  });

  return summary.reduce((acc, item) => {
    acc[item.status] = {
      count: item._count.id,
      totalAmount: item._sum.totalAmount || 0
    };
    return acc;
  }, {});
}

// 📊 Get Provider Booking Summary
async function getProviderBookingSummary(providerId) {
  const summary = await prisma.booking.groupBy({
    by: ['status'],
    where: { providerId },
    _count: { id: true },
    _sum: { totalAmount: true }
  });

  return summary.reduce((acc, item) => {
    acc[item.status] = {
      count: item._count.id,
      totalAmount: item._sum.totalAmount || 0
    };
    return acc;
  }, {});
}

// 🎪 Handle Booking Status Change
async function handleBookingStatusChange(booking, newStatus, user) {
  switch (newStatus) {
    case 'completed':
      // 💰 Process payments
      await YachiPayments.processBookingCompletion(booking);
      // 🎪 Award completion points
      await YachiGamification.awardBookingCompletion(booking.customerId, booking.providerId, booking);
      break;
      
    case 'cancelled':
      // 💰 Handle refunds
      await YachiPayments.processBookingCancellation(booking, user);
      break;
      
    case 'accepted':
      // 🎪 Award acceptance points
      await YachiGamification.awardBookingAcceptance(booking.providerId, booking);
      break;
  }
}

// 📈 Update Provider Rating
async function updateProviderRating(providerId) {
  const ratingStats = await prisma.review.aggregate({
    where: { revieweeId: providerId },
    _avg: { rating: true },
    _count: { id: true }
  });

  await prisma.userProfile.update({
    where: { userId: providerId },
    data: {
      rating: ratingStats._avg.rating || 0,
      reviewCount: ratingStats._count.id
    }
  });
}

// 📝 Get Status Description
function getStatusDescription(status, reason) {
  const descriptions = {
    'accepted': 'Booking accepted by provider',
    'rejected': `Booking rejected: ${reason || 'No reason provided'}`,
    'completed': 'Service completed successfully',
    'cancelled': `Booking cancelled: ${reason || 'No reason provided'}`,
    'rescheduled': 'Booking rescheduled to new time'
  };

  return descriptions[status] || `Booking status updated to ${status}`;
}

module.exports = router;
