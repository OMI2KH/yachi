export const validateServiceForm = (data) => {
  const errors = {};

  // Title validation
  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Title is required and must be at least 3 characters';
  }

  // Price validation
  if (!data.price || isNaN(data.price) || Number(data.price) <= 0) {
    errors.price = 'Price must be a positive number';
  }

  // Category validation
  if (!data.category || !data.category.trim()) {
    errors.category = 'Category is required';
  }

  // Description validation (optional)
  if (data.description && data.description.trim().length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }

  return errors;
};
