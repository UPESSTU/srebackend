const 
    nodemailer = require('nodemailer'),
    logger = require('./logger')


module.exports = async ( { to, subject, html }) => {
    try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "s.bhupender2401@gmail.com", 
            pass: "",   
          }
        })
    
        const mail = {
            from: `"DataNest" <s.bhupender2401@gmail.com>`,
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