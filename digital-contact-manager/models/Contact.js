const mongoose = require("mongoose");

// Schema definition for Contact
const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Contact name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [60, "Name cannot exceed 60 characters"]
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [
        /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]{6,16}$/,
        "Please enter a valid phone number"
      ]
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^$|^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        "Please enter a valid email address"
      ],
      default: ""
    },
    category: {
      type: String,
      enum: {
        values: ["Personal", "Work", "College", "Family", "Emergency", "Other"],
        message: "{VALUE} is not a supported category"
      },
      default: "Personal"
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, "Address cannot exceed 200 characters"],
      default: ""
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: ""
    },
    isFavorite: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Add text index for fast search queries across multiple fields
contactSchema.index({
  name: "text",
  phone: "text",
  email: "text",
  address: "text",
  notes: "text"
});

module.exports = mongoose.model("Contact", contactSchema);
