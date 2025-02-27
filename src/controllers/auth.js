const User = require('../models/user')
const csvParser = require("csv-parser")
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')

const { 
    randomUUID 
} = require('crypto')

const {
    hashPassword,
    isPasswordValid
} = require('../utils/hash')

const sendMail = require('../utils/mailer')
const logger = require('../utils/logger')


const PRIVATEKEY = fs.readFileSync(
    path.join(
        __dirname,
        '..',
        'keys',
        'private.pem'
    )
)

const PUBLICKEY = fs.readFileSync(
    path.join(
        __dirname,
        '..',
        'keys',
        'public.pem'
    )
)

exports.signIn = async (req, res) => {
    try {
        const {
            emailAddress,
            sapId,
            password
        } = req.body

        const filter = {

        }
        emailAddress ? filter.emailAddress = emailAddress : null
        sapId ? filter.sapId = sapId : null

        const response = await User.findOne(filter)

        if (!response)
            return res.status(401).json({
                error: true,
                message: 'User / Password Incorrect!'
            })

        const checkHash = await isPasswordValid(password, response.salt, response.encpy_password)

        if (!checkHash)
            return res.status(401).json({
                error: true,
                message: 'User / Password Incorrect!'
            })

        response.salt = undefined
        response.encpy_password = undefined

        const token = jwt.sign(
            {
                _id: response._id,
                user: response
            },
            PRIVATEKEY,
            {
                algorithm: 'RS256',
                allowInsecureKeySizes: true,
                expiresIn: '1d'
            }
        )

        let time = new Date()

        time.setTime(time.getTime() + 3600 * 24 * 1000)

        res.cookie(process.env.AUTH_COOKIE_NAME, token, {
          expire: time,
          path: "/",
          domain: process.env.DOMAIN,
        })

        res.status(200).json({
            success: true,
            message: 'Logged In!',
            dbRes: response,
            token: token
        })

    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        return res.status(400).json({
            error: true,
            message: 'An Unexpected Error Occured!',
            errorJSON: err,
            errorString: err.message || err.toString()
        })
    }
}

exports.signUp = async (req, res) => {
    try {

        const {
            sapId,
            firstName,
            lastName,
            userName,
            emailAddress,
            role
        } = req.body

        const salt = crypto.randomUUID()

        const password = Math.random().toString(36).slice(-6)

        const encpy_password = await hashPassword(password, salt)

        const user = new User({
            sapId: sapId,
            firstName: firstName,
            lastName: lastName,
            userName: userName,
            emailAddress: emailAddress,
            salt: salt,
            encpy_password: encpy_password,
            role: role ? role : ''
        })

        const response = await user.save()

        response.salt = undefined
        response.encpy_password = undefined

        sendMail({
            to: response.emailAddress,
            subject: "Welcome To DataNest",
            html: `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome To DataNest</title>
                <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f7;
                    margin: 0;
                    padding: 0;
                }
                .email-container {
                    max-width: 600px;
                    background-color: #ffffff;
                    margin: 40px auto;
                    padding: 20px;
                    border-radius: 8px;
                }
                h1 {
                    color: #333333;
                }
                p {
                    color: #555555;
                    line-height: 1.6;
                }
                a.reset-btn {
                    display: inline-block;
                    background-color: #007bff;
                    color: white;
                    padding: 12px 18px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: bold;
                    margin-top: 10px;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    color: #888888;
                    font-size: 12px;
                }
                </style>
            </head>
            <body>
                <div class="email-container">
                <h1>Welcome to SRE Portal, ${response.firstName}!</h1>
                <p>
                    Your account has been successfully created. Below are your login details:
                </p>
                <p><strong>Email:</strong> ${response.emailAddress}</p>
                <p><strong>Password:</strong> <span style="color: #007bff;">${password}</span></p>
        
                <p>Thanks,<br>The SRE Portal Team</p>
                </div>
            </body>
            </html>`
        })


        res.status(201).json({
            success: true,
            message: 'User Created Successfully!',
            dbRes: response
        })


    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        return res.status(400).json({
            error: true,
            message: 'An Unexpected Error Occured!',
            errorJSON: err,
            errorString: err.message || err.toString()
        })
    }
}

exports.addFacultyBulk = async (req, res) => {
    try {

        const filePath = req.file.path

        const faculties = new Array()
        const emailFaculties = new Array()
        
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', async (row) => {
                console.log(row)

                try {
                    const salt = randomUUID()
                    const password = Math.random().toString(36).slice(-6)
                    const encpy_password = await hashPassword(password, salt)
                    const faculty = {
                        sapId: row.row.sapId,
                        firstName: row.firstName,
                        lastName: row.lastName,
                        userName: row.emailAddress.split('@')[0],
                        emailAddress: row.emailAddress,
                        salt: salt,
                        encpy_password: encpy_password,
                        role: 'FACULTY'
                    }
                    const emailFaculty = {
                        sapId: row.sapId,
                        firstName: row.firstName,
                        lastName: row.lastName,
                        emailAddress: row.emailAddress,
                        role: 'FACULTY',
                        password: password
                    }
                    faculties.push(faculty)
                    emailFaculties.push(emailFaculty)
                }catch(err) {
                    logger.error(`Error: ${err.message || err.toString()}`)
                }
            })
            .on('end', async () => {
                try {
                    if(faculties.length === 0){
                        return res.status(400).json({
                            error: true,
                            message: 'An Unexpected Error Occured!',
                        }) 
                    }
                    await User.insertMany(faculties);
                    logger.info(`${faculties.length} faculty were successfully imported.`)
                    

                    return res.status(201).json({
                        success: true,
                        message: `${faculties.length} faculty were imported!`
                    })

                } catch (err) {
                    logger.error(`Error: ${err.message || err.toString()}`)
                    return res.status(400).json({
                        error: true,
                        message: 'An Unexpected Error Occured!',
                        errorJSON: err,
                        errorString: err.message || err.toString()
                    })
                }
            })


    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurrred",
            errorJSON: err,
            errorString: err.toString()
        })

    }
}

exports.requestChangePassword = async (req, res) => {

    try {

        const {

            emailAddress

        } = req.body

        const tokenString = randomUUID()

        const resetPasswordToken = jwt.sign(
            {
                _id: tokenString,
            },
            PRIVATEKEY,
            {
                algorithm: 'RS256',
                allowInsecureKeySizes: true,
                expiresIn: '1h'
            }
        )

        const response = await User.findOneAndUpdate(
            {
                emailAddress: emailAddress
            },
            {
                $set: {
                    resetPassword: true,
                    resetPasswordToken: tokenString
                }
            },
            {
                new: true
            }
        )

        sendMail({
            to: response.emailAddress,
            subject: "Password Reset Request",
            html: `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset Request</title>
                <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f7;
                    margin: 0;
                    padding: 0;
                }
                .email-container {
                    max-width: 600px;
                    background-color: #ffffff;
                    margin: 40px auto;
                    padding: 20px;
                    border-radius: 8px;
                }
                h1 {
                    color: #333333;
                }
                p {
                    color: #555555;
                    line-height: 1.6;
                }
                a.reset-btn {
                    display: inline-block;
                    background-color: #007bff;
                    color: white;
                    padding: 12px 18px;
                    text-decoration: none;
                    border-radius: 4px;
                    font-weight: bold;
                    margin-top: 10px;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    color: #888888;
                    font-size: 12px;
                }
                </style>
            </head>
            <body>
                <div class="email-container">
                <h1>Password Reset Request</h1>
                <p>Hi ${response.firstName},</p>
                <p>
                    You recently requested to reset your password for your account. Click the button below to reset it.
                    This password reset is valid for the next <strong>60 minutes</strong>.
                </p>
                <p style="text-align: center;">
                    <a href='${process.env.PROTOCOL}://${process.env.DOMAIN}/reset?token=${resetPasswordToken}' class="reset-btn">Reset Your Password</a>
                </p>
                <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
                <p>Thanks,<br>The DataNest Team</p>
                <div class="footer">
                    <p>If you're having trouble clicking the password reset button, copy and paste this link into your browser:</p>
                    <p>${process.env.PROTOCOL}://${process.env.DOMAIN}/reset?token=${resetPasswordToken}</p>
                    <p>Need help? Contact us at <a href="mailto:singh.bhupender@proton.me">singh.bhupender@proton.me</a></p>
                </div>
                </div>
            </body>
            </html>`
        })

        res.json({
            success: true,
            changePassword: true,
            message: 'Password Change Requested!',
        })

    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        return res.status(400).json({
            error: true,
            message: 'An Unexpected Error Occured!',
            errorJSON: err,
            errorString: err.message || err.toString()
        })
    }
}

exports.changePassword = async (req, res) => {
    try {

        const {
            resetPasswordToken,
            password
        } = req.body

        const decodeToken = jwt.verify(
            resetPasswordToken,
            PUBLICKEY,
            {
                algorithms: ['RS256']
            }
        )

        if(!decodeToken)
            return res.status(401).json({
                error: true,
                message: 'Reset Password Token Invalid!'
            })  
            
        const response = await User.findOne({
            resetPasswordToken: decodeToken._id
        })

        if (!response)
            return res.status(401).json({
                error: true,
                message: 'Reset Password Token Invalid!'
            })        
        
        const encpy_password = await hashPassword(password, response.salt)

        const update = await User.updateOne(
            {
                _id: response._id
            },
            {
                $set: {
                    encpy_password: encpy_password,
                    resetPasswordToken: null
                }
            }
        )

        res.json({
            success: true,
            message: 'Password Changed!',
            dbRes: update,
            redirect: true
        })

    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        return res.status(400).json({
            error: true,
            message: 'An Unexpected Error Occured!',
            errorJSON: err,
            errorString: err.message || err.toString()
        })
    }
}

exports.loggout = async (req, res) => {

    try {

        res.clearCookie(
            process.env.AUTH_COOKIE_NAME,
            {
                path: '/',
                domain: process.env.DOMAIN,
            }
        )

        res.send("<script>window.location.href = '/'</script>")

    } catch (err) {

        logger.error(`Error: ${err.message || err.toString()}`)
        return res.status(500).json({
            error: true,
            message: 'An Unexpected Error Occured!',
            errorJSON: err,
            errorString: err.message || err.toString()
        })

    }
}


