var mongoose = require("mongoose");


var ActivitiesSchema = new mongoose.Schema({
  id: {
    type: string,
    required: true
  },
  newNotifications: Number,
  
});