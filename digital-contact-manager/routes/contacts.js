const express = require("express");
const router = express.Router();
const Contact = require("../models/Contact");

// Sample seed data for quick demo/testing
const SAMPLE_CONTACTS = [
  {
    name: "Dr. A. P. Sharma",
    phone: "+91 98765 43210",
    email: "apsharma@university.edu",
    category: "College",
    address: "Department of Computer Science, Block A",
    notes: "Project Guide & HOD",
    isFavorite: true
  },
  {
    name: "Priya Patel",
    phone: "+91 98234 56789",
    email: "priya.patel@techinnovators.com",
    category: "Work",
    address: "Cyber City, Hyderabad, Telangana",
    notes: "Frontend Lead at Tech Innovators",
    isFavorite: true
  },
  {
    name: "Rahul Verma",
    phone: "+91 91234 56780",
    email: "rahul.verma@example.com",
    category: "College",
    address: "Hostel 3, Room 204",
    notes: "Lab Partner for Web Technologies",
    isFavorite: false
  },
  {
    name: "Sneha Reddy",
    phone: "+91 94401 23456",
    email: "sneha.reddy@gmail.com",
    category: "Personal",
    address: "Banjara Hills, Hyderabad",
    notes: "Childhood friend, birthday on 14th August",
    isFavorite: false
  },
  {
    name: "City Hospital Emergency",
    phone: "+91 40 2345 6789",
    email: "emergency@cityhospital.org",
    category: "Emergency",
    address: "Main Road, Near Central Metro Station",
    notes: "24x7 Ambulance and Trauma Care",
    isFavorite: true
  },
  {
    name: "Anil Kumar (Uncle)",
    phone: "+91 97000 11223",
    email: "anil.kumar@family.net",
    category: "Family",
    address: "Gandhi Nagar, Vijayawada",
    notes: "Family contact",
    isFavorite: false
  }
];

// Helper: Calculate total stats across database
async function getContactStats() {
  const total = await Contact.countDocuments();
  const favorites = await Contact.countDocuments({ isFavorite: true });
  const categories = await Contact.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } }
  ]);

  const categoryMap = {
    Personal: 0,
    Work: 0,
    College: 0,
    Family: 0,
    Emergency: 0,
    Other: 0
  };

  categories.forEach((item) => {
    if (item._id && categoryMap.hasOwnProperty(item._id)) {
      categoryMap[item._id] = item.count;
    }
  });

  return { total, favorites, byCategory: categoryMap };
}

// 1. GET /api/contacts - List contacts with search, filter, and sorting
router.get("/", async (req, res) => {
  try {
    const { search, category, favorite, sortBy } = req.query;

    const query = {};

    // Filter by category
    if (category && category !== "All") {
      query.category = category;
    }

    // Filter by favorite
    if (favorite === "true") {
      query.isFavorite = true;
    }

    // Search filter across name, phone, email, address, and notes
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { address: searchRegex },
        { notes: searchRegex }
      ];
    }

    // Sorting logic
    let sortOptions = { name: 1 }; // default: Name A-Z
    if (sortBy === "name_desc") {
      sortOptions = { name: -1 };
    } else if (sortBy === "date_desc") {
      sortOptions = { createdAt: -1 };
    } else if (sortBy === "date_asc") {
      sortOptions = { createdAt: 1 };
    }

    const contacts = await Contact.find(query).sort(sortOptions);
    const stats = await getContactStats();

    res.json({
      success: true,
      count: contacts.length,
      total: stats.total,
      stats,
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contacts",
      error: error.message
    });
  }
});

// 2. GET /api/contacts/stats - Summary statistics
router.get("/stats", async (req, res) => {
  try {
    const stats = await getContactStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
      error: error.message
    });
  }
});

// 3. GET /api/contacts/:id - Retrieve single contact
router.get("/:id", async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }
    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid contact ID format",
      error: error.message
    });
  }
});

// 4. POST /api/contacts - Create a new contact
router.post("/", async (req, res) => {
  try {
    const { name, phone, email, category, address, notes, isFavorite } = req.body;

    // Basic validation check
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Contact name is required"
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    const newContact = new Contact({
      name: name.trim(),
      phone: phone.trim(),
      email: (email || "").trim(),
      category: category || "Personal",
      address: (address || "").trim(),
      notes: (notes || "").trim(),
      isFavorite: Boolean(isFavorite)
    });

    const savedContact = await newContact.save();
    const stats = await getContactStats();

    res.status(201).json({
      success: true,
      message: "Contact created successfully",
      stats,
      data: savedContact
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to create contact",
      error: error.message
    });
  }
});

// 5. PUT /api/contacts/:id - Update an existing contact
router.put("/:id", async (req, res) => {
  try {
    const { name, phone, email, category, address, notes, isFavorite } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Contact name is required"
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    const updatedContact = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        phone: phone.trim(),
        email: (email || "").trim(),
        category: category || "Personal",
        address: (address || "").trim(),
        notes: (notes || "").trim(),
        isFavorite: Boolean(isFavorite)
      },
      { new: true, runValidators: true }
    );

    if (!updatedContact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    const stats = await getContactStats();

    res.json({
      success: true,
      message: "Contact updated successfully",
      stats,
      data: updatedContact
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update contact",
      error: error.message
    });
  }
});

// 6. PATCH /api/contacts/:id/favorite - Toggle favorite status
router.patch("/:id/favorite", async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    contact.isFavorite = !contact.isFavorite;
    await contact.save();

    const stats = await getContactStats();

    res.json({
      success: true,
      message: contact.isFavorite ? "Added to favorites" : "Removed from favorites",
      stats,
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle favorite status",
      error: error.message
    });
  }
});

// 7. DELETE /api/contacts/:id - Delete a contact
router.delete("/:id", async (req, res) => {
  try {
    const deletedContact = await Contact.findByIdAndDelete(req.params.id);
    if (!deletedContact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    const stats = await getContactStats();

    res.json({
      success: true,
      message: `Contact "${deletedContact.name}" deleted successfully`,
      stats,
      data: deletedContact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete contact",
      error: error.message
    });
  }
});

// 8. POST /api/contacts/seed - Seed sample contacts for quick demonstration
router.post("/seed", async (req, res) => {
  try {
    const count = await Contact.countDocuments();
    if (count > 0 && req.query.force !== "true") {
      return res.json({
        success: true,
        message: `Database already has ${count} contacts. Pass ?force=true to reset.`,
        count
      });
    }

    if (req.query.force === "true") {
      await Contact.deleteMany({});
    }

    const created = await Contact.insertMany(SAMPLE_CONTACTS);
    const stats = await getContactStats();

    res.status(201).json({
      success: true,
      message: `Successfully loaded ${created.length} sample contacts!`,
      stats,
      data: created
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to seed sample contacts",
      error: error.message
    });
  }
});

module.exports = router;
