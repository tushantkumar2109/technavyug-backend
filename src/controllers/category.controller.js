import { Category } from "../models/index.js";
import slugify from "../utils/slugify.js";
import Logger from "../utils/logger.js";

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = await Category.create({
      name,
      slug: slugify(name),
      description,
    });

    Logger.info("Category created", { categoryId: category.id });
    res
      .status(201)
      .json({ message: "Category created successfully", data: category });
  } catch (error) {
    Logger.error("Error creating category", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const listCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [["name", "ASC"]],
    });

    res.status(200).json({ data: categories });
  } catch (error) {
    Logger.error("Error listing categories", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ data: category });
  } catch (error) {
    Logger.error("Error fetching category", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const { name, description } = req.body;
    if (name !== undefined) {
      category.name = name;
      category.slug = slugify(name);
    }
    if (description !== undefined) category.description = description;

    await category.save();

    Logger.info("Category updated", { categoryId: category.id });
    res
      .status(200)
      .json({ message: "Category updated successfully", data: category });
  } catch (error) {
    Logger.error("Error updating category", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await category.destroy();
    Logger.info("Category deleted", { categoryId: req.params.id });
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    Logger.error("Error deleting category", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default {
  createCategory,
  listCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
