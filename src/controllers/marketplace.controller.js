import Marketplace from '../models/Marketplace.js';
import { AppError } from '../middlewares/errorHandler.js';
import { paginateResults } from '../utils/helpers.js';

export const createListing = async (req, res, next) => {
  try {
    const { title, description, category, price, negotiable, condition, location } = req.body;
    
    // Extract file paths from uploaded files
    const images = req.files ? req.files.map(file => file.path) : [];

    const listing = await Marketplace.create({
      title,
      description,
      category,
      price: parseFloat(price),
      negotiable: negotiable === 'true' || negotiable === true,
      condition,
      location,
      images,
      seller: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

export const getListings = async (req, res, next) => {
  try {
    const { category, condition, minPrice, maxPrice, search, page = 1, limit = 12 } = req.query;
    const filter = { isSold: false };

    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const { skip, limit: limitNum, page: pageNum } = paginateResults(page, limit);

    const listings = await Marketplace.find(filter)
      .populate('seller', 'name avatar profile.phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Marketplace.countDocuments(filter);

    res.status(200).json({
      success: true,
      pagination: {
        total,
        pages: Math.ceil(total / limitNum),
        page: pageNum,
        limit: limitNum,
      },
      data: listings,
    });
  } catch (error) {
    next(error);
  }
};

export const getListing = async (req, res, next) => {
  try {
    const listing = await Marketplace.findById(req.params.id)
      .populate('seller', 'name avatar profile.phone profile.branch');

    if (!listing) {
      return next(new AppError('Listing not found', 404));
    }

    res.status(200).json({
      success: true,
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

export const updateListing = async (req, res, next) => {
  try {
    const listing = await Marketplace.findById(req.params.id);
    if (!listing) return next(new AppError('Listing not found', 404));

    if (listing.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    Object.assign(listing, req.body);
    await listing.save();

    res.status(200).json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
};

export const deleteListing = async (req, res, next) => {
  try {
    const listing = await Marketplace.findById(req.params.id);
    if (!listing) return next(new AppError('Listing not found', 404));

    if (listing.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Not authorized', 403));
    }

    await Marketplace.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Listing deleted' });
  } catch (error) {
    next(error);
  }
};

export const markAsSold = async (req, res, next) => {
  try {
    const listing = await Marketplace.findById(req.params.id);
    if (!listing) return next(new AppError('Listing not found', 404));

    if (listing.seller.toString() !== req.user.id) {
      return next(new AppError('Not authorized', 403));
    }

    listing.isSold = true;
    await listing.save();

    res.status(200).json({
      success: true,
      message: 'Product marked as sold',
      data: listing,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyListings = async (req, res, next) => {
  try {
    const listings = await Marketplace.find({ seller: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: listings });
  } catch (error) {
    next(error);
  }
};
