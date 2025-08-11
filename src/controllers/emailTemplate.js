const EmailTemplate = require('../models/emailTemplate')
const logger = require('../utils/logger')

exports.addTemplate = async (req, res) => {
    try{
        const {
          html,
          templateName,
          templateFor,
          subject
        } = req.body
        
        const response = await EmailTemplate.findOneAndUpdate(
            {
                templateFor: templateFor
            },
            {
                html: html,
                templateName: templateName,
                subject: subject
            },
            {
                new: true,
                upsert: true
            }
        )

        res.status(201).json({
            message: 'Email Template Created/Updated',
            success: true,
            dbRes: response
        })

    }catch(err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurrred",
            errorJSON: err,
            errorString: err.toString()
        })
    }
}

exports.getTemplateById = async (req, res) => {
    try{
       
        const {
            templateId
        } = req.params

        const response = await EmailTemplate.findOne({ _id: templateId })

        res.status(200).json({
            message: 'Email Template Fetched',
            success: true,
            dbRes: response
        })

    }catch(err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurrred",
            errorJSON: err,
            errorString: err.toString()
        })
    }
}

exports.getTemplates = async (req, res) => {
    try{
       
        
        const response = await EmailTemplate.find()

        res.status(200).json({
            message: 'Email Templates Fetched',
            success: true,
            dbRes: response
        })

    }catch(err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurrred",
            errorJSON: err,
            errorString: err.toString()
        })
    }
}

exports.getTemplate = async (templateFor) => {
    try {
        const response = await EmailTemplate.findOne({ templateFor: templateFor })

        if(!response)
            return false
        return response

    }catch(err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        return false
    }
}

// No default templates needed as per requirements