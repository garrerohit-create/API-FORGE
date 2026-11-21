import express from 'express';
import { StudentService } from '../services/studentService.js';
import { seedDemoData } from '../database/seeds/001_demo_seed.js';

const router = express.Router();

// List students (with optional query filters: department, search, page, limit)
router.get('/', (req, res) => {
  const result = StudentService.getAllStudents(req.query);
  res.json(result);
});

// Get student by ID
router.get('/:id', (req, res) => {
  const student = StudentService.getStudentById(req.params.id);
  if (!student) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Student with ID ${req.params.id} does not exist.` }
    });
  }
  res.json({ success: true, data: student });
});

// Create student
router.post('/', (req, res, next) => {
  try {
    const { name, email, department, year } = req.body;
    if (!name || !email || !department || !year) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email, department, and year are required.' }
      });
    }

    const created = StudentService.createStudent({ name, email, department, year });
    res.status(201).json({ success: true, data: created, message: 'Student created successfully.' });
  } catch (err) {
    next(err);
  }
});

// Replace student (PUT)
router.put('/:id', (req, res, next) => {
  try {
    const { name, email, department, year } = req.body;
    if (!name || !email || !department || !year) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Complete student object (name, email, department, year) is required for PUT.' }
      });
    }

    const updated = StudentService.updateStudent(req.params.id, { name, email, department, year });
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Student with ID ${req.params.id} does not exist.` }
      });
    }

    res.json({ success: true, data: updated, message: 'Student replaced successfully.' });
  } catch (err) {
    next(err);
  }
});

// Partial update student (PATCH)
router.patch('/:id', (req, res, next) => {
  try {
    const updated = StudentService.patchStudent(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Student with ID ${req.params.id} does not exist.` }
      });
    }

    res.json({ success: true, data: updated, message: 'Student updated successfully.' });
  } catch (err) {
    next(err);
  }
});

// Delete student (DELETE)
router.delete('/:id', (req, res) => {
  const deleted = StudentService.deleteStudent(req.params.id);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Student with ID ${req.params.id} does not exist.` }
    });
  }

  // HTTP 204 No Content for deletion
  res.status(204).end();
});

export default router;
