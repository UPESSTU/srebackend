const { Schema, model } = require('mongoose')


const emailTemplateSchema = Schema({
    templateName: {
        type: String,
        required: true
    },
    html: {
        type: String,
        required: true
    },
    templateFor: {
        type: String,
        enum: ['REMINDER', 'ASSIGNED'],
        unique: true,
        required: true
    },
    subject: {
        type: String,
        required: true
    }
}, { timestamps: true })

const EmailTemplate = model('EmailTemplate', emailTemplateSchema)
module.exports = EmailTemplate