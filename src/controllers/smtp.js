const SMTP = require('../models/smtp')
const logger = require('../utils/logger')


exports.getSMTP = async (req, res) => {
    try{
        
        const response = await SMTP.find()

        res.status(200).json({
            message: 'SMTP Fetched',
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

exports.addSMTP = async (req, res) => {
    try{
        const {
            emailAddress,
            emailPassword,
            smtpPort,
            smtpHost,
        } = req.body

        
        const response = await SMTP.findOneAndUpdate(
            {
                smtpCount: 'ONE'
            },
            {
                emailAddress,
                emailPassword,
                smtpHost,
                smtpPort,
                smtpSecure : false

            },
            {
                new: true,
                upsert: true
            }
        )

        res.status(201).json({
            message: 'SMTP Created/Updated',
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