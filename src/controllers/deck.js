const csvParser = require("csv-parser")
const fs = require('fs')

const Deck = require('../models/deck')
const User = require("../models/user")
const School = require('../models/school')

const sendMail = require('../utils/mailer')

const logger = require('../utils/logger')

exports.addDeck = async (req, res) => {
    try {

        const {
            examDateTime,
            programName,
            courseCode,
            courseName,
            school,
            evaluator,
            packetNumber,
            roomNumber,
            semester,
            studentCount,
            numberOfAnswerSheets,
            rackNumber,
        } = req.body

        const deck = new Deck(
            {
                examDateTime: Math.floor(new Date(examDateTime).getTime() / 1000),
                programName,
                courseCode,
                courseName,
                school,
                evaluator,
                packetNumber,
                roomNumber,
                semester,
                studentCount,
                numberOfAnswerSheets,
                rackNumber,
                qrCodeString: `${programName}_${courseName}_${courseCode}_${rackNumber}_${roomNumber}_${semester}`
            }
        )

        const response = await deck.save()

        res.status(201).json({
            success: true,
            message: 'Deck Created',
            dbRes: response
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

exports.uploadDeck = async (req, res) => {
    try {

        const filePath = req.file.path

        const decks = new Array()


        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', async (row) => {
                try {

                    const evaluator = await User.findOne(
                        {
                            emailAddress: row.evaluatorEmail
                        }
                    )
                    const school = await School.findOne(
                        {
                            shortName: row.schoolName
                        }
                    )
                   
                    const deck = {
                        examDate: Math.floor(new Date(row.examDate).getTime() / 1000),
                        programName: row.programName,
                        courseCode: row.courseCode,
                        courseName: row.courseName,
                        school: school._id,
                        evaluator: evaluator._id,
                        packetNumber: row.packetNumber,
                        semester: row.semester,
                        studentCount: row.studentCount,
                        rackNumber: row.rackNumber,
                        numberOfAnswerSheets: row.numberOfAnswerSheets,
                        roomNumber: row.roomNumber,
                        shiftOfExam: row.shift === 'M' ? 'MORNING' : 'EVENING',
                        qrCodeString: `${row.schoolName}_${row.examDate}_${row.shift}_${row.courseCode}_${row.roomNumber}_${row.programName}_${evaluator.firstName} ${evaluator.lastName}_St.Count_${row.studentCount}`
                        // SOAE_02.12.2024_E_CHEM8048_11013_MSc_Chem_Jimmy Mangalam_St.Count_1


                    }
                    console.log(deck)
                    await Deck.create(deck)
                } catch (err) {
                    logger.error(`Error: ${err.message || err.toString()}`)
                    console.log(err)
                }
            })
            .on('end', async () => {

                return res.status(201).json({
                    success: true,
                    message: `Decks were imported!`
                })
            })


    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        console.log(err)
        res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurrred",
            errorJSON: err,
            errorString: err.toString()
        })

    }
}

exports.getDecks = async (req, res) => {
    try {
        const {
            page,
            limit,
        } = req.query


        const options = {
            page: page ? page : 1,
            limit: limit ? limit : 10,
            sort: { schoolName: 1 },
            populate: [
                {
                    path: 'evaluator',
                    select: 'firstName lastName emailAddress sapId'
                },
                {
                    path: 'school'
                }
            ]
        }

        const response = await Deck.paginate({}, options)

        res.json({
            success: true,
            message: `Decks Fetched From PAGE:${page ? page : 1}`,
            dbRes: response
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

exports.getAssingedDecks = async (req, res) => {
    try {

        const user = await User.findOne({ _id: req.auth._id })
        const response = await Deck.find({ evaluatorEmail: user.emailAddress })
        if (response.length === 0)
            return res.status(404).json({
                error: true,
                message: 'cannot find'
            })

        res.json({
            success: true,
            message: `Fetched Assigend!`,
            dbRes: response
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

exports.getDeckById = async (req, res) => {
    try {

        const {
            qrString
        } = req.params

        const response = await Deck.findOne({ qrCodeString: qrString })

        if (!response)
            return res.status(404).json({
                error: true,
                message: `Deck not found`
            })

        res.json({
            success: true,
            message: `Deck Found!`,
            dbRes: response
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

exports.changeAnswerSheetCount = async (req, res) => {
    try {

        const {
            qrCodeString,
            numberOfAnswerSheets
        } = req.body

        const deck = await Deck.findOne({ qrCodeString: qrCodeString }).populate('evaluator')

        if (!deck)
            return res.status(404).json({
                error: true,
                message: `Cannot Find Deck With ID:${qrCodeString}`
            })


        const update = {
            numberOfAnswerSheets: numberOfAnswerSheets
        }

        const response = await Deck.findByIdAndUpdate(
            {
                _id: deck._id
            },
            update,
            {
                new: true
            }
        )

        
        res.json({
            success: true,
            message: `Updated!`,
            dbRes: response
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

exports.changeStatusOfDeck = async (req, res) => {
    try {

        const {
            qrCodeString
        } = req.body

        const deck = await Deck.findOne({ qrCodeString: qrCodeString })

        if (!deck)
            return res.status(404).json({
                error: true,
                message: `Cannot Find Deck With ID:${qrCodeString}`
            })


        const update = {}

        deck.statusOfDeck === 'PENDING' ? update.statusOfDeck = 'PICKED_UP' : null
        deck.statusOfDeck === 'PICKED_UP' ? update.statusOfDeck = 'DROPPED' : null

        update.statusOfDeck === 'PICKED_UP' ? update.pickUpTimestamp = Math.floor(new Date().getTime() / 1000) : null
        update.statusOfDeck === 'DROPPED' ? update.dropTimestamp = Math.floor(new Date().getTime() / 1000) : null            

        const response = await Deck.findByIdAndUpdate(
            {
                _id: deck._id
            },
            update,
            {
                new: true
            }
        )

        res.json({
            success: true,
            message: `Updated!`,
            dbRes: response
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

exports.manualReminderToDrop = async (req, res) => {
    try{
        const response = await this.sendReminderToDrop()
        if(response.error) 
            return res.status(400).json({
                error: true,
                message: "An Unexpected Error Occurrred",
            })

        res.json({
            success: true,
            message: 'Reminders Sent!'
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

exports.sendReminderToDrop = async () => {
    try {

        const currentTime = Math.floor(new Date().getTime() / 1000)

        const sevenDaysAgo = currentTime - 7 * 24 * 60 * 60

        const response = await Deck.find(
            {
                pickUpTimestamp: { $lt: sevenDaysAgo },
                statusOfDeck: 'PICKED_UP'
            }
        ).populate('evaluator')
        response.map((deck) => {
            let html
            if(deck)
            sendMail(
                {
                    to: `${deck.evaluator.emailAddress}`,
                    subject: `Reminder To Submit The Answer Sheets`,
                    html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Assigned Deck Notification</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background-color: #f4f4f4;
                                margin: 0;
                                padding: 0;
                            }
                            .container {
                                max-width: 600px;
                                margin: 20px auto;
                                background: #ffffff;
                                padding: 20px;
                                border-radius: 8px;
                                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                            }
                            .header {
                                background-color: #0073e6;
                                color: white;
                                padding: 15px;
                                text-align: center;
                                font-size: 20px;
                                border-radius: 8px 8px 0 0;
                            }
                            .content {
                                padding: 20px;
                                font-size: 16px;
                                color: #333;
                                line-height: 1.5;
                            }
                            .footer {
                                margin-top: 20px;
                                font-size: 14px;
                                color: #666;
                                text-align: center;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">Reminder To Submit Answer Sheets</div>
                            <div class="content">
                                <p>Dear ${deck.evaluator.firstName},</p>
                                <p>Reminder to submit the answer sheets. Please find the details below:</p>
                                <p><strong>Course Name:</strong> ${deck.courseName}</p>
                                <p><strong>Course Code:</strong> ${deck.courseCode}</p>
                                <p><strong>Room Number:</strong> ${deck.roomNumber}</p>
                                <p><strong>Exam Date & Time:</strong> ${deck.examDateTime}</p>
                                <p><strong>Total Students:</strong> ${deck.studentCount}</p>
                                <p><strong>Number Of Answer Sheets:</strong> ${deck.numberOfAnswerSheets}</p>
        
                                <p>If you have any questions, feel free to reach out.</p>
                                <p>Best Regards,<br>SRE Department UPES</p>
                            </div>
                        </div>
                    </body>
                    </html>
                    `
                }
            )
        })

        return {
            success: true
        }


    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        return {
            error: true,
            message: 'Unexpected Error Occured!'
        }
    }
}

exports.sendAssignmentMail = async (req, res) => {
    try{

        const response = await Deck.find({
            numberOfAnswerSheets: {
                $gt: 0
            }
        }).populate('evaluator')
        

        response.map((data) => {
            sendMail({
                to: `${data.evaluator.emailAddress}`,
                subject: `Deck Assigned For Evluation ${data.qrCodeString}`,
                html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Assigned Deck Notification</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background-color: #f4f4f4;
                            margin: 0;
                            padding: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 20px auto;
                            background: #ffffff;
                            padding: 20px;
                            border-radius: 8px;
                            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            background-color: #0073e6;
                            color: white;
                            padding: 15px;
                            text-align: center;
                            font-size: 20px;
                            border-radius: 8px 8px 0 0;
                        }
                        .content {
                            padding: 20px;
                            font-size: 16px;
                            color: #333;
                            line-height: 1.5;
                        }
                        .footer {
                            margin-top: 20px;
                            font-size: 14px;
                            color: #666;
                            text-align: center;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">Assigned Deck of Sheets</div>
                        <div class="content">
                            <p>Dear ${deck.evaluator.firstName},</p>
                            <p>You have been assigned a new deck of sheets for review and feedback. Please find the details below:</p>
                            <p><strong>Course Name:</strong> ${data.courseName}</p>
                            <p><strong>Course Code:</strong> ${data.courseCode}</p>
                            <p><strong>Room Number:</strong> ${data.roomNumber}</p>
                            <p><strong>Exam Date & Time:</strong> ${data.examDateTime}</p>
                            <p><strong>Total Students:</strong> ${data.studentCount}</p>
                            <p><strong>Number Of Answer Sheets:</strong> ${data.numberOfAnswerSheets}</p>
    
                            <p>Please pick up the assigned deck from the SRE department.</p>
                            <p>If you have any questions, feel free to reach out.</p>
                            <p>Best Regards,<br>SRE Department UPES</p>
                        </div>
                    </div>
                </body>
                </html>
                `
            })
    
        })
        

        res.status(202).json({
            success: true,
            message: "Mail Request Sent!"
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