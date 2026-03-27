// backend/services/workerMatchingService.js

const { User, Service, Transaction, Review, Skill, Portfolio } = require('../models');
const { Sequelize, Op } = require('sequelize');
const redis = require('../config/redis');
const { YachiAI } = require('./yachiAI');
const { YachiAnalytics } = require('./yachiAnalytics');

class WorkerMatchingService {
    constructor() {
        this.cacheEnabled = process.env.CACHE_ENABLED === 'true';
        this.cacheTTL = 300; // 5 minutes
    }

    // 🎯 MAIN MATCHING FUNCTION
    async matchWorkerToJob(jobData, clientId = null) {
        try {
            const cacheKey = this.getJobCacheKey(jobData);
            
            if (this.cacheEnabled) {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached);
                }
            }

            const matches = await this.findBestMatches(jobData);
            
            if (this.cacheEnabled && matches.length > 0) {
                await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(matches));
            }

            return matches;
        } catch (error) {
            console.error('Worker matching error:', error);
            throw new Error('Failed to find matching workers');
        }
    }

    // 🎯 FIND BEST MATCHES WITH MULTI-FACTOR SCORING
    async findBestMatches(jobData) {
        const {
            serviceType,
            requiredSkills = [],
            location = null,
            budget,
            urgency = 'normal',
            clientHistory = null,
            preferredWorkerIds = []
        } = jobData;

        // Step 1: Get potential workers
        let potentialWorkers = await this.getPotentialWorkers(serviceType, location);

        // Step 2: Apply multiple scoring factors
        const scoredWorkers = await Promise.all(
            potentialWorkers.map(async (worker) => {
                const scores = await this.calculateWorkerScores(worker, {
                    requiredSkills,
                    budget,
                    urgency,
                    clientHistory,
                    jobData
                });

                const totalScore = this.calculateTotalScore(scores);
                
                return {
                    worker,
                    scores,
                    totalScore,
                    matchPercentage: (totalScore / 100) * 100
                };
            })
        );

        // Step 3: Sort by score and apply filters
        let sortedWorkers = scoredWorkers
            .filter(result => result.totalScore >= 50) // Minimum threshold
            .sort((a, b) => b.totalScore - a.totalScore);

        // Step 4: Apply urgency boost
        if (urgency === 'high' || urgency === 'emergency') {
            sortedWorkers = this.applyUrgencyBoost(sortedWorkers, urgency);
        }

        // Step 5: Apply client preferences
        if (clientHistory) {
            sortedWorkers = this.applyClientPreferences(sortedWorkers, clientHistory);
        }

        // Step 6: Apply preferred workers boost
        if (preferredWorkerIds.length > 0) {
            sortedWorkers = this.applyPreferredWorkerBoost(sortedWorkers, preferredWorkerIds);
        }

        // Step 7: AI-powered final ranking
        const finalRanking = await this.aiFinalRanking(sortedWorkers, jobData);

        return finalRanking.slice(0, 10); // Return top 10 matches
    }

    // 🎯 GET POTENTIAL WORKERS
    async getPotentialWorkers(serviceType, location = null) {
        const where = {
            role: { [Op.in]: ['provider', 'graduate'] },
            status: 'active',
            availability: { [Op.ne]: 'unavailable' }
        };

        // Location filter
        if (location && location.latitude && location.longitude) {
            where.location = {
                [Op.and]: [
                    Sequelize.where(
                        Sequelize.fn(
                            'ST_DWithin',
                            Sequelize.col('location.coordinates'),
                            Sequelize.fn('ST_MakePoint', location.longitude, location.latitude),
                            50000 / 111000 // ~50km radius
                        ),
                        true
                    )
                ]
            };
        }

        const workers = await User.findAll({
            where,
            include: [
                {
                    model: Service,
                    as: 'services',
                    where: { 
                        type: serviceType,
                        status: 'active'
                    },
                    required: true
                },
                {
                    model: Skill,
                    as: 'skills',
                    attributes: ['name', 'proficiency']
                },
                {
                    model: Portfolio,
                    as: 'portfolio',
                    limit: 3
                }
            ],
            attributes: [
                'id', 'name', 'avatar', 'rating', 'level',
                'skills', 'availability', 'faydaVerified',
                'selfieVerified', 'documentVerified',
                'responseRate', 'acceptanceRate',
                'completedJobs', 'totalEarnings',
                'location', 'premiumListing'
            ]
        });

        return workers;
    }

    // 🎯 CALCULATE WORKER SCORES
    async calculateWorkerScores(worker, jobContext) {
        const scores = {};

        // 1. Skill Match Score (0-30 points)
        scores.skillMatch = await this.calculateSkillMatchScore(
            worker.skills || [],
            jobContext.requiredSkills
        );

        // 2. Experience Level Score (0-20 points)
        scores.experience = this.calculateExperienceScore(worker.level);

        // 3. Rating & Reviews Score (0-15 points)
        scores.rating = this.calculateRatingScore(worker.rating, worker.reviews);

        // 4. Availability Score (0-15 points)
        scores.availability = await this.calculateAvailabilityScore(worker);

        // 5. Location Proximity Score (0-10 points)
        if (jobContext.jobData.location) {
            scores.location = await this.calculateLocationScore(
                worker.location,
                jobContext.jobData.location
            );
        } else {
            scores.location = 5; // Default score
        }

        // 6. Pricing Compatibility Score (0-10 points)
        scores.pricing = await this.calculatePricingScore(worker, jobContext.budget);

        // 7. Verification Score (0-10 points)
        scores.verification = this.calculateVerificationScore(worker);

        // 8. Response Rate Score (0-5 points)
        scores.responseRate = this.calculateResponseRateScore(worker.responseRate);

        // 9. Completion Rate Score (0-5 points)
        scores.completionRate = await this.calculateCompletionRateScore(worker.id);

        // 10. Premium Bonus (0-10 points)
        scores.premium = worker.premiumListing ? 10 : 0;

        // 11. AI-Predicted Success Score
        scores.aiPrediction = await this.calculateAIPredictionScore(worker, jobContext);

        return scores;
    }

    // 🎯 SKILL MATCH SCORE
    async calculateSkillMatchScore(workerSkills, requiredSkills) {
        if (!requiredSkills || requiredSkills.length === 0) return 15;

        const workerSkillNames = workerSkills.map(s => s.name || s);
        const matchingSkills = requiredSkills.filter(skill => 
            workerSkillNames.includes(skill)
        );

        const matchPercentage = (matchingSkills.length / requiredSkills.length) * 100;
        
        if (matchPercentage >= 90) return 30;
        if (matchPercentage >= 75) return 25;
        if (matchPercentage >= 50) return 20;
        if (matchPercentage >= 25) return 15;
        return 10;
    }

    // 🎯 EXPERIENCE SCORE
    calculateExperienceScore(level) {
        const levelScores = {
            expert: 20,
            advanced: 17,
            intermediate: 14,
            beginner: 10,
            newbie: 5
        };
        return levelScores[level] || 10;
    }

    // 🎯 RATING SCORE
    calculateRatingScore(rating, reviews = []) {
        if (!rating) return 5;
        
        let baseScore = Math.min(rating * 3, 15); // Max 15 points
        
        // Bonus for number of reviews
        if (reviews.length >= 50) baseScore += 2;
        else if (reviews.length >= 20) baseScore += 1;
        
        return Math.min(baseScore, 15);
    }

    // 🎯 AVAILABILITY SCORE
    async calculateAvailabilityScore(worker) {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        let score = 0;
        
        switch (worker.availability) {
            case 'available':
                score = 15;
                break;
            case 'busy':
                score = 10;
                break;
            case 'away':
                score = 5;
                break;
            default:
                score = 0;
        }
        
        // Check working hours
        if (worker.availabilityMetadata?.schedule?.workingHours) {
            const { start, end, timezone } = worker.availabilityMetadata.schedule.workingHours;
            const isWorkingHour = this.isWithinWorkingHours(hour, start, end);
            if (isWorkingHour) score += 3;
        }
        
        // Check working days
        if (worker.availabilityMetadata?.schedule?.workingDays) {
            const isWorkingDay = worker.availabilityMetadata.schedule.workingDays.includes(day);
            if (isWorkingDay) score += 2;
        }
        
        return Math.min(score, 15);
    }

    // 🎯 LOCATION SCORE
    async calculateLocationScore(workerLocation, jobLocation) {
        if (!workerLocation || !workerLocation.coordinates) return 0;
        
        try {
            const distance = await this.calculateDistance(
                workerLocation.coordinates,
                jobLocation
            );
            
            if (distance <= 5) return 10;    // Within 5km
            if (distance <= 10) return 8;     // Within 10km
            if (distance <= 20) return 6;     // Within 20km
            if (distance <= 50) return 4;     // Within 50km
            return 2;                        // Beyond 50km
        } catch (error) {
            console.error('Location score error:', error);
            return 0;
        }
    }

    // 🎯 PRICING SCORE
    async calculatePricingScore(worker, budget) {
        if (!budget) return 5;
        
        const avgPrice = await this.getWorkerAveragePrice(worker.id);
        
        if (!avgPrice) return 5;
        
        const priceRatio = avgPrice / budget;
        
        if (priceRatio <= 0.8) return 10;     // Worker charges less (good for client)
        if (priceRatio <= 1.0) return 8;      // Within budget
        if (priceRatio <= 1.2) return 6;      // Slightly over
        if (priceRatio <= 1.5) return 4;      // Moderately over
        return 2;                            // Significantly over
    }

    // 🎯 VERIFICATION SCORE
    calculateVerificationScore(worker) {
        let score = 0;
        if (worker.faydaVerified) score += 4;
        if (worker.selfieVerified) score += 3;
        if (worker.documentVerified) score += 3;
        return score;
    }

    // 🎯 RESPONSE RATE SCORE
    calculateResponseRateScore(responseRate) {
        if (!responseRate) return 0;
        
        if (responseRate >= 90) return 5;
        if (responseRate >= 75) return 4;
        if (responseRate >= 60) return 3;
        if (responseRate >= 40) return 2;
        return 1;
    }

    // 🎯 COMPLETION RATE SCORE
    async calculateCompletionRateScore(workerId) {
        try {
            const stats = await YachiAnalytics.getWorkerCompletionStats(workerId);
            const completionRate = stats.completionRate || 0;
            
            if (completionRate >= 95) return 5;
            if (completionRate >= 90) return 4;
            if (completionRate >= 80) return 3;
            if (completionRate >= 70) return 2;
            return 1;
        } catch (error) {
            return 0;
        }
    }

    // 🎯 AI PREDICTION SCORE
    async calculateAIPredictionScore(worker, jobContext) {
        try {
            const prediction = await YachiAI.predictJobSuccess({
                workerId: worker.id,
                jobType: jobContext.jobData.serviceType,
                requiredSkills: jobContext.requiredSkills,
                workerSkills: worker.skills,
                workerRating: worker.rating,
                urgency: jobContext.urgency
            });
            
            return Math.min(prediction.confidenceScore * 10, 10);
        } catch (error) {
            console.error('AI prediction error:', error);
            return 5; // Default score
        }
    }

    // 🎯 CALCULATE TOTAL SCORE
    calculateTotalScore(scores) {
        const weights = {
            skillMatch: 0.20,
            experience: 0.15,
            rating: 0.12,
            availability: 0.12,
            location: 0.08,
            pricing: 0.08,
            verification: 0.08,
            responseRate: 0.04,
            completionRate: 0.04,
            premium: 0.05,
            aiPrediction: 0.04
        };

        let total = 0;
        for (const [key, weight] of Object.entries(weights)) {
            total += (scores[key] || 0) * weight;
        }

        return Math.min(Math.round(total), 100);
    }

    // 🎯 APPLY URGENCY BOOST
    applyUrgencyBoost(workers, urgency) {
        return workers.map(result => {
            let boost = 0;
            
            if (urgency === 'high') {
                boost = result.scores.availability * 1.5;
            } else if (urgency === 'emergency') {
                boost = result.scores.availability * 2.0;
            }
            
            return {
                ...result,
                totalScore: Math.min(result.totalScore + boost, 100),
                urgencyBoost: boost
            };
        }).sort((a, b) => b.totalScore - a.totalScore);
    }

    // 🎯 APPLY CLIENT PREFERENCES
    applyClientPreferences(workers, clientHistory) {
        return workers.map(result => {
            let preferenceBoost = 0;
            
            // Previous work with this client
            if (clientHistory.workedBefore.includes(result.worker.id)) {
                preferenceBoost += 15;
            }
            
            // Client's preferred worker types
            if (clientHistory.preferredWorkerTypes.includes(result.worker.level)) {
                preferenceBoost += 10;
            }
            
            // Client's average rating for this worker
            const clientRating = clientHistory.workerRatings?.[result.worker.id] || 0;
            if (clientRating >= 4) {
                preferenceBoost += clientRating * 5;
            }
            
            return {
                ...result,
                totalScore: Math.min(result.totalScore + preferenceBoost, 100),
                clientPreferenceBoost: preferenceBoost
            };
        }).sort((a, b) => b.totalScore - a.totalScore);
    }

    // 🎯 APPLY PREFERRED WORKER BOOST
    applyPreferredWorkerBoost(workers, preferredWorkerIds) {
        return workers.map(result => {
            let boost = 0;
            
            if (preferredWorkerIds.includes(result.worker.id)) {
                boost = 20; // Significant boost for preferred workers
            }
            
            return {
                ...result,
                totalScore: Math.min(result.totalScore + boost, 100),
                preferredWorkerBoost: boost
            };
        }).sort((a, b) => b.totalScore - a.totalScore);
    }

    // 🎯 AI FINAL RANKING
    async aiFinalRanking(workers, jobData) {
        try {
            const ranking = await YachiAI.rankWorkers({
                workers: workers.map(w => ({
                    id: w.worker.id,
                    scores: w.scores,
                    profile: {
                        skills: w.worker.skills,
                        rating: w.worker.rating,
                        experience: w.worker.level
                    }
                })),
                jobRequirements: {
                    type: jobData.serviceType,
                    skills: jobData.requiredSkills,
                    urgency: jobData.urgency,
                    budget: jobData.budget
                }
            });

            // Apply AI ranking adjustments
            return workers.map(result => {
                const aiRank = ranking.find(r => r.workerId === result.worker.id);
                if (aiRank) {
                    const aiBoost = aiRank.rankingScore * 10;
                    return {
                        ...result,
                        totalScore: Math.min(result.totalScore + aiBoost, 100),
                        aiRanking: aiRank.rank,
                        aiConfidence: aiRank.confidence
                    };
                }
                return result;
            }).sort((a, b) => {
                // Primary sort by AI rank, then by total score
                if (a.aiRanking !== b.aiRanking) {
                    return a.aiRanking - b.aiRanking;
                }
                return b.totalScore - a.totalScore;
            });
        } catch (error) {
            console.error('AI ranking error:', error);
            return workers; // Fallback to original ranking
        }
    }

    // 🎯 GET WORKER AVERAGE PRICE
    async getWorkerAveragePrice(workerId) {
        try {
            const result = await Service.findOne({
                where: { providerId: workerId, status: 'active' },
                attributes: [
                    [Sequelize.fn('AVG', Sequelize.col('price')), 'avgPrice']
                ],
                raw: true
            });
            
            return result?.avgPrice || null;
        } catch (error) {
            console.error('Get average price error:', error);
            return null;
        }
    }

    // 🎯 CALCULATE DISTANCE (Haversine formula)
    async calculateDistance(point1, point2) {
        const [lon1, lat1] = point1;
        const [lon2, lat2] = [point2.longitude, point2.latitude];
        
        const R = 6371; // Earth's radius in km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance; // in kilometers
    }

    // 🎯 DEGREES TO RADIANS
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    // 🎯 CHECK WORKING HOURS
    isWithinWorkingHours(currentHour, startHour, endHour) {
        const start = parseInt(startHour.split(':')[0]);
        const end = parseInt(endHour.split(':')[0]);
        
        if (end >= start) {
            return currentHour >= start && currentHour <= end;
        } else {
            // Crosses midnight
            return currentHour >= start || currentHour <= end;
        }
    }

    // 🎯 CACHE KEY GENERATION
    getJobCacheKey(jobData) {
        const keyData = {
            serviceType: jobData.serviceType,
            skills: jobData.requiredSkills?.sort(),
            location: jobData.location,
            budget: jobData.budget,
            urgency: jobData.urgency
        };
        
        return `worker_match:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
    }

    // 🎯 CLEAR MATCHING CACHE
    async clearMatchingCache(workerId = null) {
        if (workerId) {
            const pattern = `worker_match:*worker_${workerId}_*`;
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(keys);
            }
        } else {
            const keys = await redis.keys('worker_match:*');
            if (keys.length > 0) {
                await redis.del(keys);
            }
        }
    }

    // 🎯 GET MATCHING STATISTICS
    async getMatchingStats(workerId) {
        const stats = {
            totalMatches: 0,
            matchRate: 0,
            averageScore: 0,
            topSkills: [],
            improvementSuggestions: []
        };

        try {
            const worker = await User.findByPk(workerId, {
                include: [{ model: Service, as: 'services' }]
            });

            if (!worker) return stats;

            // Analyze recent matching performance
            const recentMatches = await this.getRecentMatches(workerId);
            
            stats.totalMatches = recentMatches.length;
            
            if (recentMatches.length > 0) {
                stats.matchRate = (recentMatches.filter(m => m.totalScore >= 60).length / recentMatches.length) * 100;
                stats.averageScore = recentMatches.reduce((sum, m) => sum + m.totalScore, 0) / recentMatches.length;
                
                // Identify top performing skills
                const skillScores = {};
                recentMatches.forEach(match => {
                    match.scores.skillMatch && Object.entries(match.scores.skillMatch).forEach(([skill, score]) => {
                        skillScores[skill] = (skillScores[skill] || 0) + score;
                    });
                });
                
                stats.topSkills = Object.entries(skillScores)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([skill]) => skill);

                // Generate improvement suggestions
                stats.improvementSuggestions = await this.generateImprovementSuggestions(
                    worker,
                    recentMatches
                );
            }

            return stats;
        } catch (error) {
            console.error('Get matching stats error:', error);
            return stats;
        }
    }

    // 🎯 GET RECENT MATCHES
    async getRecentMatches(workerId, limit = 50) {
        // This would typically query a matching history table
        // For now, return empty array
        return [];
    }

    // 🎯 GENERATE IMPROVEMENT SUGGESTIONS
    async generateImprovementSuggestions(worker, recentMatches) {
        const suggestions = [];
        
        // Analyze low scoring areas
        const lowScores = {};
        recentMatches.forEach(match => {
            Object.entries(match.scores).forEach(([category, score]) => {
                if (score < 50) {
                    lowScores[category] = (lowScores[category] || 0) + 1;
                }
            });
        });

        // Generate suggestions based on low scores
        if (lowScores.skillMatch && lowScores.skillMatch > recentMatches.length * 0.5) {
            suggestions.push({
                category: 'skills',
                suggestion: 'Consider adding more skills or improving proficiency in high-demand areas',
                priority: 'high'
            });
        }

        if (lowScores.availability && lowScores.availability > recentMatches.length * 0.5) {
            suggestions.push({
                category: 'availability',
                suggestion: 'Update your availability schedule to match peak demand times',
                priority: 'medium'
            });
        }

        if (lowScores.pricing && lowScores.pricing > recentMatches.length * 0.3) {
            suggestions.push({
                category: 'pricing',
                suggestion: 'Review your pricing strategy based on market rates',
                priority: 'medium'
            });
        }

        // Add AI-powered suggestions
        const aiSuggestions = await YachiAI.getWorkerImprovementSuggestions(worker.id);
        suggestions.push(...aiSuggestions);

        return suggestions;
    }
}

module.exports = new WorkerMatchingService();