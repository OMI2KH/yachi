// backend/migrations/20251222_add_webhook_event_fields.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 🔧 Add webhook event columns to Transaction table
      await queryInterface.addColumn('Transactions', 'webhookEventId', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Unique ID from webhook event'
      }, { transaction });

      await queryInterface.addColumn('Transactions', 'webhookPayload', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Raw webhook payload received'
      }, { transaction });

      await queryInterface.addColumn('Transactions', 'webhookStatus', {
        type: Sequelize.ENUM('pending', 'received', 'processed', 'failed'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Status of webhook processing'
      }, { transaction });

      await queryInterface.addColumn('Transactions', 'webhookProcessedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When webhook was processed'
      }, { transaction });

      // 🎯 Add webhook event columns to PaymentLogs table
      const paymentLogsExists = await queryInterface.describeTable('PaymentLogs')
        .then(() => true)
        .catch(() => false);

      if (paymentLogsExists) {
        await queryInterface.addColumn('PaymentLogs', 'webhookEventId', {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Unique ID from webhook event'
        }, { transaction });

        await queryInterface.addColumn('PaymentLogs', 'webhookPayload', {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Raw webhook payload received'
        }, { transaction });

        await queryInterface.addColumn('PaymentLogs', 'isWebhookEvent', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
          comment: 'Whether this log entry is from webhook'
        }, { transaction });
      }

      // 📊 Create WebhookEvents table for tracking all webhook events
      await queryInterface.createTable('WebhookEvents', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        eventId: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
          comment: 'Unique event ID from provider'
        },
        eventType: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'Type of webhook event'
        },
        source: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'Source of webhook (mpesa, stripe, etc)'
        },
        payload: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Raw webhook payload'
        },
        status: {
          type: Sequelize.ENUM('received', 'processing', 'processed', 'failed', 'retry'),
          defaultValue: 'received',
          allowNull: false
        },
        processingAttempts: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        errorMessage: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        relatedTransactionId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Transactions',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        relatedUserId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        processedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // 📈 Create indexes for better performance
      await queryInterface.addIndex('WebhookEvents', ['eventId'], {
        unique: true,
        transaction
      });

      await queryInterface.addIndex('WebhookEvents', ['eventType'], {
        transaction
      });

      await queryInterface.addIndex('WebhookEvents', ['source'], {
        transaction
      });

      await queryInterface.addIndex('WebhookEvents', ['status'], {
        transaction
      });

      await queryInterface.addIndex('WebhookEvents', ['createdAt'], {
        transaction
      });

      await queryInterface.addIndex('Transactions', ['webhookEventId'], {
        transaction
      });

      await queryInterface.addIndex('Transactions', ['webhookStatus'], {
        transaction
      });

      if (paymentLogsExists) {
        await queryInterface.addIndex('PaymentLogs', ['webhookEventId'], {
          transaction
        });
      }

      // 🗂️ Create WebhookConfigurations table for dynamic webhook config
      await queryInterface.createTable('WebhookConfigurations', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        provider: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'Payment provider (mpesa, stripe, etc)'
        },
        endpointUrl: {
          type: Sequelize.STRING(500),
          allowNull: false,
          comment: 'Our endpoint URL for this provider'
        },
        secretKey: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Webhook secret for verification'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false
        },
        supportedEvents: {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: false,
          defaultValue: [],
          comment: 'Array of supported event types'
        },
        retryConfig: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Retry configuration for failed webhooks'
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        lastTriggeredAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        totalEvents: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        failedEvents: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      await queryInterface.addIndex('WebhookConfigurations', ['provider'], {
        unique: true,
        transaction
      });

      // 📝 Insert default webhook configurations
      await queryInterface.bulkInsert('WebhookConfigurations', [
        {
          id: Sequelize.UUIDV4(),
          provider: 'mpesa',
          endpointUrl: '/api/v1/webhooks/mpesa',
          secretKey: process.env.MPESA_WEBHOOK_SECRET || 'default_mpesa_secret',
          isActive: true,
          supportedEvents: [
            'payment_completed',
            'payment_failed',
            'payment_reversed',
            'customer_credited'
          ],
          retryConfig: {
            maxRetries: 3,
            retryDelay: 5000,
            backoffFactor: 2
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: Sequelize.UUIDV4(),
          provider: 'stripe',
          endpointUrl: '/api/v1/webhooks/stripe',
          secretKey: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_default',
          isActive: false,
          supportedEvents: [
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'charge.refunded',
            'customer.subscription.created'
          ],
          retryConfig: {
            maxRetries: 5,
            retryDelay: 3000,
            backoffFactor: 1.5
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ], { transaction });

      await transaction.commit();
      console.log('✅ Migration completed: Added webhook event fields');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 🔽 Remove webhook event columns from Transaction table
      await queryInterface.removeColumn('Transactions', 'webhookEventId', { transaction });
      await queryInterface.removeColumn('Transactions', 'webhookPayload', { transaction });
      await queryInterface.removeColumn('Transactions', 'webhookStatus', { transaction });
      await queryInterface.removeColumn('Transactions', 'webhookProcessedAt', { transaction });

      // 🔽 Remove webhook event columns from PaymentLogs table
      const paymentLogsExists = await queryInterface.describeTable('PaymentLogs')
        .then(() => true)
        .catch(() => false);

      if (paymentLogsExists) {
        await queryInterface.removeColumn('PaymentLogs', 'webhookEventId', { transaction });
        await queryInterface.removeColumn('PaymentLogs', 'webhookPayload', { transaction });
        await queryInterface.removeColumn('PaymentLogs', 'isWebhookEvent', { transaction });
      }

      // 🗑️ Drop WebhookConfigurations table
      await queryInterface.dropTable('WebhookConfigurations', { transaction });

      // 🗑️ Drop WebhookEvents table
      await queryInterface.dropTable('WebhookEvents', { transaction });

      await transaction.commit();
      console.log('✅ Migration rolled back: Removed webhook event fields');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};