// backend/services/constructionService.js

const { Sequelize, Op } = require('sequelize');
const { Service, User, Transaction, Review, Portfolio, WorkerVerification, Skill, Certification, Booking } = require('../models');
const { YachiAI } = require('./yachiAI');
const { YachiAnalytics } = require('./yachiAnalytics');
const { YachiNotifications } = require('./yachiNotifications');
const { YachiGamification } = require('./yachiGamification');
const { MediaService } = require('./mediaService');
const { VerificationService } = require('./verificationService');
const redis = require('../config/redis');

class ConstructionService {
    constructor() {
        this.serviceCategories = [
            'masonry', 'carpentry', 'electrical', 'plumbing', 'painting',
            'welding', 'roofing', 'flooring', 'tiling', 'plastering',
            'steel_fixing', 'formwork', 'scaffolding', 'excavation',
            'concrete_work', 'bricklaying', 'glass_work', 'aluminum_work',
            'landscaping', 'demolition', 'renovation', 'maintenance'
        ];

        this.skillLevels = {
            'apprentice': { minExperience: 0, maxExperience: 2 },
            'journeyman': { minExperience: 2, maxExperience: 5 },
            'foreman': { minExperience: 5, maxExperience: 10 },
            'master': { minExperience: 10, maxExperience: null }
        };

        this.safetyStandards = {
            required: ['safety_boots', 'helmet', 'gloves', 'hi-vis_vest'],
            recommended: ['goggles', 'ear_protection', 'face_mask', 'harness']
        };
    }

    // 🏗️ CREATE CONSTRUCTION SERVICE
    async createConstructionService(userId, serviceData, files = []) {
        try {
            // 🎯 Validate service category
            if (!this.serviceCategories.includes(serviceData.category)) {
                throw new Error('Invalid construction service category');
            }

            // 🎯 AI-Powered service validation
            const aiValidation = await YachiAI.validateConstructionService({
                title: serviceData.title,
                description: serviceData.description,
                category: serviceData.category,
                skills: serviceData.skills,
                experience: serviceData.experience
            });

            if (!aiValidation.valid) {
                throw new Error(`Service validation failed: ${aiValidation.reason}`);
            }

            // 🎯 Check worker qualifications
            const isQualified = await this.checkWorkerQualifications(userId, serviceData.category, serviceData.experience);
            if (!isQualified) {
                throw new Error('Worker does not meet minimum qualifications for this service');
            }

            // 💼 Start transaction
            const transaction = await Service.sequelize.transaction();

            try {
                // 🖼️ Process portfolio images if provided
                let portfolioImages = [];
                if (files && files.length > 0) {
                    portfolioImages = await Promise.all(
                        files.map(file => MediaService.processPortfolioImage(file, userId))
                    );
                }

                // 📝 Create service
                const service = await Service.create({
                    providerId: userId,
                    title: serviceData.title,
                    description: serviceData.description,
                    category: serviceData.category,
                    subcategory: serviceData.subcategory,
                    price: serviceData.price,
                    pricingModel: serviceData.pricingModel || 'hourly', // hourly, daily, project_based
                    currency: serviceData.currency || 'KES',
                    location: serviceData.location,
                    serviceRadius: serviceData.serviceRadius || 50, // km
                    skills: serviceData.skills || [],
                    experience: serviceData.experience,
                    tools: serviceData.tools || [],
                    materialsProvided: serviceData.materialsProvided || false,
                    warranty: serviceData.warranty || 0, // months
                    estimatedDuration: serviceData.estimatedDuration, // hours
                    status: 'active',
                    metadata: {
                        aiValidation,
                        portfolioImages: portfolioImages.map(img => img.url),
                        safetyCompliance: this.checkSafetyCompliance(serviceData.tools || []),
                        qualityMetrics: await this.calculateQualityMetrics(userId),
                        pricingTiers: this.generatePricingTiers(serviceData),
                        projectTypes: serviceData.projectTypes || ['residential', 'commercial', 'industrial']
                    }
                }, { transaction });

                // 🏗️ Create related portfolio entries
                if (portfolioImages.length > 0) {
                    await Portfolio.bulkCreate(
                        portfolioImages.map(img => ({
                            userId: userId,
                            title: `${serviceData.title} - Portfolio`,
                            description: serviceData.description,
                            category: serviceData.category,
                            imageUrl: img.url,
                            thumbnailUrl: img.thumbnailUrl,
                            serviceId: service.id,
                            tags: serviceData.skills,
                            isPublic: true
                        })),
                        { transaction }
                    );
                }

                // 📊 Update worker statistics
                await this.updateWorkerConstructionStats(userId, transaction);

                // 🎪 Award service creation points
                await YachiGamification.awardServiceCreation(userId, service.category);

                await transaction.commit();

                // 🗑️ Clear cache
                await this.clearServiceCache(service.id);

                return {
                    success: true,
                    service,
                    aiValidation,
                    qualifications: isQualified,
                    nextSteps: ['add_more_details', 'verify_certifications', 'setup_availability']
                };

            } catch (error) {
                await transaction.rollback();
                throw error;
            }

        } catch (error) {
            console.error('Create Construction Service Error:', error);
            throw new Error(`Failed to create construction service: ${error.message}`);
        }
    }

    // 🏆 CHECK WORKER QUALIFICATIONS
    async checkWorkerQualifications(userId, category, experience) {
        const [user, verifications, certifications, portfolio, reviews] = await Promise.all([
            User.findByPk(userId),
            WorkerVerification.findAll({
                where: {
                    userId: userId,
                    status: 'verified',
                    documentType: ['license', 'certificate', 'degree']
                }
            }),
            Certification.findAll({
                where: {
                    userId: userId,
                    status: 'verified',
                    category: category
                }
            }),
            Portfolio.count({
                where: {
                    userId: userId,
                    category: category
                }
            }),
            Review.findAll({
                where: {
                    revieweeId: userId,
                    category: category
                },
                attributes: ['rating']
            })
        ]);

        const qualifications = {
            basic: user.faydaVerified && user.selfieVerified,
            categorySpecific: certifications.length > 0,
            experience: this.validateExperienceLevel(experience, user.experienceYears),
            portfolio: portfolio >= 3, // At least 3 portfolio items
            reviews: this.calculateReviewScore(reviews),
            licenses: verifications.length > 0
        };

        const score = this.calculateQualificationScore(qualifications);
        const minimumScore = this.getMinimumScoreForCategory(category);

        return {
            qualified: score >= minimumScore,
            score,
            minimumScore,
            breakdown: qualifications,
            missingRequirements: this.getMissingRequirements(qualifications, category)
        };
    }

    // 🎯 VALIDATE EXPERIENCE LEVEL
    validateExperienceLevel(advertisedExperience, actualExperienceYears) {
        const level = this.skillLevels[advertisedExperience];
        if (!level) return false;

        if (level.maxExperience === null) {
            return actualExperienceYears >= level.minExperience;
        }

        return actualExperienceYears >= level.minExperience && actualExperienceYears < level.maxExperience;
    }

    // 📊 CALCULATE QUALIFICATION SCORE
    calculateQualificationScore(qualifications) {
        const weights = {
            basic: 0.2,          // Identity verification
            categorySpecific: 0.3, // Category-specific certs
            experience: 0.2,     // Experience match
            portfolio: 0.15,     // Portfolio items
            reviews: 0.1,        // Review score
            licenses: 0.05       // Professional licenses
        };

        let score = 0;
        Object.keys(weights).forEach(key => {
            if (qualifications[key]) {
                if (typeof qualifications[key] === 'boolean') {
                    score += weights[key];
                } else if (typeof qualifications[key] === 'number') {
                    score += weights[key] * (qualifications[key] / 100);
                }
            }
        });

        return Math.round(score * 100);
    }

    // 🛡️ CHECK SAFETY COMPLIANCE
    checkSafetyCompliance(tools) {
        const compliance = {
            required: {},
            recommended: {},
            missing: [],
            score: 100
        };

        // Check required safety equipment
        this.safetyStandards.required.forEach(item => {
            compliance.required[item] = tools.includes(item);
            if (!compliance.required[item]) {
                compliance.missing.push(item);
                compliance.score -= 15;
            }
        });

        // Check recommended safety equipment
        this.safetyStandards.recommended.forEach(item => {
            compliance.recommended[item] = tools.includes(item);
            if (!compliance.recommended[item]) {
                compliance.score -= 5;
            }
        });

        // Ensure score doesn't go below 0
        compliance.score = Math.max(0, compliance.score);

        return compliance;
    }

    // 📈 CALCULATE QUALITY METRICS
    async calculateQualityMetrics(userId) {
        const [completedJobs, reviews, portfolio] = await Promise.all([
            Transaction.count({
                where: {
                    providerId: userId,
                    status: 'completed'
                }
            }),
            Review.findAll({
                where: { revieweeId: userId },
                attributes: ['rating', 'category']
            }),
            Portfolio.findAll({
                where: { userId: userId },
                attributes: ['id', 'qualityScore']
            })
        ]);

        const averageRating = reviews.length > 0 ?
            reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length : 0;

        const portfolioQuality = portfolio.length > 0 ?
            portfolio.reduce((acc, item) => acc + (item.qualityScore || 0), 0) / portfolio.length : 0;

        const completionRate = completedJobs > 0 ?
            (completedJobs / (completedJobs + await Transaction.count({
                where: {
                    providerId: userId,
                    status: ['cancelled', 'failed']
                }
            }))) * 100 : 0;

        return {
            averageRating: Math.round(averageRating * 10) / 10,
            portfolioQuality: Math.round(portfolioQuality * 10) / 10,
            completionRate: Math.round(completionRate),
            totalProjects: completedJobs,
            clientSatisfaction: this.calculateClientSatisfaction(reviews),
            qualityScore: this.calculateOverallQualityScore(averageRating, portfolioQuality, completionRate)
        };
    }

    // 💰 GENERATE PRICING TIERS
    generatePricingTiers(serviceData) {
        const basePrice = serviceData.price;
        const tiers = {
            basic: {
                name: 'Basic',
                description: 'Standard service with basic materials',
                price: basePrice,
                features: [
                    'Standard quality materials',
                    'Basic finishing',
                    '3-month warranty',
                    'Normal working hours'
                ]
            },
            premium: {
                name: 'Premium',
                description: 'High-quality service with premium materials',
                price: basePrice * 1.5,
                features: [
                    'Premium quality materials',
                    'Fine finishing',
                    '6-month warranty',
                    'Flexible working hours',
                    'Free consultation',
                    'Progress reports'
                ]
            },
            deluxe: {
                name: 'Deluxe',
                description: 'VIP service with full package',
                price: basePrice * 2,
                features: [
                    'Luxury quality materials',
                    'Expert finishing',
                    '12-month warranty',
                    '24/7 support',
                    'Project management',
                    'Quality assurance',
                    'Post-service cleanup'
                ]
            }
        };

        return tiers;
    }

    // 🔍 SEARCH CONSTRUCTION SERVICES
    async searchServices(searchParams) {
        try {
            const {
                query,
                category,
                subcategory,
                minPrice,
                maxPrice,
                location,
                radius = 50,
                skills = [],
                experience,
                availability,
                verifiedOnly = true,
                sortBy = 'rating',
                page = 1,
                limit = 20
            } = searchParams;

            const where = {
                status: 'active',
                category: 'construction'
            };

            // 🔍 Text search
            if (query) {
                where[Op.or] = [
                    { title: { [Op.iLike]: `%${query}%` } },
                    { description: { [Op.iLike]: `%${query}%` } },
                    { skills: { [Op.contains]: [query] } }
                ];
            }

            // 🏗️ Category filter
            if (category) {
                where.category = category;
            }

            // 🏷️ Subcategory filter
            if (subcategory) {
                where.subcategory = subcategory;
            }

            // 💰 Price range filter
            if (minPrice || maxPrice) {
                where.price = {};
                if (minPrice) where.price[Op.gte] = minPrice;
                if (maxPrice) where.price[Op.lte] = maxPrice;
            }

            // 🔧 Skills filter
            if (skills.length > 0) {
                where.skills = { [Op.overlap]: skills };
            }

            // 🎯 Experience filter
            if (experience) {
                where.experience = experience;
            }

            // 📍 Location filter (using PostGIS for real distance calculation)
            if (location && location.latitude && location.longitude) {
                where[Op.and] = [
                    Sequelize.where(
                        Sequelize.fn(
                            'ST_DWithin',
                            Sequelize.col('location'),
                            Sequelize.fn('ST_SetSRID', Sequelize.fn('ST_MakePoint', location.longitude, location.latitude), 4326),
                            radius * 1000 // Convert km to meters
                        ),
                        true
                    )
                ];
            }

            // Build include conditions for providers
            const providerWhere = {};
            if (verifiedOnly) {
                providerWhere[Op.and] = [
                    { faydaVerified: true },
                    { selfieVerified: true },
                    { documentVerified: true }
                ];
            }

            const [services, total] = await Promise.all([
                Service.findAll({
                    where,
                    include: [
                        {
                            model: User,
                            as: 'provider',
                            where: providerWhere,
                            attributes: [
                                'id', 'name', 'avatar', 'rating', 'level',
                                'faydaVerified', 'selfieVerified', 'documentVerified',
                                'premiumListing', 'joinedAt'
                            ]
                        },
                        {
                            model: Review,
                            as: 'reviews',
                            attributes: ['rating', 'comment'],
                            limit: 3
                        },
                        {
                            model: Portfolio,
                            as: 'portfolio',
                            attributes: ['imageUrl', 'thumbnailUrl'],
                            limit: 3
                        }
                    ],
                    attributes: {
                        include: [
                            [
                                Sequelize.literal(`
                                    (SELECT COUNT(*) FROM "Bookings" 
                                    WHERE "Bookings"."serviceId" = "Service"."id" 
                                    AND "Bookings"."status" = 'completed')
                                `),
                                'completedBookings'
                            ],
                            [
                                Sequelize.literal(`
                                    (SELECT AVG(rating) FROM "Reviews" 
                                    WHERE "Reviews"."serviceId" = "Service"."id")
                                `),
                                'averageRating'
                            ]
                        ]
                    },
                    order: this.buildServiceSortOrder(sortBy),
                    limit,
                    offset: (page - 1) * limit
                }),
                Service.count({ where })
            ]);

            // 📊 Enhance services with additional metrics
            const enhancedServices = await Promise.all(
                services.map(async service => {
                    const provider = service.provider;
                    const stats = await this.calculateWorkerConstructionStats(provider.id);
                    
                    return {
                        ...service.toJSON(),
                        provider: {
                            ...provider.toJSON(),
                            stats
                        },
                        metrics: {
                            popularity: await this.calculateServicePopularity(service.id),
                            reliability: await this.calculateServiceReliability(service.id),
                            valueScore: await this.calculateValueScore(service)
                        }
                    };
                })
            );

            // 🎯 AI-Powered recommendations
            const recommendations = searchParams.userId ?
                await YachiAI.getConstructionServiceRecommendations(searchParams.userId, enhancedServices) : [];

            return {
                services: enhancedServices,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                },
                filters: {
                    applied: searchParams,
                    availableCategories: this.serviceCategories,
                    skillLevels: Object.keys(this.skillLevels)
                },
                recommendations,
                searchSummary: {
                    totalFound: total,
                    averagePrice: enhancedServices.length > 0 ?
                        enhancedServices.reduce((acc, s) => acc + s.price, 0) / enhancedServices.length : 0,
                    topSkills: this.extractTopSkills(enhancedServices)
                }
            };

        } catch (error) {
            console.error('Search Services Error:', error);
            throw new Error(`Failed to search construction services: ${error.message}`);
        }
    }

    // 📊 BUILD SERVICE SORT ORDER
    buildServiceSortOrder(sortBy) {
        const sortMap = {
            'rating': [['rating', 'DESC']],
            'price_low': [['price', 'ASC']],
            'price_high': [['price', 'DESC']],
            'popularity': [
                [Sequelize.literal('"completedBookings"'), 'DESC']
            ],
            'recent': [['createdAt', 'DESC']],
            'recommended': [
                [Sequelize.literal('"provider"."premiumListing"'), 'DESC'],
                ['rating', 'DESC'],
                [Sequelize.literal('"completedBookings"'), 'DESC']
            ]
        };

        return sortMap[sortBy] || sortMap.recommended;
    }

    // 📈 CALCULATE SERVICE POPULARITY
    async calculateServicePopularity(serviceId) {
        const [bookings, views, saves] = await Promise.all([
            Booking.count({ where: { serviceId } }),
            redis.get(`service:views:${serviceId}`).then(views => parseInt(views) || 0),
            redis.get(`service:saves:${serviceId}`).then(saves => parseInt(saves) || 0)
        ]);

        return {
            score: (bookings * 3) + (views * 0.1) + (saves * 2),
            bookings,
            views,
            saves
        };
    }

    // ⚡ CALCULATE SERVICE RELIABILITY
    async calculateServiceReliability(serviceId) {
        const [completedJobs, cancelledJobs, onTimeJobs] = await Promise.all([
            Transaction.count({
                where: {
                    serviceId,
                    status: 'completed'
                }
            }),
            Transaction.count({
                where: {
                    serviceId,
                    status: 'cancelled'
                }
            }),
            Transaction.count({
                where: {
                    serviceId,
                    status: 'completed',
                    completionTime: { [Op.lte]: Sequelize.col('estimatedDuration') }
                }
            })
        ]);

        const totalJobs = completedJobs + cancelledJobs;
        const reliability = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 100;
        const punctuality = completedJobs > 0 ? (onTimeJobs / completedJobs) * 100 : 100;

        return {
            reliability: Math.round(reliability),
            punctuality: Math.round(punctuality),
            completedJobs,
            cancelledJobs,
            onTimeJobs
        };
    }

    // 💎 CALCULATE VALUE SCORE
    async calculateValueScore(service) {
        const providerStats = await this.calculateWorkerConstructionStats(service.providerId);
        const popularity = await this.calculateServicePopularity(service.id);
        const reliability = await this.calculateServiceReliability(service.id);

        const weights = {
            price: 0.25,
            quality: 0.30,
            reliability: 0.25,
            popularity: 0.20
        };

        // Normalize price score (lower price = higher score)
        const priceScore = 100 - Math.min((service.price / 10000) * 100, 100);
        
        // Quality score from provider stats and reviews
        const qualityScore = (providerStats.qualityScore + (service.rating || 0) * 20) / 2;
        
        // Calculate final value score
        const valueScore = (
            (priceScore * weights.price) +
            (qualityScore * weights.quality) +
            (reliability.reliability * weights.reliability) +
            (Math.min(popularity.score / 10, 100) * weights.popularity)
        );

        return Math.round(valueScore);
    }

    // 🎯 GET SERVICE RECOMMENDATIONS
    async getServiceRecommendations(userId, limit = 10) {
        try {
            const [user, bookingHistory, searchHistory] = await Promise.all([
                User.findByPk(userId),
                Booking.findAll({
                    where: { clientId: userId, status: 'completed' },
                    include: [{ model: Service, attributes: ['category', 'skills'] }],
                    limit: 20
                }),
                redis.get(`user:${userId}:search_history`).then(history => JSON.parse(history) || [])
            ]);

            // 🎯 AI-Powered recommendation engine
            const recommendations = await YachiAI.generateConstructionRecommendations({
                userId,
                userProfile: user,
                bookingHistory,
                searchHistory,
                preferences: user.preferences || {}
            });

            // 🔍 Get recommended services
            const recommendedServices = await this.searchServices({
                category: recommendations.categories[0],
                skills: recommendations.skills.slice(0, 3),
                location: user.location,
                radius: 25,
                limit,
                sortBy: 'recommended'
            });

            return {
                recommendations: recommendedServices.services,
                reasoning: recommendations.reasoning,
                confidence: recommendations.confidence,
                personalized: recommendations.personalized,
                nextBestActions: recommendations.nextBestActions
            };

        } catch (error) {
            console.error('Get Recommendations Error:', error);
            throw new Error(`Failed to get service recommendations: ${error.message}`);
        }
    }

    // 📊 UPDATE WORKER CONSTRUCTION STATS
    async updateWorkerConstructionStats(userId, transaction = null) {
        const stats = await this.calculateWorkerConstructionStats(userId);
        
        await User.update({
            constructionStats: stats,
            lastStatsUpdate: new Date()
        }, {
            where: { id: userId },
            transaction
        });

        // 🗑️ Clear cache
        await redis.del(`worker:${userId}:stats`);

        return stats;
    }

    // 📈 CALCULATE WORKER CONSTRUCTION STATS
    async calculateWorkerConstructionStats(userId) {
        const cacheKey = `worker:${userId}:construction:stats`;
        const cachedStats = await redis.get(cacheKey);
        
        if (cachedStats) {
            return JSON.parse(cachedStats);
        }

        const [
            services,
            transactions,
            reviews,
            portfolio,
            certifications
        ] = await Promise.all([
            Service.findAll({
                where: { providerId: userId, category: 'construction' },
                attributes: ['id', 'category', 'rating', 'price']
            }),
            Transaction.findAll({
                where: { providerId: userId },
                attributes: ['status', 'amount', 'completedAt', 'createdAt']
            }),
            Review.findAll({
                where: { revieweeId: userId },
                attributes: ['rating', 'comment', 'category', 'createdAt']
            }),
            Portfolio.findAll({
                where: { userId: userId },
                attributes: ['id', 'category', 'qualityScore']
            }),
            Certification.findAll({
                where: { userId: userId, status: 'verified' },
                attributes: ['name', 'category', 'issuedAt']
            })
        ]);

        const completedTransactions = transactions.filter(t => t.status === 'completed');
        const revenue = completedTransactions.reduce((acc, t) => acc + t.amount, 0);
        
        const averageRating = reviews.length > 0 ?
            reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

        const stats = {
            totalServices: services.length,
            completedProjects: completedTransactions.length,
            totalRevenue: revenue,
            averageRating: Math.round(averageRating * 10) / 10,
            categories: [...new Set(services.map(s => s.category))],
            topSkills: this.extractTopSkills(services),
            certifications: certifications.length,
            portfolioItems: portfolio.length,
            successRate: this.calculateSuccessRate(transactions),
            clientSatisfaction: this.calculateClientSatisfaction(reviews),
            averageProjectValue: completedTransactions.length > 0 ?
                revenue / completedTransactions.length : 0,
            qualityScore: this.calculateOverallQualityScore(
                averageRating,
                portfolio.length > 0 ? portfolio.reduce((acc, p) => acc + (p.qualityScore || 0), 0) / portfolio.length : 0,
                this.calculateSuccessRate(transactions)
            )
        };

        // 💾 Cache for 5 minutes
        await redis.setex(cacheKey, 300, JSON.stringify(stats));

        return stats;
    }

    // 🏆 CALCULATE SUCCESS RATE
    calculateSuccessRate(transactions) {
        const completed = transactions.filter(t => t.status === 'completed').length;
        const total = transactions.length;
        return total > 0 ? Math.round((completed / total) * 100) : 100;
    }

    // 😊 CALCULATE CLIENT SATISFACTION
    calculateClientSatisfaction(reviews) {
        if (reviews.length === 0) return 100;

        const positiveReviews = reviews.filter(r => r.rating >= 4).length;
        const negativeReviews = reviews.filter(r => r.rating <= 2).length;
        
        return Math.round((positiveReviews / reviews.length) * 100);
    }

    // 🎯 CALCULATE OVERALL QUALITY SCORE
    calculateOverallQualityScore(rating, portfolioQuality, successRate) {
        const weights = {
            rating: 0.4,
            portfolio: 0.3,
            successRate: 0.3
        };

        const score = (
            (rating * 20 * weights.rating) +
            (portfolioQuality * weights.portfolio) +
            (successRate * weights.successRate)
        );

        return Math.round(score);
    }

    // 🔧 EXTRACT TOP SKILLS
    extractTopSkills(services) {
        const skillCounts = {};
        services.forEach(service => {
            if (service.skills && Array.isArray(service.skills)) {
                service.skills.forEach(skill => {
                    skillCounts[skill] = (skillCounts[skill] || 0) + 1;
                });
            }
        });

        return Object.entries(skillCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([skill, count]) => ({ skill, count }));
    }

    // 🎯 GET MINIMUM SCORE FOR CATEGORY
    getMinimumScoreForCategory(category) {
        const scores = {
            'electrical': 85,
            'plumbing': 80,
            'welding': 80,
            'roofing': 75,
            'steel_fixing': 75,
            'excavation': 70,
            'default': 60
        };

        return scores[category] || scores.default;
    }

    // 📋 GET MISSING REQUIREMENTS
    getMissingRequirements(qualifications, category) {
        const missing = [];
        
        if (!qualifications.basic) {
            missing.push('Complete identity verification (Fayda + Selfie)');
        }
        
        if (!qualifications.categorySpecific) {
            missing.push(`Obtain ${category} certification`);
        }
        
        if (!qualifications.portfolio) {
            missing.push('Add at least 3 portfolio items');
        }
        
        if (!qualifications.licenses) {
            missing.push('Upload professional licenses');
        }

        return missing;
    }

    // 🗑️ CLEAR SERVICE CACHE
    async clearServiceCache(serviceId) {
        const cacheKeys = [
            `service:${serviceId}:details`,
            `service:${serviceId}:popularity`,
            `service:${serviceId}:reliability`
        ];
        
        await Promise.all(cacheKeys.map(key => redis.del(key)));
    }

    // 📱 GET SERVICE DETAILS
    async getServiceDetails(serviceId, userId = null) {
        const cacheKey = `service:${serviceId}:details:${userId || 'public'}`;
        const cachedDetails = await redis.get(cacheKey);
        
        if (cachedDetails) {
            return JSON.parse(cachedDetails);
        }

        const service = await Service.findByPk(serviceId, {
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: [
                        'id', 'name', 'avatar', 'rating', 'level',
                        'faydaVerified', 'selfieVerified', 'documentVerified',
                        'premiumListing', 'joinedAt', 'constructionStats'
                    ]
                },
                {
                    model: Review,
                    as: 'reviews',
                    include: [{
                        model: User,
                        as: 'reviewer',
                        attributes: ['id', 'name', 'avatar']
                    }],
                    limit: 10,
                    order: [['createdAt', 'DESC']]
                },
                {
                    model: Portfolio,
                    as: 'portfolio',
                    attributes: ['id', 'imageUrl', 'thumbnailUrl', 'title', 'description'],
                    limit: 20
                },
                {
                    model: Booking,
                    as: 'bookings',
                    attributes: ['id', 'status', 'createdAt'],
                    limit: 5
                }
            ],
            attributes: {
                include: [
                    [
                        Sequelize.literal(`
                            (SELECT COUNT(*) FROM "Bookings" 
                            WHERE "Bookings"."serviceId" = "Service"."id")
                        `),
                        'totalBookings'
                    ],
                    [
                        Sequelize.literal(`
                            (SELECT AVG(rating) FROM "Reviews" 
                            WHERE "Reviews"."serviceId" = "Service"."id")
                        `),
                        'averageRating'
                    ]
                ]
            }
        });

        if (!service) {
            throw new Error('Service not found');
        }

        // 📊 Calculate additional metrics
        const [popularity, reliability, valueScore, similarServices] = await Promise.all([
            this.calculateServicePopularity(serviceId),
            this.calculateServiceReliability(serviceId),
            this.calculateValueScore(service),
            this.getSimilarServices(serviceId, 5)
        ]);

        const providerStats = await this.calculateWorkerConstructionStats(service.providerId);

        const serviceDetails = {
            service: service.toJSON(),
            metrics: {
                popularity,
                reliability,
                valueScore,
                qualityScore: providerStats.qualityScore
            },
            provider: {
                ...service.provider.toJSON(),
                stats: providerStats
            },
            recommendations: {
                similarServices,
                frequentlyBookedTogether: await this.getFrequentlyBookedTogether(serviceId),
                upgrades: this.getServiceUpgrades(service)
            },
            safety: this.checkSafetyCompliance(service.metadata?.tools || []),
            pricing: service.metadata?.pricingTiers || this.generatePricingTiers(service)
        };

        // 🎯 Add personalized data if userId provided
        if (userId) {
            const [hasBooked, isSaved] = await Promise.all([
                Booking.findOne({
                    where: { serviceId, clientId: userId, status: 'completed' }
                }),
                redis.sismember(`user:${userId}:saved_services`, serviceId)
            ]);

            serviceDetails.personalized = {
                hasBooked: !!hasBooked,
                isSaved: !!isSaved,
                canReview: !!hasBooked && !await Review.findOne({
                    where: { serviceId, reviewerId: userId }
                })
            };
        }

        // 💾 Cache for 10 minutes
        await redis.setex(cacheKey, 600, JSON.stringify(serviceDetails));

        return serviceDetails;
    }

    // 🔍 GET SIMILAR SERVICES
    async getSimilarServices(serviceId, limit = 5) {
        const service = await Service.findByPk(serviceId, {
            attributes: ['category', 'skills', 'price', 'location']
        });

        if (!service) return [];

        return this.searchServices({
            category: service.category,
            skills: service.skills.slice(0, 3),
            limit,
            sortBy: 'recommended'
        });
    }

    // 🔗 GET FREQUENTLY BOOKED TOGETHER
    async getFrequentlyBookedTogether(serviceId) {
        const frequentCombinations = await Booking.findAll({
            attributes: [
                'clientId',
                [Sequelize.fn('ARRAY_AGG', Sequelize.col('serviceId')), 'serviceIds']
            ],
            where: {
                clientId: {
                    [Op.in]: Sequelize.literal(`
                        (SELECT "clientId" FROM "Bookings" 
                        WHERE "serviceId" = ${serviceId})
                    `)
                }
            },
            group: ['clientId'],
            having: Sequelize.literal(`COUNT(*) > 1`),
            limit: 10
        });

        const serviceCounts = {};
        frequentCombinations.forEach(combo => {
            const ids = combo.get('serviceIds');
            ids.forEach(id => {
                if (id !== serviceId) {
                    serviceCounts[id] = (serviceCounts[id] || 0) + 1;
                }
            });
        });

        const topServices = Object.entries(serviceCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id, count]) => ({ serviceId: parseInt(id), frequency: count }));

        return await Promise.all(
            topServices.map(async ({ serviceId, frequency }) => {
                const service = await Service.findByPk(serviceId, {
                    attributes: ['id', 'title', 'price', 'category'],
                    include: [{
                        model: User,
                        as: 'provider',
                        attributes: ['name', 'avatar']
                    }]
                });
                return {
                    ...service?.toJSON(),
                    frequency,
                    matchScore: Math.round((frequency / frequentCombinations.length) * 100)
                };
            })
        );
    }

    // ⬆️ GET SERVICE UPGRADES
    getServiceUpgrades(service) {
        const upgrades = [];

        if (!service.metadata?.materialsProvided) {
            upgrades.push({
                type: 'materials',
                title: 'Add Materials Package',
                description: 'We provide all necessary materials',
                price: service.price * 0.3,
                benefits: ['Save time', 'Guaranteed quality', 'Bulk pricing']
            });
        }

        if (!service.metadata?.warranty || service.metadata.warranty < 6) {
            upgrades.push({
                type: 'warranty',
                title: 'Extended Warranty',
                description: 'Extend warranty to 12 months',
                price: service.price * 0.1,
                benefits: ['Peace of mind', 'Free repairs', 'Priority support']
            });
        }

        if (!service.metadata?.emergencyService) {
            upgrades.push({
                type: 'emergency',
                title: 'Emergency Service',
                description: '24/7 emergency response',
                price: service.price * 0.2,
                benefits: ['Same-day service', 'Priority scheduling', 'Emergency support']
            });
        }

        return upgrades;
    }

    // 📊 GET CATEGORY INSIGHTS
    async getCategoryInsights(category) {
        const cacheKey = `insights:construction:${category}`;
        const cachedInsights = await redis.get(cacheKey);
        
        if (cachedInsights) {
            return JSON.parse(cachedInsights);
        }

        const [services, bookings, reviews] = await Promise.all([
            Service.findAll({
                where: { category, status: 'active' },
                attributes: ['price', 'rating', 'experience']
            }),
            Booking.count({
                include: [{
                    model: Service,
                    where: { category }
                }]
            }),
            Review.findAll({
                include: [{
                    model: Service,
                    where: { category }
                }],
                attributes: ['rating', 'createdAt']
            })
        ]);

        const averagePrice = services.length > 0 ?
            services.reduce((acc, s) => acc + s.price, 0) / services.length : 0;

        const averageRating = reviews.length > 0 ?
            reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0;

        const experienceDistribution = services.reduce((acc, s) => {
            acc[s.experience] = (acc[s.experience] || 0) + 1;
            return acc;
        }, {});

        const monthlyTrend = this.calculateMonthlyTrend(reviews);

        const insights = {
            market: {
                totalServices: services.length,
                totalBookings: bookings,
                averagePrice,
                averageRating
            },
            demand: {
                bookingTrend: monthlyTrend,
                peakSeasons: this.identifyPeakSeasons(bookings),
                popularSkills: this.extractTopSkills(services)
            },
            competition: {
                experienceDistribution,
                priceRange: {
                    min: Math.min(...services.map(s => s.price)),
                    max: Math.max(...services.map(s => s.price)),
                    median: this.calculateMedian(services.map(s => s.price))
                },
                qualityMetrics: {
                    averageResponseTime: await this.calculateAverageResponseTime(category),
                    completionRate: await this.calculateCategoryCompletionRate(category)
                }
            },
            opportunities: {
                underservicedAreas: await this.identifyUnderservicedAreas(category),
                premiumOpportunities: this.identifyPremiumOpportunities(services),
                emergingSkills: await this.identifyEmergingSkills(category)
            }
        };

        // 💾 Cache for 1 hour
        await redis.setex(cacheKey, 3600, JSON.stringify(insights));

        return insights;
    }

    // 📈 CALCULATE MONTHLY TREND
    calculateMonthlyTrend(reviews) {
        const monthlyData = {};
        reviews.forEach(review => {
            const month = review.createdAt.toISOString().slice(0, 7); // YYYY-MM
            monthlyData[month] = (monthlyData[month] || 0) + 1;
        });

        return Object.entries(monthlyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12) // Last 12 months
            .map(([month, count]) => ({ month, count }));
    }

    // 🏆 CALCULATE MEDIAN
    calculateMedian(numbers) {
        if (numbers.length === 0) return 0;
        
        const sorted = [...numbers].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
        
        return sorted[middle];
    }

    // ⚡ CALCULATE AVERAGE RESPONSE TIME
    async calculateAverageResponseTime(category) {
        const responseTimes = await Booking.findAll({
            include: [{
                model: Service,
                where: { category }
            }],
            attributes: [
                [Sequelize.fn('AVG', Sequelize.literal('EXTRACT(EPOCH FROM ("acceptedAt" - "createdAt")) / 3600')), 'avgResponseHours']
            ],
            where: {
                acceptedAt: { [Op.ne]: null }
            }
        });

        return Math.round(responseTimes[0]?.get('avgResponseHours') * 10) / 10 || 24;
    }

    // ✅ CALCULATE CATEGORY COMPLETION RATE
    async calculateCategoryCompletionRate(category) {
        const [completed, total] = await Promise.all([
            Booking.count({
                include: [{
                    model: Service,
                    where: { category }
                }],
                where: { status: 'completed' }
            }),
            Booking.count({
                include: [{
                    model: Service,
                    where: { category }
                }]
            })
        ]);

        return total > 0 ? Math.round((completed / total) * 100) : 100;
    }

    // 🗺️ IDENTIFY UNDERSERVICED AREAS
    async identifyUnderservicedAreas(category) {
        const serviceLocations = await Service.findAll({
            where: { category, status: 'active' },
            attributes: ['location']
        });

        // This would typically use geospatial analysis
        // For now, return mock data
        return [
            {
                area: 'Westlands',
                demand: 85,
                supply: 15,
                opportunityScore: 90
            },
            {
                area: 'Kitengela',
                demand: 70,
                supply: 30,
                opportunityScore: 80
            },
            {
                area: 'Ruiru',
                demand: 65,
                supply: 25,
                opportunityScore: 75
            }
        ];
    }

    // 💎 IDENTIFY PREMIUM OPPORTUNITIES
    identifyPremiumOpportunities(services) {
        const premiumServices = services.filter(s => s.price > 10000 && s.rating >= 4.5);
        
        return {
            count: premiumServices.length,
            averagePrice: premiumServices.length > 0 ?
                premiumServices.reduce((acc, s) => acc + s.price, 0) / premiumServices.length : 0,
            marketShare: services.length > 0 ?
                (premiumServices.length / services.length) * 100 : 0,
            topCategories: [...new Set(premiumServices.map(s => s.category))]
        };
    }

    // 🚀 IDENTIFY EMERGING SKILLS
    async identifyEmergingSkills(category) {
        // Analyze recent bookings and searches
        const recentServices = await Service.findAll({
            where: {
                category,
                createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
            },
            attributes: ['skills']
        });

        const allSkills = recentServices.flatMap(s => s.skills || []);
        const skillCounts = allSkills.reduce((acc, skill) => {
            acc[skill] = (acc[skill] || 0) + 1;
            return acc;
        }, {});

        // Identify skills with growing demand
        return Object.entries(skillCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([skill, count]) => ({
                skill,
                demand: count,
                growth: Math.round((count / recentServices.length) * 100),
                opportunity: 'high'
            }));
    }

    // 🏆 IDENTIFY PEAK SEASONS
    identifyPeakSeasons(bookings) {
        // Analyze booking patterns by month
        // This would typically use historical data analysis
        return [
            {
                season: 'Jan-Mar',
                bookings: Math.round(bookings * 0.35),
                reason: 'Post-holiday renovations'
            },
            {
                season: 'Jun-Aug',
                bookings: Math.round(bookings * 0.40),
                reason: 'Dry season construction'
            },
            {
                season: 'Oct-Dec',
                bookings: Math.round(bookings * 0.25),
                reason: 'Year-end projects'
            }
        ];
    }

    // 📋 VALIDATE CONSTRUCTION PROJECT
    async validateConstructionProject(projectData) {
        const validation = {
            valid: true,
            issues: [],
            warnings: [],
            recommendations: []
        };

        // 🏗️ Check project scope
        if (projectData.estimatedDuration > 720) { // 30 days
            validation.warnings.push('Project duration exceeds typical construction project limits');
        }

        // 💰 Check budget feasibility
        if (projectData.budget && projectData.scope) {
            const estimatedCost = await this.estimateProjectCost(projectData.scope, projectData.location);
            if (projectData.budget < estimatedCost * 0.8) {
                validation.issues.push(`Budget may be insufficient. Estimated cost: ${estimatedCost}`);
            }
        }

        // 📍 Check location constraints
        if (projectData.location) {
            const locationConstraints = await this.checkLocationConstraints(projectData.location, projectData.scope);
            if (locationConstraints.length > 0) {
                validation.warnings.push(...locationConstraints);
            }
        }

        // 🔧 Check skill requirements
        const requiredSkills = await this.identifyRequiredSkills(projectData.scope);
        if (requiredSkills.length > 0) {
            validation.recommendations.push(`Required skills: ${requiredSkills.join(', ')}`);
        }

        // 🛡️ Check safety requirements
        const safetyRequirements = this.identifySafetyRequirements(projectData.scope);
        if (safetyRequirements.length > 0) {
            validation.recommendations.push(`Safety equipment needed: ${safetyRequirements.join(', ')}`);
        }

        validation.valid = validation.issues.length === 0;

        return validation;
    }

    // 💰 ESTIMATE PROJECT COST
    async estimateProjectCost(scope, location) {
        // This would use AI and historical data for accurate estimation
        const baseCost = 10000; // Base cost per unit
        const locationMultiplier = location ? await this.getLocationMultiplier(location) : 1;
        const scopeMultiplier = this.calculateScopeMultiplier(scope);
        const complexityMultiplier = this.calculateComplexityMultiplier(scope);

        return Math.round(baseCost * locationMultiplier * scopeMultiplier * complexityMultiplier);
    }

    // 📍 GET LOCATION MULTIPLIER
    async getLocationMultiplier(location) {
        // Location-based pricing adjustments
        const multipliers = {
            'nairobi': 1.2,
            'mombasa': 1.1,
            'kisumu': 1.0,
            'nakuru': 0.9,
            'eldoret': 0.8,
            'default': 1.0
        };

        // This would typically use geocoding
        return multipliers[location.city?.toLowerCase()] || multipliers.default;
    }

    // 📏 CALCULATE SCOPE MULTIPLIER
    calculateScopeMultiplier(scope) {
        if (!scope || !scope.area) return 1;
        
        // Area in square meters
        if (scope.area < 50) return 0.8;
        if (scope.area < 100) return 1.0;
        if (scope.area < 200) return 1.2;
        if (scope.area < 500) return 1.5;
        return 2.0;
    }

    // 🎯 CALCULATE COMPLEXITY MULTIPLIER
    calculateComplexityMultiplier(scope) {
        let multiplier = 1.0;
        
        if (scope.complexity === 'simple') multiplier *= 0.8;
        if (scope.complexity === 'complex') multiplier *= 1.5;
        if (scope.complexity === 'very_complex') multiplier *= 2.0;
        
        if (scope.materials === 'premium') multiplier *= 1.3;
        if (scope.finishing === 'high_end') multiplier *= 1.4;
        
        return multiplier;
    }

    // 🗺️ CHECK LOCATION CONSTRAINTS
    async checkLocationConstraints(location, scope) {
        const constraints = [];
        
        // Check urban vs rural
        if (location.type === 'urban' && scope.area > 1000) {
            constraints.push('Large projects may face space constraints in urban areas');
        }
        
        // Check access restrictions
        if (location.access === 'restricted') {
            constraints.push('Restricted access may require special permissions');
        }
        
        // Check environmental restrictions
        if (location.environmental === 'protected') {
            constraints.push('Protected area may have environmental restrictions');
        }
        
        return constraints;
    }

    // 🔧 IDENTIFY REQUIRED SKILLS
    async identifyRequiredSkills(scope) {
        const requiredSkills = [];
        
        if (scope.type === 'electrical') {
            requiredSkills.push('electrical_wiring', 'circuit_installation', 'safety_inspection');
        }
        
        if (scope.type === 'plumbing') {
            requiredSkills.push('pipe_installation', 'drainage_systems', 'water_heater_installation');
        }
        
        if (scope.type === 'structural') {
            requiredSkills.push('concrete_work', 'steel_fixing', 'structural_analysis');
        }
        
        if (scope.type === 'finishing') {
            requiredSkills.push('plastering', 'painting', 'tiling');
        }
        
        return requiredSkills;
    }

    // 🛡️ IDENTIFY SAFETY REQUIREMENTS
    identifySafetyRequirements(scope) {
        const requirements = [...this.safetyStandards.required];
        
        if (scope.type === 'electrical') {
            requirements.push('insulated_gloves', 'voltage_tester');
        }
        
        if (scope.type === 'structural') {
            requirements.push('fall_protection', 'scaffolding');
        }
        
        if (scope.type === 'demolition') {
            requirements.push('dust_mask', 'ear_protection', 'safety_goggles');
        }
        
        return requirements;
    }
}

module.exports = new ConstructionService();