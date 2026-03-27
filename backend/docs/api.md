🎯 Yachi Platform API Documentation
📋 Table of Contents

    Overview

    Authentication

    Base URL & Headers

    Error Handling

    Rate Limiting

    Endpoints

        Authentication

        Users

        Services

        Bookings

        Payments

        Reviews

        Verifications

        Portfolio

        Gamification

        Uploads

        Admin

    Webhooks

    Changelog

📖 Overview

The Yachi API provides programmatic access to Ethiopia's premier service marketplace platform. This RESTful API allows you to build applications that can interact with Yachi's services, users, bookings, payments, and more.
API Version

    Current Version: v1

    Base URL: https://api.yachi.com/api/v1

    Format: JSON

Support

    Email: api-support@yachi.com

    Documentation: https://docs.yachi.com

    Status: https://status.yachi.com

🔐 Authentication

Yachi API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header for all authenticated requests.
Getting Started

    Register your application to get API credentials

    Use the login endpoint to obtain access and refresh tokens

    Include the access token in the Authorization header

    Refresh tokens when they expire

Headers

Authorization: Bearer <access_token>
Content-Type: application/json
X-API-Key: your_api_key_here

Token Types

    Access Token: Short-lived (15 minutes) for API requests

    Refresh Token: Long-lived (7 days) for obtaining new access tokens

🌐 Base URL & Headers
Base URL

https://api.yachi.com/api/v1

Required Headers

Content-Type: application/json
Authorization: Bearer <jwt_token>
X-API-Key: <your_api_key>
X-Request-ID: <unique_request_id>  # Optional for tracking

Optional Headers
http

Accept-Language: am  # am for Amharic, en for English
X-Timezone: Africa/Addis_Ababa

⚠️ Error Handling
Error Response Format
json

{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  },
  "timestamp": "2023-12-01T12:00:00.000Z",
  "requestId": "req_123456789"
}

Common HTTP Status Codes

    200 - Success

    201 - Created

    400 - Bad Request (Validation Error)

    401 - Unauthorized (Invalid Token)

    403 - Forbidden (Insufficient Permissions)

    404 - Not Found

    429 - Too Many Requests (Rate Limit)

    500 - Internal Server Error

Error Codes
Code	Description
VALIDATION_ERROR	Input validation failed
AUTH_INVALID_CREDENTIALS	Invalid email or password
AUTH_TOKEN_EXPIRED	JWT token has expired
AUTH_INSUFFICIENT_PERMISSIONS	User lacks required permissions
RESOURCE_NOT_FOUND	Requested resource not found
RATE_LIMIT_EXCEEDED	Too many requests
🚦 Rate Limiting

    General API: 100 requests per 15 minutes

    Authentication: 5 attempts per 15 minutes

    File Uploads: 10 uploads per hour

    Payments: 20 attempts per hour

Rate Limit Headers
http

X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 900

🔑 Authentication Endpoints
Register User
http

POST /auth/register

Request Body:
json

{
  "email": "user@example.com",
  "phone": "+251911223344",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "client",
  "agreeToTerms": true,
  "marketingEmails": false
}

Response:
json

{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "client",
      "verificationStatus": "pending"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

Login
http

POST /auth/login

Request Body:
json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response:
json

{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "client",
      "avatar": "/images/avatars/default.jpg"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}

Refresh Token
http

POST /auth/refresh

Request Body:
json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
json

{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}

Logout
http

POST /auth/logout

Response:
json

{
  "success": true,
  "message": "Logged out successfully"
}

Forgot Password
http

POST /auth/forgot-password

Request Body:
json

{
  "email": "user@example.com"
}

Response:
json

{
  "success": true,
  "message": "Password reset instructions sent to your email"
}

Reset Password
http

POST /auth/reset-password

Request Body:
json

{
  "token": "reset_token_from_email",
  "password": "NewSecurePassword123!"
}

Response:
json

{
  "success": true,
  "message": "Password reset successfully"
}

👥 Users Endpoints
Get User Profile
http

GET /users/{id}

Response:
json

{
  "success": true,
  "data": {
    "id": 123,
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "phone": "+251911223344",
    "avatar": "/images/avatars/user123.jpg",
    "bio": "Software developer based in Addis Ababa",
    "role": "client",
    "rating": 4.8,
    "reviewCount": 15,
    "completedJobs": 8,
    "verification": {
      "emailVerified": true,
      "phoneVerified": true,
      "faydaVerified": false,
      "documentVerified": false
    },
    "location": {
      "latitude": 9.0054,
      "longitude": 38.7636,
      "address": "Bole Road, Addis Ababa"
    },
    "stats": {
      "responseRate": 95.5,
      "completionRate": 100.0
    },
    "createdAt": "2023-01-15T08:30:00.000Z"
  }
}

Update User Profile
http

PUT /users/{id}

Request Body:
json

{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Updated bio information",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "location": {
    "latitude": 9.0054,
    "longitude": 38.7636
  }
}

Response:
json

{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": 123,
      "firstName": "John",
      "lastName": "Doe",
      "bio": "Updated bio information"
    }
  }
}

Update User Skills
http

PUT /users/{id}/skills

Request Body:
json

{
  "skills": ["plumbing", "pipe fitting", "emergency repair"],
  "proficiency": "expert",
  "certifications": ["Plumbing License 2023"]
}

Response:
json

{
  "success": true,
  "message": "Skills updated successfully",
  "data": {
    "skills": ["plumbing", "pipe fitting", "emergency repair"],
    "analysis": {
      "validatedSkills": ["plumbing", "pipe fitting"],
      "suggestedSkills": ["drain cleaning", "water heater installation"]
    }
  },
  "gamification": {
    "pointsAwarded": 15,
    "achievement": "Skills Updated"
  }
}

Update Availability
http

PUT /users/{id}/availability

Request Body:
json

{
  "status": "available",
  "schedule": {
    "workingHours": {
      "start": "08:00",
      "end": "18:00",
      "timezone": "Africa/Addis_Ababa"
    },
    "workingDays": [1, 2, 3, 4, 5],
    "emergencyService": true
  },
  "noticePeriod": 2
}

Response:
json

{
  "success": true,
  "message": "Availability updated to available",
  "data": {
    "status": "available",
    "schedule": {
      "workingHours": {
        "start": "08:00",
        "end": "18:00",
        "timezone": "Africa/Addis_Ababa"
      }
    }
  }
}

Search Users
http

GET /users/search?query=plumber&location=9.0054,38.7636&radius=10&minRating=4.0

Query Parameters:

    query (optional): Search term

    skills (optional): Comma-separated skills

    location (optional): "latitude,longitude"

    radius (optional): Search radius in km (default: 50)

    minRating (optional): Minimum rating (1-5)

    availability (optional): immediate, within_week, flexible

    verifiedOnly (optional): true/false (default: true)

    page (optional): Page number (default: 1)

    limit (optional): Results per page (default: 20)

Response:
json

{
  "success": true,
  "data": {
    "users": [
      {
        "id": 123,
        "firstName": "Alemayehu",
        "lastName": "Tekalign",
        "avatar": "/images/avatars/alemayehu.jpg",
        "rating": 4.8,
        "skills": ["plumbing", "pipe fitting"],
        "location": "Bole Road, Addis Ababa",
        "distance": 2.5,
        "responseRate": 96.2,
        "verified": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}

🛠️ Services Endpoints
Create Service
http

POST /services

Request Body:
json

{
  "title": "Emergency Plumbing Repair",
  "description": "Fast and reliable emergency plumbing services for leaks, clogs, and pipe repairs.",
  "category": "construction",
  "subcategory": "plumbing",
  "price": 450.00,
  "currency": "ETB",
  "duration": 90,
  "location": {
    "latitude": 9.0054,
    "longitude": 38.7636
  },
  "tags": ["emergency", "plumbing", "repair", "24/7"],
  "requirements": ["Describe the issue", "Provide access to plumbing"]
}

Response:
json

{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "service": {
      "id": 456,
      "title": "Emergency Plumbing Repair",
      "description": "Fast and reliable emergency plumbing services...",
      "price": 450.00,
      "currency": "ETB",
      "category": "construction",
      "status": "active",
      "createdAt": "2023-12-01T10:00:00.000Z"
    }
  }
}

Get Service
http

GET /services/{id}

Response:
json

{
  "success": true,
  "data": {
    "id": 456,
    "title": "Emergency Plumbing Repair",
    "description": "Fast and reliable emergency plumbing services...",
    "category": "construction",
    "subcategory": "plumbing",
    "price": 450.00,
    "currency": "ETB",
    "duration": 90,
    "provider": {
      "id": 123,
      "name": "Alemayehu Tekalign",
      "avatar": "/images/avatars/alemayehu.jpg",
      "rating": 4.8,
      "verified": true
    },
    "images": [
      "/images/services/plumbing-1.jpg",
      "/images/services/plumbing-2.jpg"
    ],
    "tags": ["emergency", "plumbing", "repair"],
    "rating": 4.8,
    "reviewCount": 89,
    "bookingCount": 156,
    "location": {
      "latitude": 9.0054,
      "longitude": 38.7636,
      "address": "Bole Road, Addis Ababa"
    },
    "requirements": ["Describe the issue", "Provide access to plumbing"],
    "metadata": {
      "emergency": true,
      "responseTime": "1-2 hours"
    },
    "createdAt": "2023-01-15T08:30:00.000Z"
  }
}

Update Service
http

PUT /services/{id}

Request Body:
json

{
  "title": "Updated Service Title",
  "description": "Updated service description",
  "price": 500.00,
  "status": "active"
}

Response:
json

{
  "success": true,
  "message": "Service updated successfully",
  "data": {
    "service": {
      "id": 456,
      "title": "Updated Service Title",
      "price": 500.00,
      "status": "active"
    }
  }
}

Search Services
http

GET /services/search?query=plumbing&category=construction&minPrice=100&maxPrice=1000&location=9.0054,38.7636&radius=20&sort=rating&page=1&limit=20

Query Parameters:

    query (optional): Search term

    category (optional): Service category

    subcategory (optional): Service subcategory

    minPrice (optional): Minimum price

    maxPrice (optional): Maximum price

    location (optional): "latitude,longitude"

    radius (optional): Search radius in km (default: 50)

    minRating (optional): Minimum rating (1-5)

    sort (optional): rating, price_low, price_high, distance, newest

    tags (optional): Comma-separated tags

    emergency (optional): true/false

    page (optional): Page number (default: 1)

    limit (optional): Results per page (default: 20)

Response:
json

{
  "success": true,
  "data": {
    "services": [
      {
        "id": 456,
        "title": "Emergency Plumbing Repair",
        "description": "Fast and reliable emergency plumbing services...",
        "price": 450.00,
        "currency": "ETB",
        "category": "construction",
        "rating": 4.8,
        "reviewCount": 89,
        "image": "/images/services/plumbing-1.jpg",
        "provider": {
          "name": "Alemayehu Tekalign",
          "avatar": "/images/avatars/alemayehu.jpg",
          "verified": true
        },
        "location": "Bole Road, Addis Ababa",
        "distance": 2.5,
        "tags": ["emergency", "plumbing", "repair"],
        "emergency": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 125,
      "pages": 7
    },
    "filters": {
      "categories": ["construction", "home_services", "automotive"],
      "priceRange": {
        "min": 100,
        "max": 5000
      }
    }
  }
}

Get Service Categories
http

GET /services/categories

Response:
json

{
  "success": true,
  "data": {
    "categories": [
      {
        "code": "construction",
        "name": "Construction & Renovation",
        "subcategories": ["plumbing", "electrical", "carpentry", "painting"],
        "icon": "construction",
        "description": "Building and renovation services"
      },
      {
        "code": "home_services",
        "name": "Home Services",
        "subcategories": ["cleaning", "moving", "gardening"],
        "icon": "home",
        "description": "Home maintenance and services"
      }
    ]
  }
}

📅 Bookings Endpoints
Create Booking
http

POST /bookings

Request Body:
json

{
  "serviceId": 456,
  "providerId": 123,
  "scheduledDate": "2023-12-05T10:00:00.000Z",
  "duration": 90,
  "location": {
    "latitude": 9.0123,
    "longitude": 38.7612,
    "address": "Bole Michael, House No. 45, Addis Ababa"
  },
  "specialRequests": "Kitchen sink is completely clogged and water is not draining.",
  "emergencyContact": {
    "name": "Meron Abebe",
    "phone": "+251911223344",
    "relationship": "Spouse"
  }
}

Response:
json

{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking": {
      "id": 789,
      "status": "pending",
      "scheduledDate": "2023-12-05T10:00:00.000Z",
      "totalAmount": 543.38,
      "currency": "ETB",
      "service": {
        "title": "Emergency Plumbing Repair",
        "providerName": "Alemayehu Tekalign"
      }
    },
    "paymentRequired": true
  }
}

Get Booking
http

GET /bookings/{id}

Response:
json

{
  "success": true,
  "data": {
    "id": 789,
    "status": "confirmed",
    "paymentStatus": "completed",
    "scheduledDate": "2023-12-05T10:00:00.000Z",
    "duration": 90,
    "totalAmount": 543.38,
    "currency": "ETB",
    "location": {
      "latitude": 9.0123,
      "longitude": 38.7612,
      "address": "Bole Michael, House No. 45, Addis Ababa"
    },
    "service": {
      "id": 456,
      "title": "Emergency Plumbing Repair",
      "category": "construction",
      "image": "/images/services/plumbing-1.jpg"
    },
    "provider": {
      "id": 123,
      "name": "Alemayehu Tekalign",
      "phone": "+251911334455",
      "avatar": "/images/avatars/alemayehu.jpg",
      "rating": 4.8
    },
    "client": {
      "id": 6,
      "name": "Meron Abebe",
      "phone": "+251955778899",
      "avatar": "/images/avatars/meron.jpg"
    },
    "specialRequests": "Kitchen sink is completely clogged...",
    "timeline": [
      {
        "status": "pending",
        "timestamp": "2023-12-04T14:30:00.000Z",
        "description": "Booking requested"
      },
      {
        "status": "confirmed",
        "timestamp": "2023-12-04T14:35:00.000Z",
        "description": "Booking confirmed by provider"
      }
    ],
    "createdAt": "2023-12-04T14:30:00.000Z"
  }
}

Update Booking Status
http

PATCH /bookings/{id}/status

Request Body:
json

{
  "status": "confirmed",
  "notes": "I can handle this booking at the scheduled time"
}

Response:
json

{
  "success": true,
  "message": "Booking status updated to confirmed",
  "data": {
    "booking": {
      "id": 789,
      "status": "confirmed",
      "updatedAt": "2023-12-04T14:35:00.000Z"
    }
  }
}

Cancel Booking
http

POST /bookings/{id}/cancel

Request Body:
json

{
  "reason": "Unexpected emergency",
  "cancelledBy": "client"
}

Response:
json

{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "booking": {
      "id": 789,
      "status": "cancelled",
      "cancellationFee": 100.00,
      "refundAmount": 443.38
    }
  }
}

Complete Booking
http

POST /bookings/{id}/complete

Request Body:
json

{
  "completionNotes": "Cleared major clog in kitchen drain pipe. Replaced damaged PVC section. Tested drainage - working perfectly.",
  "actualDuration": 85,
  "finalAmount": 543.38
}

Response:
json

{
  "success": true,
  "message": "Booking completed successfully",
  "data": {
    "booking": {
      "id": 789,
      "status": "completed",
      "completedAt": "2023-12-05T11:45:00.000Z"
    },
    "gamification": {
      "pointsAwarded": 30,
      "achievement": "Service Completed"
    }
  }
}

Get User Bookings
http

GET /users/{id}/bookings?status=completed&page=1&limit=10

Query Parameters:

    status (optional): pending, confirmed, in_progress, completed, cancelled

    type (optional): client, provider

    page (optional): Page number (default: 1)

    limit (optional): Results per page (default: 20)

Response:
json

{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": 789,
        "status": "completed",
        "scheduledDate": "2023-12-05T10:00:00.000Z",
        "totalAmount": 543.38,
        "currency": "ETB",
        "service": {
          "title": "Emergency Plumbing Repair",
          "image": "/images/services/plumbing-1.jpg"
        },
        "counterparty": {
          "name": "Alemayehu Tekalign",
          "avatar": "/images/avatars/alemayehu.jpg",
          "role": "provider"
        },
        "completedAt": "2023-12-05T11:45:00.000Z",
        "rating": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "pages": 2
    }
  }
}

💰 Payments Endpoints
Process Payment
http

POST /payments/process

Request Body:
json

{
  "bookingId": 789,
  "amount": 543.38,
  "currency": "ETB",
  "paymentMethod": "telebirr",
  "provider": "telebirr",
  "metadata": {
    "phoneNumber": "+251911223344"
  }
}

Response:
json

{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "transaction": {
      "id": 101,
      "status": "completed",
      "amount": 543.38,
      "currency": "ETB",
      "paymentReference": "TBR123456789",
      "processedAt": "2023-12-04T14:40:00.000Z"
    },
    "booking": {
      "id": 789,
      "status": "confirmed",
      "paymentStatus": "completed"
    }
  }
}

Get Payment Methods
http

GET /payments/methods

Response:
json

{
  "success": true,
  "data": {
    "methods": [
      {
        "code": "telebirr",
        "name": "Telebirr",
        "type": "mobile_money",
        "icon": "/images/payments/telebirr.png",
        "supportedCurrencies": ["ETB"],
        "fees": {
          "percentage": 1.5,
          "fixed": 0
        }
      },
      {
        "code": "cbebirr",
        "name": "CBE Birr",
        "type": "mobile_money",
        "icon": "/images/payments/cbebirr.png",
        "supportedCurrencies": ["ETB"],
        "fees": {
          "percentage": 1.0,
          "fixed": 0
        }
      },
      {
        "code": "bank_transfer",
        "name": "Bank Transfer",
        "type": "bank_transfer",
        "icon": "/images/payments/bank-transfer.png",
        "supportedCurrencies": ["ETB", "USD"],
        "fees": {
          "percentage": 0,
          "fixed": 0
        }
      }
    ]
  }
}

Get Transaction History
http

GET /users/{id}/transactions?type=payment&page=1&limit=20

Query Parameters:

    type (optional): payment, refund, withdrawal, commission

    status (optional): pending, completed, failed

    startDate (optional): Start date filter

    endDate (optional): End date filter

    page (optional): Page number (default: 1)

    limit (optional): Results per page (default: 20)

Response:
json

{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 101,
        "type": "payment",
        "amount": 543.38,
        "currency": "ETB",
        "status": "completed",
        "description": "Payment for Emergency Plumbing Repair",
        "paymentMethod": "telebirr",
        "paymentReference": "TBR123456789",
        "createdAt": "2023-12-04T14:35:00.000Z",
        "processedAt": "2023-12-04T14:40:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    },
    "summary": {
      "totalEarnings": 12500.00,
      "totalWithdrawals": 8000.00,
      "availableBalance": 4500.00
    }
  }
}

⭐ Reviews Endpoints
Create Review
http

POST /reviews

Request Body:
json

{
  "bookingId": 789,
  "rating": 5,
  "comment": "Alemayehu was absolutely fantastic! He arrived within an hour and fixed our kitchen drain quickly and professionally. Highly recommended!",
  "anonymous": false
}

Response:
json

{
  "success": true,
  "message": "Review submitted successfully",
  "data": {
    "review": {
      "id": 202,
      "rating": 5,
      "comment": "Alemayehu was absolutely fantastic...",
      "status": "approved",
      "createdAt": "2023-12-05T18:30:00.000Z"
    }
  },
  "gamification": {
    "pointsAwarded": 20,
    "achievement": "Review Submitted"
  }
}

Get Reviews
http

GET /reviews?revieweeId=123&rating=5&page=1&limit=10

Query Parameters:

    revieweeId (optional): User being reviewed

    authorId (optional): User writing review

    serviceId (optional): Service being reviewed

    rating (optional): Specific rating (1-5)

    minRating (optional): Minimum rating

    page (optional): Page number (default: 1)

    limit (optional): Results per page (default: 20)

Response:
json

{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": 202,
        "rating": 5,
        "comment": "Alemayehu was absolutely fantastic...",
        "author": {
          "name": "Meron Abebe",
          "avatar": "/images/avatars/meron.jpg"
        },
        "service": {
          "title": "Emergency Plumbing Repair"
        },
        "createdAt": "2023-12-05T18:30:00.000Z",
        "response": {
          "message": "Thank you for your kind words, Meron!",
          "respondedAt": "2023-12-06T09:15:00.000Z"
        }
      }
    ],
    "summary": {
      "averageRating": 4.8,
      "totalReviews": 89,
      "ratingDistribution": {
        "5": 67,
        "4": 18,
        "3": 3,
        "2": 1,
        "1": 0
      }
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 89,
      "pages": 9
    }
  }
}

Respond to Review
http

POST /reviews/{id}/respond

Request Body:
json

{
  "response": "Thank you for your kind words, Meron! I'm glad I could help with your plumbing issue."
}

Response:
json

{
  "success": true,
  "message": "Response added successfully",
  "data": {
    "review": {
      "id": 202,
      "response": "Thank you for your kind words, Meron!...",
      "respondedAt": "2023-12-06T09:15:00.000Z"
    }
  }
}

✅ Verifications Endpoints
Upload Fayda ID
http

POST /verifications/fayda
Content-Type: multipart/form-data

Form Data:

    document: File (image of Fayda ID)

    documentType: fayda_id

    documentNumber: ET123456789

Response:
json

{
  "success": true,
  "message": "Document verified successfully",
  "data": {
    "verification": {
      "id": 303,
      "documentType": "fayda_id",
      "status": "verified",
      "verifiedAt": "2023-12-01T10:00:00.000Z"
    },
    "result": {
      "verified": true,
      "confidenceScore": 0.98,
      "documentNumber": "ET123456789"
    }
  },
  "gamification": {
    "pointsAwarded": 50,
    "achievement": "Identity Verified"
  }
}

Selfie Verification
http

POST /verifications/selfie
Content-Type: multipart/form-data

Form Data:

    selfie: File (selfie image)

    verificationType: liveness

Response:
json

{
  "success": true,
  "message": "Selfie verification successful",
  "data": {
    "verification": {
      "id": 304,
      "documentType": "selfie",
      "status": "verified"
    },
    "result": {
      "verified": true,
      "confidenceScore": 0.96,
      "livenessScore": 0.94
    }
  },
  "gamification": {
    "pointsAwarded": 25,
    "achievement": "Selfie Verified"
  }
}

Upload Documents
http

POST /verifications/documents
Content-Type: multipart/form-data

Form Data:

    documents[]: Files (multiple documents)

    documentType: degree_certificate

    issuingAuthority: Addis Ababa University

    issueDate: 2020-06-30

    Response:
json

{
  "success": true,
  "message": "Documents uploaded successfully (2 verified)",
  "data": {
    "documents": [
      {
        "id": 305,
        "documentType": "degree_certificate",
        "status": "verified",
        "verifiedAt": "2023-12-01T11:00:00.000Z"
      },
      {
        "id": 306,
        "documentType": "professional_certificate",
        "status": "pending_review"
      }
    ],
    "summary": {
      "total": 2,
      "verified": 1,
      "pending": 1
    }
  },
  "gamification": {
    "pointsAwarded": 20,
    "achievement": "Documents Uploaded"
  }
}

Get Verification Status
http

GET /users/{id}/verifications

Response:
json

{
  "success": true,
  "data": {
    "verifications": [
      {
        "id": 303,
        "documentType": "fayda_id",
        "status": "verified",
        "verifiedAt": "2023-12-01T10:00:00.000Z",
        "confidenceScore": 0.98
      },
      {
        "id": 304,
        "documentType": "selfie",
        "status": "verified",
        "verifiedAt": "2023-12-01T10:15:00.000Z",
        "confidenceScore": 0.96
      }
    ],
    "overallStatus": "verified",
    "trustScore": 92,
    "nextSteps": ["upload_portfolio", "complete_profile"]
  }
}

🎨 Portfolio Endpoints
Upload Portfolio Item
http

POST /portfolio
Content-Type: multipart/form-data

Form Data:

    images[]: Files (portfolio images)

    title: Modern Bathroom Installation

    description: Complete bathroom renovation with modern fixtures

    category: plumbing

    tags[]: bathroom, renovation, modern

    isPublic: true

Response:
json

{
  "success": true,
  "message": "Portfolio items uploaded successfully",
  "data": {
    "portfolioItems": [
      {
        "id": 404,
        "title": "Modern Bathroom Installation",
        "description": "Complete bathroom renovation with modern fixtures",
        "imageUrl": "/images/portfolio/bathroom-1.jpg",
        "category": "plumbing",
        "qualityScore": 4.8,
        "isPublic": true
      }
    ],
    "summary": {
      "total": 1,
      "categories": ["plumbing"],
      "averageQualityScore": 4.8
    }
  },
  "gamification": {
    "pointsAwarded": 15,
    "achievement": "Portfolio Enhanced"
  }
}

Get Portfolio
http

GET /users/{id}/portfolio?category=plumbing&page=1&limit=10

Query Parameters:

    category (optional): Filter by category

    isPublic (optional): true/false

    page (optional): Page number (default: 1)

    limit (optional): Results per page (default: 20)

Response:
json

{
  "success": true,
  "data": {
    "portfolio": [
      {
        "id": 404,
        "title": "Modern Bathroom Installation",
        "description": "Complete bathroom renovation with modern fixtures",
        "imageUrl": "/images/portfolio/bathroom-1.jpg",
        "thumbnailUrl": "/images/portfolio/bathroom-1-thumb.jpg",
        "category": "plumbing",
        "tags": ["bathroom", "renovation", "modern"],
        "qualityScore": 4.8,
        "isPublic": true,
        "createdAt": "2023-08-20T09:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "pages": 2
    }
  }
}

Update Portfolio Item
http

PUT /portfolio/{id}

Request Body:
json

{
  "title": "Updated Portfolio Title",
  "description": "Updated description",
  "category": "renovation",
  "tags": ["updated", "tags"],
  "isPublic": true
}

Response:
json

{
  "success": true,
  "message": "Portfolio item updated successfully",
  "data": {
    "portfolioItem": {
      "id": 404,
      "title": "Updated Portfolio Title",
      "category": "renovation"
    }
  }
}

Delete Portfolio Item
http

DELETE /portfolio/{id}

Response:
json

{
  "success": true,
  "message": "Portfolio item deleted successfully"
}

🎪 Gamification Endpoints
Get User Profile
http

GET /gamification/profile

Response:
json

{
  "success": true,
  "data": {
    "userId": 123,
    "totalPoints": 4500,
    "availablePoints": 1200,
    "level": 5,
    "experience": 4500,
    "nextLevel": {
      "level": 6,
      "pointsRequired": 5200,
      "pointsNeeded": 700,
      "progress": 86.5
    },
    "currentStreak": 45,
    "longestStreak": 67,
    "achievements": [
      {
        "id": "verified_pro",
        "name": "Verified Professional",
        "description": "Completed all verification steps",
        "earnedAt": "2023-02-15T14:30:00.000Z",
        "icon": "verified",
        "rarity": "rare"
      }
    ],
    "badges": [
      {
        "id": "quick_responder",
        "name": "Quick Responder",
        "description": "Maintains 95%+ response rate",
        "earnedAt": "2023-03-10T10:15:00.000Z",
        "icon": "quick-response",
        "rarity": "rare"
      }
    ],
    "stats": {
      "challengesCompleted": 18,
      "rewardsRedeemed": 8,
      "pointsByCategory": {
        "engagement": 1200,
        "completion": 2500,
        "quality": 600,
        "social": 150,
        "verification": 50
      }
    }
  }
}

Get Leaderboard
http

GET /gamification/leaderboard?type=weekly&category=providers&limit=20

Query Parameters:

    type (optional): weekly, monthly, all_time (default: weekly)

    category (optional): providers, clients, all (default: all)

    limit (optional): Number of results (default: 20)

Response:
json

{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": 123,
        "name": "Alemayehu Tekalign",
        "avatar": "/images/avatars/alemayehu.jpg",
        "points": 4500,
        "level": 5,
        "badges": ["verified_pro", "quick_responder"],
        "change": "+2"  // rank change from previous period
      },
      {
        "rank": 2,
        "userId": 124,
        "name": "Helen Girma",
        "avatar": "/images/avatars/helen.jpg",
        "points": 4200,
        "level": 4,
        "badges": ["verified_pro"],
        "change": "-1"
      }
    ],
    "currentUser": {
      "rank": 1,
      "points": 4500,
      "level": 5
    },
    "period": {
      "type": "weekly",
      "startDate": "2023-11-27",
      "endDate": "2023-12-03"
    }
  }
}

Get Active Challenges
http

GET /gamification/challenges/active

Response:
json

{
  "success": true,
  "data": {
    "challenges": [
      {
        "id": "c1a1e1f1-1a1b-1c1d-1e1f-1a1b1c1d1e1f",
        "title": "Complete Your Profile",
        "description": "Add your profile picture, bio, and skills",
        "category": "onboarding",
        "difficulty": "easy",
        "pointsReward": 50,
        "progress": {
          "completed": 2,
          "total": 3,
          "percentage": 66.7
        },
        "timeRemaining": null,
        "metadata": {
          "icon": "profile",
          "color": "blue"
        }
      },
      {
        "id": "c4a4e4f4-4a4b-4c4d-4e4f-4a4b4c4d4e4f",
        "title": "Weekly Streak",
        "description": "Use Yachi for 7 consecutive days",
        "category": "engagement",
        "difficulty": "medium",
        "pointsReward": 150,
        "progress": {
          "completed": 5,
          "total": 7,
          "percentage": 71.4
        },
        "timeRemaining": "2 days",
        "metadata": {
          "icon": "streak",
          "color": "orange"
        }
      }
    ]
  }
}

Complete Challenge
http

POST /gamification/challenges/complete

Request Body:
json

{
  "challengeId": "c1a1e1f1-1a1b-1c1d-1e1f-1a1b1c1d1e1f",
  "evidence": {
    "profileCompleted": true
  }
}

Response:
json

{
  "success": true,
  "message": "Challenge 'Complete Your Profile' completed!",
  "data": {
    "challenge": {
      "id": "c1a1e1f1-1a1b-1c1d-1e1f-1a1b1c1d1e1f",
      "title": "Complete Your Profile",
      "pointsEarned": 50
    },
    "userProgress": {
      "totalPoints": 4550,
      "level": 5,
      "experience": 4550
    }
  },
  "gamification": {
    "pointsEarned": 50,
    "achievementsUnlocked": ["profile_completion"],
    "nextChallenge": "c2a2e2f2-2a2b-2c2d-2e2f-2a2b2c2d2e2f"
  }
}

Get Available Rewards
http

GET /gamification/rewards/available

Response:
json

{
  "success": true,
  "data": {
    "rewards": [
      {
        "id": "r1a1e1f1-1a1b-1c1d-1e1f-1a1b1c1d1e1f",
        "name": "10% Service Discount",
        "description": "Get 10% off your next service booking",
        "type": "discount",
        "pointsCost": 500,
        "quantityAvailable": 1000,
        "maxPerUser": 3,
        "metadata": {
          "discountType": "percentage",
          "discountValue": 10,
          "validDays": 30,
          "icon": "discount"
        }
      },
      {
        "id": "r2a2e2f2-2a2b-2c2d-2e2f-2a2b2c2d2e2f",
        "name": "Verified Pro Badge",
        "description": "Exclusive verified professional badge",
        "type": "badge",
        "pointsCost": 1000,
        "quantityAvailable": null,
        "maxPerUser": 1,
        "metadata": {
          "badgeType": "verified_pro",
          "rarity": "epic",
          "icon": "verified_badge"
        }
      }
    ]
  }
}

Redeem Reward
http

POST /gamification/rewards/redeem

Request Body:
json

{
  "rewardId": "r1a1e1f1-1a1b-1c1d-1e1f-1a1b1c1d1e1f",
  "quantity": 1
}

Response:
json

{
  "success": true,
  "message": "Successfully redeemed 10% Service Discount",
  "data": {
    "reward": {
      "id": "r1a1e1f1-1a1b-1c1d-1e1f-1a1b1c1d1e1f",
      "name": "10% Service Discount",
      "pointsSpent": 500
    },
    "userBalance": {
      "totalPoints": 4050,
      "availablePoints": 700
    }
  },
  "metadata": {
    "pointsBalance": 700,
    "deliveryEstimate": "immediate",
    "redemptionCode": "DISC10-ABC123"
  }
}

📁 Uploads Endpoints
Upload Profile Image
http

POST /uploads/profile-image
Content-Type: multipart/form-data

Form Data:

    image: File (profile image)

    type: avatar (or cover)

    cropData: Optional cropping data

Response:
json

{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "image": {
      "url": "/images/avatars/user123.jpg",
      "thumbnailUrl": "/images/avatars/user123-thumb.jpg",
      "size": 204800
    },
    "type": "avatar"
  },
  "metadata": {
    "originalSize": 512000,
    "processedSize": 204800,
    "optimization": "60% reduction"
  }
}

Upload Portfolio Images
http

POST /uploads/portfolio
Content-Type: multipart/form-data

Form Data:

    images[]: Files (multiple images)

    title: Project Title

    description: Project description

    category: plumbing

    tags[]: renovation, modern

Response:
json

{
  "success": true,
  "message": "Portfolio items uploaded successfully",
  "data": {
    "portfolioItems": [
      {
        "url": "/images/portfolio/project1-1.jpg",
        "thumbnailUrl": "/images/portfolio/project1-1-thumb.jpg",
        "title": "Project Title",
        "category": "plumbing"
      }
    ],
    "summary": {
      "total": 3,
      "successful": 3,
      "failed": 0
    }
  }
}

Upload Documents
http

POST /uploads/documents
Content-Type: multipart/form-data

Form Data:

    documents[]: Files (multiple documents)

    documentType: degree_certificate

    issuingAuthority: Addis Ababa University

Response:
json

{
  "success": true,
  "message": "Documents uploaded successfully",
  "data": {
    "documents": [
      {
        "url": "/images/documents/degree-123.jpg",
        "originalName": "degree_certificate.pdf",
        "size": 1024000,
        "documentType": "degree_certificate"
      }
    ],
    "validationSummary": {
      "total": 2,
      "verified": 1,
      "pending": 1
    }
  }
}

Bulk Upload
http

POST /uploads/bulk-upload
Content-Type: multipart/form-data

Form Data:

    files[]: Files (multiple files)

    maxFiles: 10

    compressQuality: 0.8

Response:
json

{
  "success": true,
  "message": "Bulk upload completed",
  "data": {
    "batchId": "batch_123456789",
    "results": [
      {
        "originalName": "image1.jpg",
        "status": "success",
        "result": {
          "url": "/images/uploads/image1.jpg",
          "size": 204800
        }
      },
      {
        "originalName": "document.pdf",
        "status": "error",
        "error": "File type not supported"
      }
    ],
    "summary": {
      "total": 5,
      "successful": 4,
      "failed": 1
    }
  }
}

⚙️ Admin Endpoints

Note: Admin endpoints require special permissions
Get Platform Statistics
http

GET /admin/statistics

Response:
json

{
  "success": true,
  "data": {
    "users": {
      "total": 12500,
      "active": 8900,
      "providers": 4500,
      "clients": 8000,
      "growth": 15.2
    },
    "services": {
      "total": 8500,
      "active": 7200,
      "categories": {
        "construction": 2500,
        "home_services": 1800,
        "technology": 1200
      }
    },
    "bookings": {
      "total": 45600,
      "completed": 41200,
      "cancelled": 3200,
      "revenue": 12500000.00
    },
    "reviews": {
      "total": 38900,
      "averageRating": 4.7,
      "responseRate": 68.5
    }
  }
}

Get User Management
http

GET /admin/users?role=provider&status=active&page=1&limit=20

Response:
json

{
  "success": true,
  "data": {
    "users": [
      {
        "id": 123,
        "email": "user@example.com",
        "firstName": "Alemayehu",
        "lastName": "Tekalign",
        "role": "provider",
        "status": "active",
        "verificationStatus": "verified",
        "rating": 4.8,
        "completedJobs": 234,
        "joinedAt": "2023-01-15T08:30:00.000Z",
        "lastLogin": "2023-12-01T14:20:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 4500,
      "pages": 225
    }
  }
}

Update User Status
http

PATCH /admin/users/{id}/status

Request Body:
json

{
  "status": "suspended",
  "reason": "Multiple policy violations",
  "suspensionUntil": "2024-01-01T00:00:00.000Z"
}

Response:
json

{
  "success": true,
  "message": "User status updated to suspended",
  "data": {
    "user": {
      "id": 123,
      "status": "suspended",
      "suspensionReason": "Multiple policy violations",
      "suspensionUntil": "2024-01-01T00:00:00.000Z"
    }
  }
}

🔔 Webhooks

Yachi provides webhooks to notify your application of important events.
Webhook Events

    user.registered - New user registration

    booking.created - New booking created

    booking.confirmed - Booking confirmed by provider

    booking.completed - Booking completed

    payment.completed - Payment successfully processed

    review.created - New review submitted

    verification.completed - User verification completed

Webhook Payload Example
json

{
  "event": "booking.created",
  "timestamp": "2023-12-04T14:30:00.000Z",
  "data": {
    "booking": {
      "id": 789,
      "status": "pending",
      "scheduledDate": "2023-12-05T10:00:00.000Z",
      "totalAmount": 543.38,
      "currency": "ETB"
    },
    "client": {
      "id": 6,
      "name": "Meron Abebe",
      "email": "meron@example.com"
    },
    "provider": {
      "id": 123,
      "name": "Alemayehu Tekalign",
      "email": "alemayehu@example.com"
    }
  }
}

Webhook Configuration

To set up webhooks, contact api-support@yachi.com with:

    Your webhook endpoint URL

    Events you want to subscribe to

    Authentication method (API key, JWT, etc.)

📝 Changelog
v1.0.0 (2023-12-01)

    Initial API release

    User authentication and management

    Service creation and search

    Booking system

    Payment processing

    Review system

    Verification workflows

    Gamification features

    File uploads

    Admin dashboard

Upcoming Features

    Real-time messaging

    Advanced analytics

    Mobile money integration

    Multi-language support

    Advanced search filters

    Service packages and subscriptions

📞 Support

For API support and questions:

    Email: api-support@yachi.com

    Documentation: https://docs.yachi.com

    Status: https://status.yachi.com

    GitHub: https://github.com/yachi-platform/api

📄 License

This API is proprietary and owned by Yachi Technologies PLC. Unauthorized use is prohibited.

