import { Address } from "../models/index.js";
import Logger from "../utils/logger.js";

const getMyAddresses = async (req, res) => {
  try {
    const addresses = await Address.findAll({
      where: { userId: req.user.id },
      order: [
        ["isDefault", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    res.status(200).json({ data: addresses });
  } catch (error) {
    Logger.error("Error fetching addresses", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const createAddress = async (req, res) => {
  try {
    const { name, phone, addressLine1, addressLine2, city, state, pincode, isDefault } =
      req.body;

    if (!name || !phone || !addressLine1 || !city || !state || !pincode) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }

    // If setting as default, unset any existing default
    if (isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId: req.user.id, isDefault: true } },
      );
    }

    // If this is the first address, make it default automatically
    const existingCount = await Address.count({ where: { userId: req.user.id } });
    const shouldBeDefault = isDefault || existingCount === 0;

    const address = await Address.create({
      userId: req.user.id,
      name,
      phone,
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      pincode,
      isDefault: shouldBeDefault,
    });

    Logger.info("Address created", { addressId: address.id, userId: req.user.id });
    res.status(201).json({ message: "Address created successfully", data: address });
  } catch (error) {
    Logger.error("Error creating address", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateAddress = async (req, res) => {
  try {
    const address = await Address.findByPk(req.params.id);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    if (address.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { name, phone, addressLine1, addressLine2, city, state, pincode } = req.body;

    await address.update({
      name: name || address.name,
      phone: phone || address.phone,
      addressLine1: addressLine1 || address.addressLine1,
      addressLine2: addressLine2 !== undefined ? addressLine2 : address.addressLine2,
      city: city || address.city,
      state: state || address.state,
      pincode: pincode || address.pincode,
    });

    Logger.info("Address updated", { addressId: address.id });
    res.status(200).json({ message: "Address updated successfully", data: address });
  } catch (error) {
    Logger.error("Error updating address", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findByPk(req.params.id);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    if (address.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const wasDefault = address.isDefault;
    await address.destroy();

    // If deleted address was default, set the most recent remaining one as default
    if (wasDefault) {
      const nextDefault = await Address.findOne({
        where: { userId: req.user.id },
        order: [["createdAt", "DESC"]],
      });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    Logger.info("Address deleted", { addressId: req.params.id });
    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    Logger.error("Error deleting address", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.findByPk(req.params.id);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    if (address.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Unset all defaults for this user, then set the chosen one
    await Address.update(
      { isDefault: false },
      { where: { userId: req.user.id } },
    );

    address.isDefault = true;
    await address.save();

    Logger.info("Default address set", { addressId: address.id });
    res.status(200).json({ message: "Default address set successfully", data: address });
  } catch (error) {
    Logger.error("Error setting default address", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export default {
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
