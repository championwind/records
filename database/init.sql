-- Champion School 数据库初始化脚本

-- 用户表（学生、教师、教务、校长）
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    account TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'teacher', 'admin', 'principal')),
    name TEXT NOT NULL,
    class_id TEXT,
    phone TEXT,
    subjects TEXT,  -- JSON数组，仅教师使用
    class_ids TEXT, -- JSON数组，仅教师使用
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 班级表
CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    class_type_id TEXT NOT NULL,
    student_ids TEXT  -- JSON数组
);

-- 班型表（新增 subject 字段，关联科目）
CREATE TABLE IF NOT EXISTS class_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    enabled INTEGER DEFAULT 1
);

-- 科目表
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    light_color TEXT NOT NULL
);

-- 考试表
CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    subject TEXT NOT NULL,
    class_ids TEXT  -- JSON数组
);

-- 成绩表
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    score REAL NOT NULL,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (exam_id) REFERENCES exams(id)
);

-- 积分表
CREATE TABLE IF NOT EXISTS points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    event TEXT NOT NULL,
    value INTEGER NOT NULL,
    time DATETIME DEFAULT CURRENT_TIMESTAMP,
    subject TEXT,
    FOREIGN KEY (student_id) REFERENCES users(id)
);

-- 作业表
CREATE TABLE IF NOT EXISTS homeworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- 预习表
CREATE TABLE IF NOT EXISTS previews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- ==========================================
-- 插入初始数据
-- ==========================================

-- 插入科目数据
INSERT OR IGNORE INTO subjects (id, name, color, light_color) VALUES
    ('math', '数学', '#8B5CF6', '#A78BFA'),
    ('english', '英语', '#3B82F6', '#60A5FA'),
    ('physics', '物理', '#06B6D4', '#22D3EE'),
    ('chinese', '语文', '#F59E0B', '#FBBF24'),
    ('chemistry', '化学', '#10B981', '#34D399');

-- 插入班型数据（含 subject 关联）
INSERT OR IGNORE INTO class_types (id, name, subject, enabled) VALUES
    ('ct1', '数学强化', 'math', 1),
    ('ct2', '数学培优', 'math', 1),
    ('ct3', '数学提升', 'math', 1),
    ('ct4', '英语强化', 'english', 1),
    ('ct5', '英语培优', 'english', 1),
    ('ct6', '物理强化', 'physics', 1),
    ('ct7', '物理培优', 'physics', 1),
    ('ct8', '化学强化', 'chemistry', 1),
    ('ct9', '语文强化', 'chinese', 1);

-- 插入班级数据
INSERT OR IGNORE INTO classes (id, name, grade, class_type_id, student_ids) VALUES
    ('c1', '数学强化班', '八年级', 'ct1', '["s001","s002","s003","s004","s005","s006"]'),
    ('c2', '数学培优班', '八年级', 'ct2', '["s007","s008","s009","s010","s011","s012"]'),
    ('c3', '数学提升班', '八年级', 'ct3', '["s013","s014","s015","s016","s017","s018"]');

-- 插入用户数据（学生18名 + 教师3名 + 教务1名 + 校长1名）
INSERT OR IGNORE INTO users (id, account, password, role, name, class_id, phone, subjects, class_ids) VALUES
    -- 学生（18名）
    ('s001', 'liuxiaodie', '1234', 'student', '刘晓蝶', 'c1', '13800000001', NULL, NULL),
    ('s002', 'fanyunke', '1234', 'student', '范芸可', 'c1', '13800000002', NULL, NULL),
    ('s003', 'zengxiaodie', '1234', 'student', '曾小碟', 'c1', '13800000003', NULL, NULL),
    ('s004', 'zhaorunling', '1234', 'student', '赵润龄', 'c1', '13800000004', NULL, NULL),
    ('s005', 'zhanglingyun', '1234', 'student', '张灵芸', 'c1', '13800000005', NULL, NULL),
    ('s006', 'yejuncheng', '1234', 'student', '叶俊成', 'c1', '13800000006', NULL, NULL),
    ('s007', 'yanzhehao', '1234', 'student', '严哲浩', 'c2', '13800000007', NULL, NULL),
    ('s008', 'huanghaoran', '1234', 'student', '黄浩然', 'c2', '13800000008', NULL, NULL),
    ('s009', 'wangzixuan', '1234', 'student', '王梓轩', 'c2', '13800000009', NULL, NULL),
    ('s010', 'xuzhijie', '1234', 'student', '徐智杰', 'c2', '13800000010', NULL, NULL),
    ('s011', 'liuqiifeng', '1234', 'student', '刘棋锋', 'c2', '13800000011', NULL, NULL),
    ('s012', 'zengwei', '1234', 'student', '曾伟', 'c2', '13800000012', NULL, NULL),
    ('s013', 'zhouhaoming', '1234', 'student', '周昊明', 'c3', '13800000013', NULL, NULL),
    ('s014', 'denchaoran', '1234', 'student', '邓超然', 'c3', '13800000014', NULL, NULL),
    ('s015', 'wuqiyao', '1234', 'student', '吴琪瑶', 'c3', '13800000015', NULL, NULL),
    ('s016', 'zhusiyi', '1234', 'student', '朱思懿', 'c3', '13800000016', NULL, NULL),
    ('s017', 'tianjunxi', '1234', 'student', '田俊熙', 'c3', '13800000017', NULL, NULL),
    ('s018', 'qinchenyi', '1234', 'student', '秦辰逸', 'c3', '13800000018', NULL, NULL),
    -- 教师
    ('t001', 'teacher1', 'teacher123', 'teacher', '王老师', NULL, NULL, '["math"]', '["c1","c2","c3"]'),
    ('t002', 'teacher2', 'teacher123', 'teacher', '李老师', NULL, NULL, '["english"]', '[]'),
    ('t003', 'teacher3', 'teacher123', 'teacher', '张老师', NULL, NULL, '["chinese"]', '[]'),
    -- 教务
    ('a001', 'admin1', 'admin123', 'admin', '教务李', NULL, NULL, NULL, NULL),
    -- 校长
    ('p001', 'principal1', 'principal123', 'principal', '校长陈', NULL, NULL, NULL, NULL);

-- 插入考试数据
INSERT OR IGNORE INTO exams (id, name, type, date, subject, class_ids) VALUES
    ('e1-math', '入门测1', 'entrance', '2026-09-01', 'math', '["c1","c2","c3"]'),
    ('e2-math', '入门测2', 'entrance', '2026-09-08', 'math', '["c1","c2","c3"]'),
    ('e3-math', '入门测3', 'entrance', '2026-09-15', 'math', '["c1","c2","c3"]'),
    ('e4-math', '月考1', 'monthly', '2026-09-20', 'math', '["c1","c2","c3"]');

-- 插入初始成绩数据
INSERT OR IGNORE INTO scores (student_id, exam_id, subject, score) VALUES
    ('s001', 'e1-math', 'math', 90),
    ('s002', 'e1-math', 'math', 91),
    ('s003', 'e1-math', 'math', 90),
    ('s004', 'e1-math', 'math', 92),
    ('s005', 'e1-math', 'math', 90),
    ('s006', 'e1-math', 'math', 91),
    ('s007', 'e1-math', 'math', 72),
    ('s008', 'e1-math', 'math', 87),
    ('s009', 'e1-math', 'math', 88),
    ('s010', 'e1-math', 'math', 77),
    ('s011', 'e1-math', 'math', 86),
    ('s012', 'e1-math', 'math', 86),
    ('s013', 'e1-math', 'math', 69),
    ('s014', 'e1-math', 'math', 67),
    ('s015', 'e1-math', 'math', 56),
    ('s016', 'e1-math', 'math', 69),
    ('s017', 'e1-math', 'math', 53),
    ('s018', 'e1-math', 'math', 74);

-- 插入初始积分
INSERT OR IGNORE INTO points (student_id, event, value, time, subject) VALUES
    ('s001', '基础分', 30, '2026-09-01 00:00:00', NULL);