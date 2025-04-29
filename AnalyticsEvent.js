const mongoose = require('mongoose');

const AnalyticsEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    trim: true
  },
  sessionId: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userAgent: {
    type: String,
    trim: true
  },
  screenResolution: {
    type: String,
    trim: true
  },
  step: {
    type: String,
    trim: true
  },
  duration: {
    type: Number
  },
  formData: {
    type: Object
  },
  formSteps: {
    type: Object
  },
  referrer: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  location: {
    type: Object
  },
  customData: {
    type: Object
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AnalyticsEvent', AnalyticsEventSchema);