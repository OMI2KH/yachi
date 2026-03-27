const crypto = require('crypto');
const axios = require('axios');
const https = require('https');

class TeleBirrService {
  constructor(config) {
    this.config = {
      baseUrl: config.baseUrl || 'https://api.telebirr.com',
      appId: config.appId,
      appKey: config.appKey,
      publicKey: config.publicKey,
      privateKey: config.privateKey,
      notifyUrl: config.notifyUrl,
      returnUrl: config.returnUrl,
      timeout: config.timeout || 30000,
      merchantCode: config.merchantCode,
      merchantName: config.merchantName,
    };

    // 创建带自定义配置的axios实例
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false, // 根据实际情况调整
      }),
    });

    // 初始化RSA加解密
    this.initRSA();
  }

  /**
   * 初始化RSA加密
   */
  initRSA() {
    try {
      const NodeRSA = require('node-rsa');
      this.rsa = new NodeRSA();
      this.rsa.importKey(this.config.publicKey, 'pkcs8-public-pem');
    } catch (error) {
      console.error('Failed to initialize RSA:', error);
      throw error;
    }
  }

  /**
   * 生成签名
   * @param {Object} data - 待签名数据
   * @returns {string} 签名
   */
  generateSignature(data) {
    const signStr = Object.keys(data)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('&');
    
    return crypto
      .createHmac('sha256', this.config.appKey)
      .update(signStr)
      .digest('hex')
      .toUpperCase();
  }

  /**
   * RSA加密
   * @param {string} data - 待加密数据
   * @returns {string} 加密后的Base64字符串
   */
  rsaEncrypt(data) {
    try {
      const encrypted = this.rsa.encrypt(data, 'base64');
      return encrypted;
    } catch (error) {
      console.error('RSA encryption failed:', error);
      throw new Error('RSA encryption failed');
    }
  }

  /**
   * 生成订单号
   * @returns {string} 订单号
   */
  generateOrderNo() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `TB${timestamp}${random.toString().padStart(4, '0')}`;
  }

  /**
   * 创建支付订单
   * @param {Object} orderData - 订单数据
   * @returns {Promise<Object>} 支付响应
   */
  async createPayment(orderData) {
    try {
      const {
        amount,
        subject,
        body,
        outTradeNo = this.generateOrderNo(),
        currency = 'ETB',
        extra = {},
      } = orderData;

      // 验证金额
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount');
      }

      // 构造请求参数
      const requestData = {
        appId: this.config.appId,
        outTradeNo,
        subject: subject || 'TeleBirr Payment',
        body: body || '',
        totalAmount: amount.toFixed(2),
        currency,
        notifyUrl: this.config.notifyUrl,
        returnUrl: this.config.returnUrl,
        merchantCode: this.config.merchantCode,
        merchantName: this.config.merchantName,
        timestamp: Date.now(),
        nonceStr: this.generateNonceStr(),
        ...extra,
      };

      // 生成签名
      const sign = this.generateSignature(requestData);
      requestData.sign = sign;

      // RSA加密敏感数据
      const encryptedData = this.rsaEncrypt(JSON.stringify({
        totalAmount: requestData.totalAmount,
        currency: requestData.currency,
        outTradeNo: requestData.outTradeNo,
      }));

      // 构造最终请求
      const payload = {
        ...requestData,
        encryptedData,
      };

      // 发送请求
      const response = await this.client.post('/v1/payment/create', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      return this.handleResponse(response.data);
    } catch (error) {
      console.error('Create payment error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 查询订单状态
   * @param {string} outTradeNo - 商户订单号
   * @returns {Promise<Object>} 订单状态
   */
  async queryOrder(outTradeNo) {
    try {
      const requestData = {
        appId: this.config.appId,
        outTradeNo,
        timestamp: Date.now(),
        nonceStr: this.generateNonceStr(),
      };

      const sign = this.generateSignature(requestData);
      requestData.sign = sign;

      const response = await this.client.post('/v1/payment/query', requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return this.handleResponse(response.data);
    } catch (error) {
      console.error('Query order error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 退款
   * @param {Object} refundData - 退款数据
   * @returns {Promise<Object>} 退款结果
   */
  async refund(refundData) {
    try {
      const {
        outTradeNo,
        refundAmount,
        refundReason,
        outRefundNo = this.generateOrderNo(),
      } = refundData;

      const requestData = {
        appId: this.config.appId,
        outTradeNo,
        outRefundNo,
        refundAmount: refundAmount.toFixed(2),
        refundReason: refundReason || 'Refund',
        timestamp: Date.now(),
        nonceStr: this.generateNonceStr(),
      };

      const sign = this.generateSignature(requestData);
      requestData.sign = sign;

      // RSA加密退款金额
      const encryptedData = this.rsaEncrypt(JSON.stringify({
        refundAmount: requestData.refundAmount,
      }));

      const payload = {
        ...requestData,
        encryptedData,
      };

      const response = await this.client.post('/v1/payment/refund', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return this.handleResponse(response.data);
    } catch (error) {
      console.error('Refund error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 验证回调签名
   * @param {Object} callbackData - 回调数据
   * @returns {boolean} 签名是否有效
   */
  verifyCallbackSignature(callbackData) {
    try {
      const { sign, ...dataWithoutSign } = callbackData;
      const calculatedSign = this.generateSignature(dataWithoutSign);
      return calculatedSign === sign;
    } catch (error) {
      console.error('Verify signature error:', error);
      return false;
    }
  }

  /**
   * 处理支付回调
   * @param {Object} callbackData - 回调数据
   * @returns {Object} 处理结果
   */
  handlePaymentCallback(callbackData) {
    try {
      // 验证签名
      if (!this.verifyCallbackSignature(callbackData)) {
        throw new Error('Invalid signature');
      }

      const {
        outTradeNo,
        tradeNo,
        totalAmount,
        currency,
        tradeStatus,
        payTime,
        buyerId,
        buyerAccount,
      } = callbackData;

      return {
        success: tradeStatus === 'SUCCESS',
        data: {
          outTradeNo,
          tradeNo,
          totalAmount: parseFloat(totalAmount),
          currency,
          tradeStatus,
          payTime: new Date(payTime),
          buyerId,
          buyerAccount,
          rawData: callbackData,
        },
      };
    } catch (error) {
      console.error('Handle callback error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 生成随机字符串
   * @param {number} length - 字符串长度
   * @returns {string} 随机字符串
   */
  generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 处理API响应
   * @param {Object} response - API响应
   * @returns {Object} 处理后的数据
   */
  handleResponse(response) {
    if (response.code !== 'SUCCESS') {
      throw new Error(response.message || response.msg || 'TeleBirr API error');
    }
    return response.data || response;
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @returns {Error} 处理后的错误
   */
  handleError(error) {
    if (error.response) {
      // API返回错误
      const { status, data } = error.response;
      return new Error(`TeleBirr API Error ${status}: ${JSON.stringify(data)}`);
    } else if (error.request) {
      // 请求发送失败
      return new Error('No response received from TeleBirr API');
    } else {
      // 其他错误
      return error;
    }
  }

  /**
   * 关闭订单
   * @param {string} outTradeNo - 商户订单号
   * @returns {Promise<Object>} 关闭结果
   */
  async closeOrder(outTradeNo) {
    try {
      const requestData = {
        appId: this.config.appId,
        outTradeNo,
        timestamp: Date.now(),
        nonceStr: this.generateNonceStr(),
      };

      const sign = this.generateSignature(requestData);
      requestData.sign = sign;

      const response = await this.client.post('/v1/payment/close', requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return this.handleResponse(response.data);
    } catch (error) {
      console.error('Close order error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 下载对账单
   * @param {string} billDate - 账单日期 YYYYMMDD
   * @param {string} billType - 账单类型
   * @returns {Promise<Object>} 对账单数据
   */
  async downloadBill(billDate, billType = 'ALL') {
    try {
      const requestData = {
        appId: this.config.appId,
        billDate,
        billType,
        timestamp: Date.now(),
        nonceStr: this.generateNonceStr(),
      };

      const sign = this.generateSignature(requestData);
      requestData.sign = sign;

      const response = await this.client.post('/v1/payment/downloadBill', requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
        responseType: 'stream', // 对于大文件使用流
      });

      return response.data;
    } catch (error) {
      console.error('Download bill error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 验证webhook签名
   * @param {string} signature - 签名
   * @param {Object} payload - 请求体
   * @returns {boolean} 是否有效
   */
  verifyWebhookSignature(signature, payload) {
    const payloadString = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', this.config.appKey)
      .update(payloadString)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * 获取支付二维码URL（如果支持）
   * @param {Object} paymentResult - 支付结果
   * @returns {string|null} 二维码URL
   */
  getQrCodeUrl(paymentResult) {
    // TeleBirr通常返回支付URL，这里可以根据实际API响应调整
    return paymentResult.qrCodeUrl || paymentResult.codeUrl || null;
  }

  /**
   * 检查服务状态
   * @returns {Promise<boolean>} 服务是否可用
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

module.exports = TeleBirrService;