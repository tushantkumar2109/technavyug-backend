import { Op } from "sequelize";
import {
  Course,
  Category,
  Section,
  Lecture,
  Enrollment,
  Review,
  User,
} from "../models/index.js";
import { getPagination, getPaginatedResponse } from "../utils/pagination.js";
import slugify from "../utils/slugify.js";
import Logger from "../utils/logger.js";

const createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      shortDescription,
      thumbnail,
      price,
      level,
      categoryId,
      language,
    } = req.body;

    const course = await Course.create({
      title,
      slug: slugify(title),
      description,
      shortDescription,
      thumbnail,
      price: price || 0,
      level,
      categoryId,
      language,
      instructorId: req.user.id,
    });

    Logger.info("Course created", { courseId: course.id });
    res
      .status(201)
      .json({ message: "Course created successfully", data: course });
  } catch (error) {
    Logger.error("Error creating course", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const listCourses = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const {
      status,
      level,
      categoryId,
      search,
      instructorId,
      minPrice,
      maxPrice,
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (level) where.level = level;
    if (categoryId) where.categoryId = categoryId;
    if (instructorId) where.instructorId = instructorId;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }
    if (minPrice)
      where.price = { ...where.price, [Op.gte]: parseFloat(minPrice) };
    if (maxPrice)
      where.price = { ...where.price, [Op.lte]: parseFloat(maxPrice) };

    const { count, rows } = await Course.findAndCountAll({
      where,
      include: [
        { model: Category, attributes: ["id", "name", "slug"] },
        { model: User, as: "instructor", attributes: ["id", "name", "avatar"] },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(getPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    Logger.error("Error listing courses", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getCourseByIdOrSlug = async (req, res) => {
  try {
    const { identifier } = req.params;
    const where =
      identifier.length === 36 ? { id: identifier } : { slug: identifier };

    const course = await Course.findOne({
      where,
      include: [
        { model: Category, attributes: ["id", "name", "slug"] },
        {
          model: User,
          as: "instructor",
          attributes: ["id", "name", "avatar", "bio"],
        },
        {
          model: Section,
          as: "sections",
          order: [["order", "ASC"]],
          include: [
            {
              model: Lecture,
              as: "lectures",
              attributes: {
                exclude: req.user ? [] : ["videoUrl", "content", "resources"],
              },
              order: [["order", "ASC"]],
            },
          ],
        },
      ],
      order: [
        [{ model: Section, as: "sections" }, "order", "ASC"],
        [
          { model: Section, as: "sections" },
          { model: Lecture, as: "lectures" },
          "order",
          "ASC",
        ],
      ],
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ data: course });
  } catch (error) {
    Logger.error("Error fetching course", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Only the course instructor or an admin can update
    if (
      course.instructorId !== req.user.id &&
      !["Admin", "Sub Admin"].includes(req.user.role)
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this course" });
    }

    const allowedFields = [
      "title",
      "description",
      "shortDescription",
      "thumbnail",
      "price",
      "level",
      "status",
      "categoryId",
      "language",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        course[field] = req.body[field];
      }
    }

    if (req.body.title) {
      course.slug = slugify(req.body.title);
    }

    await course.save();

    Logger.info("Course updated", { courseId: course.id });
    res
      .status(200)
      .json({ message: "Course updated successfully", data: course });
  } catch (error) {
    Logger.error("Error updating course", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (
      course.instructorId !== req.user.id &&
      !["Admin", "Sub Admin"].includes(req.user.role)
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this course" });
    }

    await course.destroy();
    Logger.info("Course deleted", { courseId: req.params.id });
    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    Logger.error("Error deleting course", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// --- Section Management ---

const createSection = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title } = req.body;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (
      course.instructorId !== req.user.id &&
      !["Admin", "Sub Admin"].includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const maxOrder = (await Section.max("order", { where: { courseId } })) || 0;

    const section = await Section.create({
      courseId,
      title,
      order: maxOrder + 1,
    });

    Logger.info("Section created", { sectionId: section.id });
    res
      .status(201)
      .json({ message: "Section created successfully", data: section });
  } catch (error) {
    Logger.error("Error creating section", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateSection = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.sectionId, {
      include: [{ model: Course }],
    });

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    if (
      section.Course.instructorId !== req.user.id &&
      !["Admin", "Sub Admin"].includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.body.title !== undefined) section.title = req.body.title;
    if (req.body.order !== undefined) section.order = req.body.order;

    await section.save();

    Logger.info("Section updated", { sectionId: section.id });
    res
      .status(200)
      .json({ message: "Section updated successfully", data: section });
  } catch (error) {
    Logger.error("Error updating section", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteSection = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.sectionId, {
      include: [{ model: Course }],
    });

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    if (
      section.Course.instructorId !== req.user.id &&
      !["Admin", "Sub Admin"].includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await section.destroy();
    Logger.info("Section deleted", { sectionId: req.params.sectionId });
    res.status(200).json({ message: "Section deleted successfully" });
  } catch (error) {
    Logger.error("Error deleting section", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const reorderSections = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { orderedIds } = req.body;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (
      course.instructorId !== req.user.id &&
      !["Admin", "Sub Admin"].includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    for (let i = 0; i < orderedIds.length; i++) {
      await Section.update(
        { order: i + 1 },
        { where: { id: orderedIds[i], courseId } },
      );
    }

    res.status(200).json({ message: "Sections reordered successfully" });
  } catch (error) {
    Logger.error("Error reordering sections", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// --- Lecture Management ---

const createLecture = async (req, res) => {
  try {
    const { sectionId } = req.params;

    const section = await Section.findByPk(sectionId, {
      include: [{ model: Course }],
    });

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    if (
      section.Course.instructorId !== req.user.id &&
      !["Admin", "Sub Admin"].includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const maxOrder =
      (await Lecture.max("order", { where: { sectionId } })) || 0;

    const lecture = await Lecture.create({
      sectionId,
      title: req.body.title,
      type: req.body.type || "Video",
      videoUrl: req.body.videoUrl,
      duration: req.body.duration || 0,
      content: req.body.content,
      resources: req.body.resources || [],
      order: maxOrder + 1,
      isFree: req.body.isFree || false,
    });

    // Update course aggregate counters
    const totalLectures = await Lecture.count({
      include: [{ model: Section, where: { courseId: section.courseId } }],
    });
    const totalDuration =
      (await Lecture.sum("duration", {
        include: [{ model: Section, where: { courseId: section.courseId } }],
      })) || 0;

    await Course.update(
      { totalLectures, totalDuration },
      { where: { id: section.courseId } },
    );

    Logger.info("Lecture created", { lectureId: lecture.id });
    res
      .status(201)
      .json({ message: "Lecture created successfully", data: lecture });
  } catch (error) {
    Logger.error("Error creating lecture", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findByPk(req.params.lectureId, {
      include: [{ model: Section, include: [{ model: Course }] }],
    });

    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    // If lecture is not free, check enrollment
    if (!lecture.isFree) {
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Authentication required to access this lecture" });
      }

      const courseId = lecture.Section.courseId;
      const isInstructor = lecture.Section.Course.instructorId === req.user.id;
      const isAdmin = ["Admin", "Sub Admin"].includes(req.user.role);

      if (!isInstructor && !isAdmin) {
        const enrollment = await Enrollment.findOne({
          where: { userId: req.user.id, courseId, status: "Active" },
        });

        if (!enrollment) {
          return res
            .status(403)
            .json({ message: "Enrollment required to access this lecture" });
        }
      }
    }

    res.status(200).json({ data: lecture });
  } catch (error) {
    Logger.error("Error fetching lecture", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findByPk(req.params.lectureId, {
      include: [{ model: Section, include: [{ model: Course }] }],
    });

    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    const course = lecture.Section.Course;
    if (
      course.instructorId !== req.user.id &&
      !["Admin", "Sub Admin"].includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const allowedFields = [
      "title",
      "type",
      "videoUrl",
      "duration",
      "content",
      "resources",
      "order",
      "isFree",
    ];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        lecture[field] = req.body[field];
      }
    }

    await lecture.save();

    // Update course aggregates
    const totalDuration =
      (await Lecture.sum("duration", {
        include: [{ model: Section, where: { courseId: course.id } }],
      })) || 0;
    await Course.update({ totalDuration }, { where: { id: course.id } });

    Logger.info("Lecture updated", { lectureId: lecture.id });
    res
      .status(200)
      .json({ message: "Lecture updated successfully", data: lecture });
  } catch (error) {
    Logger.error("Error updating lecture", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteLecture = async (req, res) => {
  try {
    const lecture = await Lecture.findByPk(req.params.lectureId, {
      include: [{ model: Section, include: [{ model: Course }] }],
    });

    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    const course = lecture.Section.Course;
    if (
      course.instructorId !== req.user.id &&
      !["Admin", "Sub Admin"].includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await lecture.destroy();

    // Update course aggregates
    const totalLectures = await Lecture.count({
      include: [{ model: Section, where: { courseId: course.id } }],
    });
    const totalDuration =
      (await Lecture.sum("duration", {
        include: [{ model: Section, where: { courseId: course.id } }],
      })) || 0;

    await Course.update(
      { totalLectures, totalDuration },
      { where: { id: course.id } },
    );

    Logger.info("Lecture deleted", { lectureId: req.params.lectureId });
    res.status(200).json({ message: "Lecture deleted successfully" });
  } catch (error) {
    Logger.error("Error deleting lecture", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default {
  createCourse,
  listCourses,
  getCourseByIdOrSlug,
  updateCourse,
  deleteCourse,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  createLecture,
  getLecture,
  updateLecture,
  deleteLecture,
};
