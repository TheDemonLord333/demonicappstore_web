'use strict';

const categoryService = require('../services/categoryService');
const asyncHandler = require('../utils/asyncHandler');

const listCategories = asyncHandler(async (req, res) => {
  res.json(categoryService.listCategories());
});

const createCategory = asyncHandler(async (req, res) => {
  const category = categoryService.createCategory(req.body);
  res.status(201).json(category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = categoryService.updateCategory(req.params.slug, req.body);
  res.json(category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  categoryService.deleteCategory(req.params.slug);
  res.status(204).send();
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
