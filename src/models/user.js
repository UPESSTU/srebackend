const {
    Schema,
    model
} = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const userSchema = new Schema({
    sapId: {
        type: Number,
        required: true,
        unique: true
    },
    userName: { 
        type: String, 
        required: true, 
        unique: true 
    },
    emailAddress: {
        type: String,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    resetPasswordToken: {
        type: String,
    },
    salt: {
        type: String,
        required: true,
        unique: true
    },
    encpy_password: { 
        type: String, 
        required: true 
    },
    role: {
        type: String,
        enums:["ADMIN", "MODERATOR", "FACULTY"],
        required: true
    }
}, { timestamps: true })

userSchema.plugin(mongoosePaginate)

const User = model('User', userSchema)

module.exports = User