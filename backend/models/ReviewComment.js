module.exports = (sequelize) => {
  const ReviewComment = sequelize.define('ReviewComment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ratingId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'ratings', key: 'id' }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 1000]
      }
    },
    parentCommentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'review_comments', key: 'id' }
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'review_comments',
    timestamps: true
  });

  return ReviewComment;
};