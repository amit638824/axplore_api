/**
 * State Routes
 * CRUD for Master State
 */

const express = require('express');
const router = express.Router();
const stateController = require('../controllers/state.controller');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { queryStateSchema, createStateSchema, updateStateSchema } = require('../validators/state.validator');

router.use(authenticate);

router.get('/', validate(queryStateSchema, 'query'), stateController.getStates);
router.get('/:stateId', stateController.getStateById);
router.post('/add/', validate(createStateSchema), stateController.createState);
router.put('/update/:stateId', validate(updateStateSchema), stateController.updateState);
router.delete('/:stateId', stateController.deleteState);

module.exports = router;
