const csvParser = require("csv-parser")
const Handlebars = require('handlebars')
const Deck = require('../models/deck')
const User = require("../models/user")
const QRCode = require('qrcode')
const exphbs = require("express-handlebars")
const fs = require("fs-extra")
const path = require("path")
const puppeteer = require('puppeteer')

const { getTemplate } = require("./emailTemplate")
const sendMail = require('../utils/mailer')
const logger = require('../utils/logger')

const renderTemplate = async (templateName, data) => {
    const hbs = exphbs.create()
    const templatePath = path.join(__dirname, "views", `${templateName}.hbs`)
    const templateContent = await fs.readFile(templatePath, "utf8")
    const compiledTemplate = hbs.handlebars.compile(templateContent)
    return compiledTemplate(data)
}

exports.generatePampletsPdf = async (req, res) => {
    try {
        const {
            pagee,
            limit,
            examName
        } = req.query


        const options = {
            page: pagee ? parseInt(pagee) : 1,
            limit: limit ? parseInt(limit) : 10,
            lean:true,
            populate: [
                {
                    path: 'evaluator',
                }
            ]
        }

        const response = await Deck.paginate({}, options)
        const updatedResponse = await Promise.all(
            response.docs.map(async (item) => {
                const qrCodeData = item.qrCodeString
                const qrCodeUrl = await QRCode.toDataURL(qrCodeData)
                const examDate = new Date(item.examDate * 1000).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                })               
                const examTime = item.shiftOfExam === 'MORNING' ? '10:00AM' : '2:00PM'
                return {
                    ...item,
                    qrCode: qrCodeUrl,
                    examDate: examDate,
                    examTime: examTime,
                }
            })
        )
        const data = {
            data: updatedResponse,
            logo: 'http://localhost:8000/upes.svg',
            examName: examName
        }
        const html = await renderTemplate("pdf", data)

        const browser = await puppeteer.launch()

        const page = await browser.newPage()
        await page.setContent(html, {
            waitUntil: 'networkidle2'
        })
        await page.pdf({
            path: path.join(__dirname, '..', 'public', 'pamplets.pdf'),
            margin: {
                left: '5mm',
                right: '5mm',
            }
        })

        await browser.close()
        res.sendFile(path.join(__dirname, '..', 'public', 'pamplets.pdf'))
        
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

exports.generatePamplets = async (req, res) => {
    try {
        const {
            page,
            limit,
            examName
        } = req.query


        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
            lean:true,
            populate: [
                {
                    path: 'evaluator',
                }
            ]
        }

        const response = await Deck.paginate({}, options)

        const updatedResponse = await Promise.all(
            response.docs.map(async (item) => {
                const qrCodeData = item.qrCodeString
                const qrCodeUrl = await QRCode.toDataURL(qrCodeData)
                const examDate = new Date(item.examDate * 1000).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                })
                const examTime = item.shiftOfExam === 'MORNING' ? '10:00AM' : '2:00PM'
                return {
                    ...item,
                    qrCode: qrCodeUrl,
                    examDate: examDate,
                    examTime: examTime,
                    examName: examName
                }
            })
        )
        const data = {
            data: updatedResponse,
            logo: '/upes.svg',

        }

        const html = await renderTemplate("pdf", data)

        res.send(html)

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

    const filePath = req.file.path
    const rows = []
    const insertedDecks = []

    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject)
        })


        for (const row of rows) {
            const evaluator = await User.findOne({ emailAddress: row['Evaluator Email'] })

            if (!evaluator) throw new Error(`Evaluator not found: ${row['Evaluator Email']}`)

            const deck = {
                examDate: Math.floor(new Date(row['Date']).getTime() / 1000),
                programName: row['Program Name'],
                courseCode: row['Course Code'],
                courseName: row['Course'],
                school: row['School'],
                evaluator: evaluator._id,
                packetNumber: row['Packet No.'],
                semester: row['Sem'],
                studentCount: row['ST.Count'],
                rackNumber: row['Rack No.'],
                numberOfAnswerSheets: 0,
                roomNumber: row['Room'],
                shiftOfExam: row['Time'] === 'M' ? 'MORNING' : 'EVENING',
                qrCodeString: `${row['School']}_${row['Date']}_${row['Time']}_${row['Course Code']}_${row['Room']}_${row['Program Name']}_${evaluator.firstName} ${evaluator.lastName}_St.Count_${row['ST.Count']}_Packet_${row['Packet No.']}`
            }

            const createdDeck = await Deck.create(deck)
            insertedDecks.push(createdDeck._id) 
        }

        return res.status(201).json({
            success: true,
            message: 'Decks were imported successfully!',
            deckCount: insertedDecks.length
        })

    } catch (err) {
        if (insertedDecks.length > 0) {
            await Deck.deleteMany({ _id: { $in: insertedDecks } })
        }

        logger.error(`Upload Error: ${err.message || err.toString()}`)
        return res.status(500).json({
            success: false,
            message: 'Failed to upload decks.',
            error: err.message || err.toString()
        })
    }
}

exports.getDecks = async (req, res) => {
    try {
        const {
            page,
            limit,
            sortBy,
            sortOrder,
            search
        } = req.query


        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
            sort: {
                [sortBy || 'courseName']: sortOrder === 'desc' ? -1 : 1
            },
            populate: [
                {
                    path: 'evaluator',
                    select: 'firstName lastName emailAddress sapId'
                }
            ]
        }

        let query = {}

        if (search) {
            query = {
                $or: [
                    {
                        programName: {
                            $regex: search, $options: 'i'
                        }
                    },
                    {
                        courseCode: {
                            $regex: search, $options: 'i'
                        }
                    },
                    {
                        courseName: {
                            $regex: search, $options: 'i'
                        }
                    },
                    {
                        school: {
                            $regex: search, $options: 'i'
                        }
                    },
                    {
                        semester: {
                            $regex: search, $options: 'i'
                        }
                    },
                    {
                        statusOfDeck: {
                            $regex: search, $options: 'i'
                        }
                    },
                    {
                        qrCodeString: {
                            $regex: search, $options: 'i'
                        }
                    }
                ]
            }
        }

        const response = await Deck.paginate(query, options)

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

exports.updateDeck = async (req, res) => {
    try {

        const {
            deckId,
            update
        } = req.body

        const response = await Deck.findByIdAndUpdate(
            {
                _id: deckId
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

exports.deleteAllDecks = async (req, res) => {
    try {

        const response = await Deck.deleteMany({})

        res.json({
            success: true,
            message: `Deleted All!`,
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

        const { action } = req.query
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

        action === 'pickup' ? update.statusOfDeck = 'PICKED_UP' : null
        action === 'drop' ? update.statusOfDeck = 'DROPPED' : null

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
    try {
        const response = await this.sendReminderToDrop()
        if (response.error)
            return res.status(400).json({
                error: true,
                message: "An Unexpected Error Occurrred",
            })

        res.json({
            success: true,
            message: 'Reminders Sent!'
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


exports.sendReminderToDrop = async () => {
    try {

        const currentTime = Math.floor(new Date().getTime() / 1000)

        const sevenDaysAgo = currentTime - 7 * 24 * 60 * 60

        const response = await Deck.find(
            {
                pickUpTimestamp: { $lt: sevenDaysAgo },
                statusOfDeck: 'PICKED_UP',
                numberOfAnswerSheets: { $gt: 0 }
            }
        ).populate('evaluator')

        response.map(async (data) => {
            try {
                const emailTemplate = await getTemplate('REMINDER')
                if (!emailTemplate)
                    return logger.error('Cannot Find Email Template')

                const emailData = {
                    evaluatorName: data.evaluator.firstName + " " + data.evaluator.lastName,
                    examDate: new Date(data.examDate * 1000).toLocaleDateString(),
                    programName: data.programName,
                    courseCode: data.courseCode,
                    courseName: data.courseName,
                    totalStudent: data.studentCount,
                    numberOfPresentStudent: data.numberOfAnswerSheets,
                    numberOfAnswerSheets: data.numberOfAnswerSheets,
                    examShift: data.shiftOfExam,
                    qrCodeString: data.qrCodeString
                }

                const template = Handlebars.compile(emailTemplate.html)
                const subject = Handlebars.compile(emailTemplate.subject)

                const emailTemplateWithData = template(emailData)
                const emailSubjectWithData = subject(emailData)
console.log(data)
                sendMail({
                    to: `${data.evaluator.emailAddress}`,
                    subject: emailSubjectWithData,
                    html: emailTemplateWithData
                })
            } catch (err) {
                logger.error(`Error: ${err.message || err.toString()}`)
            }

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
    try {

        const response = await Deck.find({
            numberOfAnswerSheets: { $gt: 0 }
        }).populate('evaluator')

        response.map(async (data) => {
            try {
                const emailTemplate = await getTemplate('ASSIGNED')
                if (!emailTemplate)
                    return logger.error('Cannot Find Email Template')

                const emailData = {
                    evaluatorName: data.evaluator.firstName + " " + data.evaluator.lastName,
                    examDate: new Date(data.examDate * 1000).toLocaleDateString(),
                    programName: data.programName,
                    courseCode: data.courseCode,
                    courseName: data.courseName,
                    totalStudent: data.studentCount,
                    numberOfPresentStudent: data.numberOfAnswerSheets,
                    numberOfAnswerSheets: data.numberOfAnswerSheets,
                    examShift: data.shiftOfExam,
                    qrCodeString: data.qrCodeString
                }

                const template = Handlebars.compile(emailTemplate.html)
                const subject = Handlebars.compile(emailTemplate.subject)

                const emailTemplateWithData = template(emailData)
                const emailSubjectWithData = subject(emailData)
                console.log(data)
                sendMail({
                    to: `${data.evaluator.emailAddress}`,
                    subject: emailSubjectWithData,
                    html: emailTemplateWithData
                })
            } catch (err) {
                logger.error(`Error: ${err.message || err.toString()}`)
            }

        })


        res.status(202).json({
            success: true,
            message: "Mail Request Sent!"
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