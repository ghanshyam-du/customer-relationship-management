const EnquiryModel = require('../models/enquiryModel');

/**
 * Controller for Enquiry / Lead Management
 */
class EnquiryController {
  /**
   * Submit enquiry from public form (No authentication required)
   * POST /api/enquiries/public
   */
  static async submitPublicEnquiry(req, res, next) {
    try {
      const { name, email, phone, courseInterest, notes, source } = req.body;

      const newEnquiry = await EnquiryModel.create({
        name,
        email,
        phone,
        courseInterest,
        notes,
        source: source || 'online_form',
      });

      return res.status(201).json({
        success: true,
        message: 'Your enquiry has been submitted successfully. A counselor will get in touch soon.',
        data: {
          enquiry: newEnquiry,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch all unclaimed/public enquiries
   * Accessible by any authenticated employee/counselor
   * GET /api/enquiries/unclaimed (or GET /api/enquiries/public)
   */
  static async getUnclaimedEnquiries(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const search = req.query.search || '';
      const course = req.query.course || '';

      const result = await EnquiryModel.findUnclaimed({
        page,
        limit,
        search,
        course,
      });

      return res.status(200).json({
        success: true,
        message: 'Unclaimed enquiries retrieved successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Claim an enquiry
   * Assigns the enquiry exclusively to the logged-in counselor.
   * Concurrency-safe: prevents duplicate claims if multiple counselors click simultaneously.
   * POST /api/enquiries/:id/claim
   */
  static async claimEnquiry(req, res, next) {
    try {
      const enquiryId = parseInt(req.params.id, 10);
      const counselorId = req.user.id;

      if (isNaN(enquiryId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid enquiry ID provided.',
        });
      }

      // Attempt atomic claim
      const claimedEnquiry = await EnquiryModel.claim(enquiryId, counselorId);

      if (claimedEnquiry) {
        return res.status(200).json({
          success: true,
          message: 'Enquiry successfully claimed! It is now assigned to you and private.',
          data: {
            enquiry: claimedEnquiry,
          },
        });
      }

      // If claim returned null, find out why (doesn't exist vs already claimed)
      const existingEnquiry = await EnquiryModel.findById(enquiryId);

      if (!existingEnquiry) {
        return res.status(404).json({
          success: false,
          message: 'Enquiry not found.',
        });
      }

      if (existingEnquiry.claimed_by === counselorId) {
        return res.status(400).json({
          success: false,
          message: 'You have already claimed this enquiry.',
          data: {
            enquiry: existingEnquiry,
          },
        });
      }

      // Already claimed by another counselor
      return res.status(409).json({
        success: false,
        message: 'This enquiry has already been claimed by another counselor and is no longer public.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch leads claimed by the currently logged-in counselor
   * GET /api/enquiries/my-claims
   */
  static async getMyClaimedEnquiries(req, res, next) {
    try {
      const counselorId = req.user.id;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const search = req.query.search || '';
      const status = req.query.status || '';

      const result = await EnquiryModel.findClaimedByCounselor(counselorId, {
        page,
        limit,
        search,
        status,
      });

      return res.status(200).json({
        success: true,
        message: 'Claimed enquiries retrieved successfully.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch details of a single enquiry
   * GET /api/enquiries/:id
   */
  static async getEnquiryById(req, res, next) {
    try {
      const enquiryId = parseInt(req.params.id, 10);
      const counselorId = req.user.id;

      if (isNaN(enquiryId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid enquiry ID provided.',
        });
      }

      const enquiry = await EnquiryModel.findById(enquiryId);

      if (!enquiry) {
        return res.status(404).json({
          success: false,
          message: 'Enquiry not found.',
        });
      }

      // If it is claimed by another counselor, it is private and not accessible
      if (enquiry.claimed_by && enquiry.claimed_by !== counselorId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This enquiry has been claimed by another counselor.',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Enquiry details retrieved successfully.',
        data: {
          enquiry,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update status/notes for an enquiry claimed by the logged-in counselor
   * PATCH /api/enquiries/:id/status
   */
  static async updateStatus(req, res, next) {
    try {
      const enquiryId = parseInt(req.params.id, 10);
      const counselorId = req.user.id;
      const { status, notes } = req.body;

      if (isNaN(enquiryId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid enquiry ID provided.',
        });
      }

      const existingEnquiry = await EnquiryModel.findById(enquiryId);

      if (!existingEnquiry) {
        return res.status(404).json({
          success: false,
          message: 'Enquiry not found.',
        });
      }

      if (existingEnquiry.claimed_by !== counselorId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update status for enquiries you have claimed.',
        });
      }

      const updatedEnquiry = await EnquiryModel.updateStatus(enquiryId, counselorId, {
        status,
        notes,
      });

      return res.status(200).json({
        success: true,
        message: 'Enquiry progress updated successfully.',
        data: {
          enquiry: updatedEnquiry,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EnquiryController;
