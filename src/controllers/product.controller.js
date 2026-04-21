import { Op } from "sequelize";
import { Product } from "../models/index.js";
import { getPagination, getPaginatedResponse } from "../utils/pagination.js";
import slugify from "../utils/slugify.js";
import Logger from "../utils/logger.js";
import { uploadToCloudinary } from "../middlewares/upload.middleware.js";

const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      comparePrice,
      type,
      stock,
      images,
      status,
      sku,
      downloadUrl,
    } = req.body;

    const product = await Product.create({
      name,
      slug: slugify(name),
      description,
      price,
      comparePrice,
      type: type || "Physical",
      stock: stock || 0,
      images: images || [],
      status: status || "Active",
      sku,
      downloadUrl,
    });

    Logger.info("Product created", { productId: product.id });
    res
      .status(201)
      .json({ message: "Product created successfully", data: product });
  } catch (error) {
    Logger.error("Error creating product", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const listProducts = async (req, res) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { type, status, search, minPrice, maxPrice } = req.query;

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }
    if (minPrice)
      where.price = { ...where.price, [Op.gte]: parseFloat(minPrice) };
    if (maxPrice)
      where.price = { ...where.price, [Op.lte]: parseFloat(maxPrice) };

    const { count, rows } = await Product.findAndCountAll({
      where,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(getPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    Logger.error("Error listing products", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getProductById = async (req, res) => {
  try {
    const { identifier } = req.params;
    const where =
      identifier.length === 36 ? { id: identifier } : { slug: identifier };

    const product = await Product.findOne({ where });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ data: product });
  } catch (error) {
    Logger.error("Error fetching product", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const allowedFields = [
      "name",
      "description",
      "price",
      "comparePrice",
      "type",
      "stock",
      "images",
      "status",
      "sku",
      "downloadUrl",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    }

    if (req.body.name) {
      product.slug = slugify(req.body.name);
    }

    await product.save();

    Logger.info("Product updated", { productId: product.id });
    res
      .status(200)
      .json({ message: "Product updated successfully", data: product });
  } catch (error) {
    Logger.error("Error updating product", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.destroy();
    Logger.info("Product deleted", { productId: req.params.id });
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    Logger.error("Error deleting product", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const { url } = await uploadToCloudinary(
      req.file.buffer,
      "product-images",
      "image",
    );

    Logger.info("Product image uploaded", { fileName: req.file.originalname });
    res.status(200).json({
      message: "Image uploaded successfully",
      data: { url },
    });
  } catch (error) {
    Logger.error("Error uploading product image", error);
    res.status(500).json({ message: "Failed to upload image" });
  }
};

export default {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  uploadProductImage,
};
