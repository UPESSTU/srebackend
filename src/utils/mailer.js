const 
    nodemailer = require('nodemailer'),
    logger = require('./logger'),
    SMTP = require('../models/smtp')


module.exports = async ( { to, subject, html }) => {
    try {

        const smtp = await SMTP.find()
        const emailConfiguration = {
            host: smtp[0].smtpHost,
            port: smtp[0].smtpPort,
            secure: smtp[0].smtpSecure,
            auth: {
              user: smtp[0].emailAddress,
              pass: smtp[0].emailPassword,
            }
        }

        const transporter = nodemailer.createTransport(emailConfiguration)
    
        const mail = {
            from: `"No Reply SRE" <${smtp.emailAddress}>`,
            to: to,
            subject: subject,
            html: html
        }
    
        const info = await transporter.sendMail(mail)

        logger.info(`Email Sent: ${info.response}`)

    }catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
    }
}