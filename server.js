// Champion School 成绩管理系统 - 后端服务器
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// ========== 数据库初始化 ==========
const DB_PATH = path.join(__dirname, 'database', 'champion.db');
let db;

function initDatabase() {
    const dbDir = path.join(__dirname, 'database');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH);

    // 读取并执行初始化SQL
    const initSql = fs.readFileSync(path.join(dbDir, 'init.sql'), 'utf8');
    const statements = initSql.split(';').filter(s => s.trim());

    db.serialize(() => {
        statements.forEach(sql => {
            if (sql.trim()) {
                db.run(sql, (err) => {
                    if (err) console.error('SQL执行错误:', err.message);
                });
            }
        });
    });

    console.log('✅ 数据库初始化完成');
}

initDatabase();

// ========== 辅助函数 ==========
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function runStatement(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

// ========== API 路由 ==========

// 1. 获取所有用户
app.get('/api/users', async (req, res) => {
    try {
        const users = await runQuery('SELECT * FROM users');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. 获取所有学生
app.get('/api/students', async (req, res) => {
    try {
        const students = await runQuery("SELECT * FROM users WHERE role = 'student'");
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. 添加学生
app.post('/api/students', async (req, res) => {
    try {
        const { name, account, password, phone, classId } = req.body;
        const id = 's' + String(Date.now()).slice(-6);
        
        await runStatement(
            'INSERT INTO users (id, account, password, role, name, class_id, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, account || name.toLowerCase(), password || '1234', 'student', name, classId, phone || '13800000000']
        );
        
        // 添加基础积分
        await runStatement(
            'INSERT INTO points (student_id, event, value, time) VALUES (?, ?, ?, ?)',
            [id, '基础分', 30, new Date().toISOString()]
        );
        
        const newStudent = await runQuery('SELECT * FROM users WHERE id = ?', [id]);
        res.json(newStudent[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. 删除学生
app.delete('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await runStatement('DELETE FROM scores WHERE student_id = ?', [id]);
        await runStatement('DELETE FROM points WHERE student_id = ?', [id]);
        await runStatement('DELETE FROM users WHERE id = ? AND role = "student"', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4.1 批量删除学生
app.post('/api/students/batch-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: '缺少学生ID列表' });
        }
        for (const id of ids) {
            await runStatement('DELETE FROM scores WHERE student_id = ?', [id]);
            await runStatement('DELETE FROM points WHERE student_id = ?', [id]);
            await runStatement('DELETE FROM users WHERE id = ? AND role = "student"', [id]);
        }
        res.json({ success: true, count: ids.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4.2 删除班级
app.delete('/api/classes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // 将班级内学生的 class_id 设为 null
        await runStatement('UPDATE users SET class_id = NULL WHERE class_id = ? AND role = "student"', [id]);
        // 删除班级
        await runStatement('DELETE FROM classes WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. 更新学生信息
app.put('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, classId, account, password } = req.body;
        
        let sql = 'UPDATE users SET ';
        const params = [];
        const updates = [];
        
        if (name) { updates.push('name = ?'); params.push(name); }
        if (phone) { updates.push('phone = ?'); params.push(phone); }
        if (classId) { updates.push('class_id = ?'); params.push(classId); }
        if (account) { updates.push('account = ?'); params.push(account); }
        if (password) { updates.push('password = ?'); params.push(password); }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: '没有要更新的字段' });
        }
        
        sql += updates.join(', ') + ' WHERE id = ?';
        params.push(id);
        
        await runStatement(sql, params);
        const updated = await runQuery('SELECT * FROM users WHERE id = ?', [id]);
        res.json(updated[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. 添加用户（教师/教务/校长）
app.post('/api/users', async (req, res) => {
    try {
        const { name, account, password, role, subjects, classIds } = req.body;
        
        let id;
        if (role === 'teacher') id = 't' + String(Date.now()).slice(-6);
        else if (role === 'admin') id = 'a' + String(Date.now()).slice(-6);
        else id = 'u' + String(Date.now()).slice(-6);
        
        await runStatement(
            'INSERT INTO users (id, account, password, role, name, subjects, class_ids) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, account, password, role, name, JSON.stringify(subjects || []), JSON.stringify(classIds || [])]
        );
        
        const newUser = await runQuery('SELECT * FROM users WHERE id = ?', [id]);
        res.json(newUser[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. 删除用户
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await runStatement('DELETE FROM users WHERE id = ? AND role != "principal"', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 7.1 更新用户信息
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, account, password, subjects } = req.body;
        
        let sql = 'UPDATE users SET ';
        const params = [];
        const updates = [];
        
        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (account !== undefined) { updates.push('account = ?'); params.push(account); }
        if (password !== undefined && password !== '') { updates.push('password = ?'); params.push(password); }
        if (subjects !== undefined) { updates.push('subjects = ?'); params.push(JSON.stringify(subjects)); }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: '没有要更新的字段' });
        }
        
        sql += updates.join(', ') + ' WHERE id = ?';
        params.push(id);
        
        await runStatement(sql, params);
        const updated = await runQuery('SELECT * FROM users WHERE id = ?', [id]);
        res.json(updated[0] || { success: true });
    } catch (err) {
        console.error('更新用户错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 8. 重置密码
app.put('/api/users/:id/reset-password', async (req, res) => {
    try {
        const { id } = req.params;
        await runStatement('UPDATE users SET password = ? WHERE id = ?', ['123456', id]);
        res.json({ success: true, newPassword: '123456' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. 获取所有考试
app.get('/api/exams', async (req, res) => {
    try {
        const exams = await runQuery('SELECT * FROM exams');
        res.json(exams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9.1 添加新考试 (POST)
app.post('/api/exams', async (req, res) => {
    try {
        const { id, name, type, date, subject, class_ids } = req.body;
        await runStatement(
            'INSERT OR IGNORE INTO exams (id, name, type, date, subject, class_ids) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, type || 'custom', date || new Date().toISOString().slice(0,10), subject, class_ids || '["c1","c2","c3"]']
        );
        res.json({ success: true, id });
    } catch (err) {
        console.error('添加考试错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 10. 获取所有成绩
app.get('/api/scores', async (req, res) => {
    try {
        const scores = await runQuery('SELECT * FROM scores');
        res.json(scores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 11. 获取特定学生的成绩
app.get('/api/scores/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const scores = await runQuery('SELECT * FROM scores WHERE student_id = ?', [studentId]);
        res.json(scores);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 12. 上传/更新成绩
app.post('/api/scores', async (req, res) => {
    try {
        const { studentId, examId, subject, score } = req.body;
        
        const existing = await runQuery(
            'SELECT * FROM scores WHERE student_id = ? AND exam_id = ?',
            [studentId, examId]
        );
        
        if (existing.length > 0) {
            await runStatement(
                'UPDATE scores SET score = ? WHERE student_id = ? AND exam_id = ?',
                [score, studentId, examId]
            );
        } else {
            await runStatement(
                'INSERT INTO scores (student_id, exam_id, subject, score) VALUES (?, ?, ?, ?)',
                [studentId, examId, subject, score]
            );
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 13. 批量上传成绩
app.post('/api/scores/batch', async (req, res) => {
    try {
        const { scores } = req.body;
        if (!scores || scores.length === 0) {
            return res.status(400).json({ error: '没有成绩数据' });
        }
        let count = 0;
        for (const item of scores) {
            const existing = await runQuery(
                'SELECT * FROM scores WHERE student_id = ? AND exam_id = ?',
                [item.studentId, item.examId]
            );
            if (existing.length > 0) {
                await runStatement(
                    'UPDATE scores SET score = ? WHERE student_id = ? AND exam_id = ?',
                    [item.score, item.studentId, item.examId]
                );
            } else {
                await runStatement(
                    'INSERT INTO scores (student_id, exam_id, subject, score) VALUES (?, ?, ?, ?)',
                    [item.studentId, item.examId, item.subject || 'math', item.score]
                );
            }
            count++;
        }
        res.json({ success: true, count });
    } catch (err) {
        console.error('批量上传错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 14. 获取积分
app.get('/api/points/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const points = await runQuery('SELECT * FROM points WHERE student_id = ? ORDER BY time DESC', [studentId]);
        res.json(points);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 15. 添加积分
app.post('/api/points', async (req, res) => {
    try {
        const { studentId, event, value, subject } = req.body;
        await runStatement(
            'INSERT INTO points (student_id, event, value, time, subject) VALUES (?, ?, ?, ?, ?)',
            [studentId, event, value, new Date().toISOString(), subject || null]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 16. 获取所有班级
app.get('/api/classes', async (req, res) => {
    try {
        const classes = await runQuery('SELECT * FROM classes');
        res.json(classes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 16.1 创建或更新班级（支持自动创建）
app.post('/api/classes', async (req, res) => {
    try {
        const { id, name, grade, class_type_id, student_ids } = req.body;
        if (!id || !name || !grade || !class_type_id) {
            return res.status(400).json({ error: '缺少必要字段' });
        }
        const existing = await runQuery('SELECT * FROM classes WHERE id = ?', [id]);
        if (existing.length > 0) {
            // 更新现有班级（追加学生）
            let currentIds = existing[0].student_ids ? JSON.parse(existing[0].student_ids) : [];
            if (student_ids) {
                const newIds = Array.isArray(student_ids) ? student_ids : JSON.parse(student_ids);
                for (const sid of newIds) {
                    if (!currentIds.includes(sid)) currentIds.push(sid);
                }
            }
            await runStatement(
                'UPDATE classes SET name = ?, grade = ?, class_type_id = ?, student_ids = ? WHERE id = ?',
                [name, grade, class_type_id, JSON.stringify(currentIds), id]
            );
            const updated = await runQuery('SELECT * FROM classes WHERE id = ?', [id]);
            res.json(updated[0]);
        } else {
            // 创建新班级
            await runStatement(
                'INSERT INTO classes (id, name, grade, class_type_id, student_ids) VALUES (?, ?, ?, ?, ?)',
                [id, name, grade, class_type_id, student_ids ? JSON.stringify(Array.isArray(student_ids) ? student_ids : JSON.parse(student_ids)) : '[]']
            );
            const created = await runQuery('SELECT * FROM classes WHERE id = ?', [id]);
            res.json(created[0]);
        }
    } catch (err) {
        console.error('创建/更新班级错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 16.2 创建或更新班型
app.post('/api/class-types', async (req, res) => {
    try {
        const { id, name, subject, enabled } = req.body;
        if (!id || !name || !subject) {
            return res.status(400).json({ error: '缺少必要字段' });
        }
        const existing = await runQuery('SELECT * FROM class_types WHERE id = ?', [id]);
        if (existing.length > 0) {
            await runStatement(
                'UPDATE class_types SET name = ?, subject = ?, enabled = ? WHERE id = ?',
                [name, subject, enabled !== undefined ? enabled : 1, id]
            );
            const updated = await runQuery('SELECT * FROM class_types WHERE id = ?', [id]);
            res.json(updated[0]);
        } else {
            await runStatement(
                'INSERT INTO class_types (id, name, subject, enabled) VALUES (?, ?, ?, ?)',
                [id, name, subject, enabled !== undefined ? enabled : 1]
            );
            const created = await runQuery('SELECT * FROM class_types WHERE id = ?', [id]);
            res.json(created[0]);
        }
    } catch (err) {
        console.error('创建/更新班型错误:', err);
        res.status(500).json({ error: err.message });
    }
});

// 17. 获取所有科目
app.get('/api/subjects', async (req, res) => {
    try {
        const subjects = await runQuery('SELECT * FROM subjects');
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 18. 登录验证
app.post('/api/login', async (req, res) => {
    try {
        const { account, password } = req.body;
        const user = await runQuery(
            'SELECT * FROM users WHERE account = ? AND password = ?',
            [account, password]
        );
        
        if (user.length > 0) {
            res.json({ success: true, user: user[0] });
        } else {
            res.status(401).json({ success: false, message: '账号或密码错误' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 19. 获取所有班型
app.get('/api/class-types', async (req, res) => {
    try {
        const classTypes = await runQuery('SELECT * FROM class_types');
        res.json(classTypes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 20. 获取所有考试（按科目）
app.get('/api/exams/subject/:subjectId', async (req, res) => {
    try {
        const { subjectId } = req.params;
        const exams = await runQuery('SELECT * FROM exams WHERE subject = ?', [subjectId]);
        res.json(exams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== 启动服务器 ==========
app.listen(PORT, () => {
    console.log(`🚀 Champion School 服务器已启动`);
    console.log(`📡 访问地址: http://localhost:${PORT}`);
    console.log(`📊 数据库路径: ${DB_PATH}`);
});