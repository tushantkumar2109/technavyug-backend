import { Op } from "sequelize";
import { User } from "../../models/index.js";
import { getPagination, getPaginatedResponse } from "../../utils/pagination.js";
import Logger from "../../utils/logger.js";

const listUsers = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { role, status, search } = req.query;

    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ["password"] },
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(getPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    Logger.error("Error listing users", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ data: user });
  } catch (error) {
    Logger.error("Error fetching user", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, role, status, phone, bio, avatar } = req.body;
    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    const { password, ...userData } = user.toJSON();
    Logger.info("User updated by admin", { userId: user.id });
    res
      .status(200)
      .json({ message: "User updated successfully", data: userData });
  } catch (error) {
    Logger.error("Error updating user", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "Admin") {
      return res.status(403).json({ message: "Cannot delete an Admin user" });
    }

    await user.destroy();
    Logger.info("User deleted by admin", { userId: req.params.id });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    Logger.error("Error deleting user", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const blockUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "Admin") {
      return res.status(403).json({ message: "Cannot block an Admin user" });
    }

    user.status = "Blocked";
    await user.save();

    Logger.info("User blocked", { userId: user.id });
    res.status(200).json({ message: "User blocked successfully" });
  } catch (error) {
    Logger.error("Error blocking user", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const unblockUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = "Active";
    await user.save();

    Logger.info("User unblocked", { userId: user.id });
    res.status(200).json({ message: "User unblocked successfully" });
  } catch (error) {
    Logger.error("Error unblocking user", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default {
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser,
};
