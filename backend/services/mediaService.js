const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { YachiAI } = require('./yachiAI');

class MediaService {
  constructor() {
    this.uploadDirs = {
      profiles: 'uploads/profiles',
      portfolios: 'uploads/portfolios',
      documents: 'uploads/documents',
      services: 'uploads/services',
      temp: 'uploads/temp'
    };

    this.initDirs();
  }

  async initDirs() {
    for (const dir of Object.values(this.uploadDirs)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async processProfileImage({ file, userId, type, cropData }) {
    const filename = `profile_${userId}_${uuidv4()}.webp`;
    const filepath = path.join(this.uploadDirs.profiles, filename);

    let image = sharp(file.buffer);

    // 🎯 Apply cropping if provided
    if (cropData) {
      image = image.extract({
        left: Math.round(cropData.x),
        top: Math.round(cropData.y),
        width: Math.round(cropData.width),
        height: Math.round(cropData.height)
      });
    }

    // 🖼️ Optimize based on type
    const optimization = type === 'avatar' ? 
      { width: 300, height: 300, fit: 'cover' } : 
      { width: 1200, height: 400, fit: 'cover' };

    // 💾 Save main image
    await image
      .resize(optimization)
      .webp({ quality: 80 })
      .toFile(filepath);

    // 💾 Create thumbnail for avatars
    let thumbnailUrl = null;
    if (type === 'avatar') {
      const thumbFilename = `thumb_${filename}`;
      const thumbPath = path.join(this.uploadDirs.profiles, thumbFilename);
      
      await sharp(file.buffer)
        .resize(100, 100, { fit: 'cover' })
        .webp({ quality: 60 })
        .toFile(thumbPath);

      thumbnailUrl = `/api/uploads/profiles/${thumbFilename}`;
    }

    return {
      url: `/api/uploads/profiles/${filename}`,
      thumbnailUrl,
      size: (await fs.stat(filepath)).size,
      metadata: {
        originalName: file.originalname,
        originalSize: file.size,
        processingTime: Date.now(),
        type,
        optimization: 'webp_80'
      }
    };
  }

  async processPortfolioItem({ file, userId, title, description, category }) {
    const filename = `portfolio_${userId}_${uuidv4()}.webp`;
    const filepath = path.join(this.uploadDirs.portfolios, filename);

    // 🖼️ Process portfolio image
    await sharp(file.buffer)
      .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(filepath);

    // 💾 Create thumbnail
    const thumbFilename = `thumb_${filename}`;
    const thumbPath = path.join(this.uploadDirs.portfolios, thumbFilename);
    
    await sharp(file.buffer)
      .resize(400, 300, { fit: 'cover' })
      .webp({ quality: 70 })
      .toFile(thumbPath);

    // 🎯 AI Analysis for portfolio enhancement
    const aiAnalysis = await YachiAI.analyzePortfolioImage({
      imageUrl: `/api/uploads/portfolios/${filename}`,
      title,
      description,
      category
    });

    return {
      url: `/api/uploads/portfolios/${filename}`,
      thumbnailUrl: `/api/uploads/portfolios/${thumbFilename}`,
      size: (await fs.stat(filepath)).size,
      metadata: {
        originalName: file.originalname,
        originalSize: file.size,
        title,
        description,
        category,
        aiEnhanced: aiAnalysis.enhanced
      },
      aiAnalysis,
      qualityScore: aiAnalysis.qualityScore
    };
  }

  async processVerificationDocument({ file, userId, documentType }) {
    const extension = path.extname(file.originalname) || '.pdf';
    const filename = `doc_${userId}_${uuidv4()}${extension}`;
    const filepath = path.join(this.uploadDirs.documents, filename);

    // 💾 Save document
    await fs.writeFile(filepath, file.buffer);

    // 🎯 Additional processing for images
    if (file.mimetype.startsWith('image/')) {
      const optimizedPath = filepath.replace(extension, '.webp');
      await sharp(file.buffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toFile(optimizedPath);

      // 🗑️ Remove original if WebP created
      await fs.unlink(filepath);
      
      return {
        url: `/api/uploads/documents/${path.basename(optimizedPath)}`,
        size: (await fs.stat(optimizedPath)).size,
        metadata: {
          originalName: file.originalname,
          originalSize: file.size,
          documentType,
          optimized: true
        }
      };
    }

    return {
      url: `/api/uploads/documents/${filename}`,
      size: file.size,
      metadata: {
        originalName: file.originalname,
        originalSize: file.size,
        documentType
      }
    };
  }

  async deleteFile(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      await fs.unlink(fullPath);
      
      // 🗑️ Also delete thumbnail if exists
      const thumbPath = fullPath.replace(/(\.[\w\d]+)$/, '_thumb$1');
      try {
        await fs.unlink(thumbPath);
      } catch (error) {
        // Thumbnail might not exist
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

module.exports = new MediaService();