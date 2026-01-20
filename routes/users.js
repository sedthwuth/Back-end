const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");
const verifyToken = require("../middleware/auth");

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: ดึงรายชื่อผู้ใช้ทั้งหมด
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT users_id, username, email, role FROM tbl_users"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Query failed" });
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: ดึงผู้ใช้ตาม ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: User not found
 */
router.get("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.query(
    "SELECT users_id, username, email, role FROM tbl_users WHERE users_id = ?",
    [id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(rows[0]);
});

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: เพิ่มผู้ใช้ใหม่
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 */
router.post("/", async (req, res) => {
  const { username, email, password, role } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO tbl_users (username, email, password, role) VALUES (?, ?, ?, ?)",
    [username, email, hashedPassword, role || "user"]
  );

  res.status(201).json({ message: "User created" });
});

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: แก้ไขข้อมูลผู้ใช้
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.put("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { username, email, password, role } = req.body;

  let query = "UPDATE tbl_users SET username = ?, email = ?, role = ?";
  const params = [username, email, role];

  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    query += ", password = ?";
    params.push(hashed);
  }

  query += " WHERE users_id = ?";
  params.push(id);

  const [result] = await db.query(query, params);

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "User updated" });
});

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: ลบผู้ใช้
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  const [result] = await db.query(
    "DELETE FROM tbl_users WHERE users_id = ?",
    [id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "User deleted" });
});

module.exports = router;
