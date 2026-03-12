import { Op, fn, col, literal } from "sequelize";
import {
  User,
  Course,
  Enrollment,
  Order,
  Payment,
  Review,
  Ticket,
  Product,
} from "../../models/index.js";
import Logger from "../../utils/logger.js";

const getDashboardStats = async (req, res) => {
  try {
    // User statistics
    const totalUsers = await User.count();
    const usersByRole = await User.findAll({
      attributes: ["role", [fn("COUNT", col("id")), "count"]],
      group: ["role"],
      raw: true,
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.count({
      where: { lastLoginAt: { [Op.gte]: thirtyDaysAgo } },
    });

    const newUsersThisMonth = await User.count({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
    });

    // Course statistics
    const totalCourses = await Course.count();
    const publishedCourses = await Course.count({
      where: { status: "Published" },
    });
    const totalEnrollments = await Enrollment.count();

    // Revenue statistics
    const totalRevenue =
      (await Payment.sum("amount", {
        where: { status: "Completed" },
      })) || 0;

    const monthlyRevenue =
      (await Payment.sum("amount", {
        where: {
          status: "Completed",
          createdAt: { [Op.gte]: thirtyDaysAgo },
        },
      })) || 0;

    // Order statistics
    const totalOrders = await Order.count();
    const ordersByStatus = await Order.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true,
    });

    const pendingOrders = await Order.count({ where: { status: "Pending" } });

    // Product statistics
    const totalProducts = await Product.count();
    const activeProducts = await Product.count({ where: { status: "Active" } });

    // Review statistics
    const totalReviews = await Review.count();
    const averageRating = await Review.findOne({
      attributes: [[fn("AVG", col("rating")), "avgRating"]],
      raw: true,
    });

    // Ticket statistics
    const openTickets = await Ticket.count({
      where: { status: { [Op.in]: ["Open", "InProgress"] } },
    });

    // Top rated courses
    const topCourses = await Course.findAll({
      where: { status: "Published", totalReviews: { [Op.gt]: 0 } },
      order: [["averageRating", "DESC"]],
      limit: 5,
      attributes: [
        "id",
        "title",
        "averageRating",
        "totalReviews",
        "totalEnrollments",
      ],
      include: [{ model: User, as: "instructor", attributes: ["id", "name"] }],
    });

    res.status(200).json({
      data: {
        users: {
          total: totalUsers,
          byRole: usersByRole,
          activeLastMonth: activeUsers,
          newThisMonth: newUsersThisMonth,
        },
        courses: {
          total: totalCourses,
          published: publishedCourses,
          totalEnrollments,
        },
        revenue: {
          total: totalRevenue,
          lastMonth: monthlyRevenue,
        },
        orders: {
          total: totalOrders,
          byStatus: ordersByStatus,
          pending: pendingOrders,
        },
        products: {
          total: totalProducts,
          active: activeProducts,
        },
        reviews: {
          total: totalReviews,
          averageRating: averageRating?.avgRating
            ? parseFloat(averageRating.avgRating).toFixed(2)
            : 0,
        },
        tickets: {
          open: openTickets,
        },
        topCourses,
      },
    });
  } catch (error) {
    Logger.error("Error fetching dashboard stats", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getRevenueChart = async (req, res) => {
  try {
    const { period = "monthly" } = req.query;

    let dateFormat;
    if (period === "daily") {
      dateFormat = "%Y-%m-%d";
    } else if (period === "weekly") {
      dateFormat = "%Y-%u";
    } else {
      dateFormat = "%Y-%m";
    }

    const revenueData = await Payment.findAll({
      attributes: [
        [fn("DATE_FORMAT", col("createdAt"), dateFormat), "period"],
        [fn("SUM", col("amount")), "revenue"],
        [fn("COUNT", col("id")), "transactions"],
      ],
      where: { status: "Completed" },
      group: [literal(`DATE_FORMAT(\`createdAt\`, '${dateFormat}')`)],
      order: [[literal(`DATE_FORMAT(\`createdAt\`, '${dateFormat}')`), "ASC"]],
      raw: true,
    });

    res.status(200).json({ data: revenueData });
  } catch (error) {
    Logger.error("Error fetching revenue chart", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getEnrollmentChart = async (req, res) => {
  try {
    const enrollmentData = await Enrollment.findAll({
      attributes: [
        [fn("DATE_FORMAT", col("enrolledAt"), "%Y-%m"), "month"],
        [fn("COUNT", col("id")), "enrollments"],
      ],
      group: [literal("DATE_FORMAT(`enrolledAt`, '%Y-%m')")],
      order: [[literal("DATE_FORMAT(`enrolledAt`, '%Y-%m')"), "ASC"]],
      raw: true,
    });

    res.status(200).json({ data: enrollmentData });
  } catch (error) {
    Logger.error("Error fetching enrollment chart", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default {
  getDashboardStats,
  getRevenueChart,
  getEnrollmentChart,
};
