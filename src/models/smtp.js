const { Schema, model } = require('mongoose')


const smtpSchema = Schema({
    emailAddress: {
        type: String,
        required: true,
        unique: true
    },
    emailPassword: {
        type: String,
        required: true
    },
    smtpPort: {
        type: Number,
        required: true
    },
    smtpHost: {
        type: String,
        required: true
    },
    smtpSecure: {
        type: Boolean,
        required: true
    }
})

const SMTP = model('SMTP', smtpSchema)
module.exports = SMTP