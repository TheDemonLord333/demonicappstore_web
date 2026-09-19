'use strict';

const express = require('express');
const controller = require('../controllers/categoriesController');

const router = express.Router();

router.get('/', controller.listCategories);

module.exports = router;
