const {
    Schema,
    model
} = require('mongoose')

const schoolSchema = new Schema({
    schoolName: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true })


const School = model('School', schoolSchema)

module.exports = School