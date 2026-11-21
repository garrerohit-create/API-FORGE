import { getDatabase } from '../database/connection.js';

/**
 * Functional Demonstration Student Management CRUD Service.
 * Implements real SQLite persistence, validation, unique email enforcement,
 * and proper HTTP response statuses (200, 201, 204, 400, 404, 409).
 */
export class StudentService {
  static getAllStudents(query = {}) {
    const db = getDatabase();
    const department = query.department;
    const search = query.search;
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (department) {
      sql += ' AND department = ?';
      params.push(department);
    }

    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Count query
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const totalRow = db.prepare(countSql).get(...params);
    const total = totalRow ? totalRow.count : 0;

    sql += ' ORDER BY id ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const students = db.prepare(sql).all(...params);

    return {
      success: true,
      data: students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static getStudentById(id) {
    const db = getDatabase();
    const numId = Number(id);
    if (isNaN(numId)) return null;

    return db.prepare('SELECT * FROM students WHERE id = ?').get(numId) || null;
  }

  static createStudent(studentData) {
    const db = getDatabase();
    const { name, email, department, year } = studentData;

    // Check unique email
    const existing = db.prepare('SELECT id FROM students WHERE email = ?').get(email);
    if (existing) {
      const err = new Error(`Student with email "${email}" already exists.`);
      err.statusCode = 409;
      err.code = 'EMAIL_CONFLICT';
      throw err;
    }

    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO students (name, email, department, year, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, email, department, Number(year), now, now);

    return db.prepare('SELECT * FROM students WHERE id = ?').get(info.lastInsertRowid);
  }

  static updateStudent(id, studentData) {
    const db = getDatabase();
    const numId = Number(id);
    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(numId);
    if (!existing) {
      return null;
    }

    const { name, email, department, year } = studentData;

    // Check email uniqueness against other students
    const emailConflict = db.prepare('SELECT id FROM students WHERE email = ? AND id != ?').get(email, numId);
    if (emailConflict) {
      const err = new Error(`Student with email "${email}" already exists.`);
      err.statusCode = 409;
      err.code = 'EMAIL_CONFLICT';
      throw err;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE students
      SET name = ?, email = ?, department = ?, year = ?, updated_at = ?
      WHERE id = ?
    `).run(name, email, department, Number(year), now, numId);

    return db.prepare('SELECT * FROM students WHERE id = ?').get(numId);
  }

  static patchStudent(id, partialData) {
    const db = getDatabase();
    const numId = Number(id);
    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(numId);
    if (!existing) {
      return null;
    }

    const name = partialData.name !== undefined ? partialData.name : existing.name;
    const email = partialData.email !== undefined ? partialData.email : existing.email;
    const department = partialData.department !== undefined ? partialData.department : existing.department;
    const year = partialData.year !== undefined ? Number(partialData.year) : existing.year;

    if (partialData.email && partialData.email !== existing.email) {
      const emailConflict = db.prepare('SELECT id FROM students WHERE email = ? AND id != ?').get(email, numId);
      if (emailConflict) {
        const err = new Error(`Student with email "${email}" already exists.`);
        err.statusCode = 409;
        err.code = 'EMAIL_CONFLICT';
        throw err;
      }
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE students
      SET name = ?, email = ?, department = ?, year = ?, updated_at = ?
      WHERE id = ?
    `).run(name, email, department, year, now, numId);

    return db.prepare('SELECT * FROM students WHERE id = ?').get(numId);
  }

  static deleteStudent(id) {
    const db = getDatabase();
    const numId = Number(id);
    const existing = db.prepare('SELECT id FROM students WHERE id = ?').get(numId);
    if (!existing) {
      return false;
    }

    db.prepare('DELETE FROM students WHERE id = ?').run(numId);
    return true;
  }
}
