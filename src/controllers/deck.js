const csvParser = require("csv-parser")
const Handlebars = require('handlebars')
const Deck = require('../models/deck')
const User = require("../models/user")
const QRCode = require('qrcode')
const exphbs = require("express-handlebars")
const fs = require("fs-extra")
const path = require("path")
const puppeteer = require('puppeteer')
const { Parser } = require('json2csv')
const { Types } = require('mongoose')

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
            lean: true,
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
            logo: '/upes.png',
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

exports.countDecks = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            schoolName
        } = req.query


     

        const schools = schoolName ? schoolName.split(",") : false

        const query = {
            examDate: {
                $gte: startDate || 1,
                $lte: endDate || Infinity
            }
        }

        schools ? query.school = schools : null


        const response = await Deck.countDocuments(query)

        res.json({
            success: true,
            message: 'Deck Counted',
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

exports.generatePamplets = async (req, res) => {
    try {
        const {
            page,
            limit,
            examName,
            startDate,
            endDate,
            schoolName
        } = req.query


        const options = {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
            lean: true,
            populate: [
                {
                    path: 'evaluator',
                }
            ]
        }

        const schools = schoolName ? schoolName.split(",") : false

        const query = {
            examDate: {
                $gte: startDate,
                $lte: endDate
            }
        }

        schools ? query.school = schools : null


        const response = await Deck.paginate(query, options)

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
            logo: '/upes.png',

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

    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', (row) => rows.push(row))
                .on('end', resolve)
                .on('error', reject)
        })
        let insertedDecks = []
        let errorArray = []

        for (const row of rows) {
            try {
                const evaluator = await User.findOne({ emailAddress: row['Evaluator Email'] })

                if (!evaluator || row['Evaluator Email'] == '') {
                    row.error = "Evaluator Doesn't Exist"
                    errorArray.push(row)
                    continue
                }

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
                    qrCodeString: `${row['School']}_${row['Date']}_${row['Time']}_${row['Course Code']}_${row['Room']}_${row['Program Name']}_St.Count_${row['ST.Count']}_Packet_${row['Packet No.']}_${new Types.ObjectId()}`
                }

                const createdDeck = await Deck.create(deck)
                insertedDecks.push(createdDeck._id)

            } catch (err) {
                row.error = err.message || 'Unknown Error'
                errorArray.push(row)
            }
        }

        const fields = Object.keys(errorArray[0])

        const json2csvParser = new Parser({ fields })
        const csv = json2csvParser.parse(errorArray)

        const fileNamePath = path.join(__dirname, '..', '..', 'public', 'static', 'error-data.csv')
        fs.writeFileSync(fileNamePath, csv)


        return res.status(201).json({
            success: true,
            message: `Decks were ${insertedDecks.length} imported successfully! & ${errorArray.length} decks failed.`,
            deckCount: rows.length,
            errorFile: '/static/error-data.csv'
        })

    } catch (err) {
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

exports.tempDeleteData = async (req, res) => {
    try {
        const cutoffDate = new Date('2025-05-15T00:00:00Z').getTime() / 1000

        const result = await Deck.find({
            examDate: { $gte: cutoffDate },
            $or: [
                {
                    school: 'SOCS'
                },
                {
                    school: 'SOHST'
                }
            ]
        })

        res.json({ count: result })



        console.log(`Deleted ${result.deletedCount} decks with exam on or after 14 May 2025`);
    } catch (err) {
        res.status(500).json({ error: true })
    }
}


exports.exportDecks = async (req, res) => {
    try {

        const { sortBy = 'createdAt', sortOrder = 'desc', search } = req.query

        let query = {}

        if (search) {
            query.$or = [
                { programName: { $regex: search, $options: 'i' } },
                { courseCode: { $regex: search, $options: 'i' } },
                { courseName: { $regex: search, $options: 'i' } },
                { school: { $regex: search, $options: 'i' } },
                { semester: { $regex: search, $options: 'i' } },
                { statusOfDeck: { $regex: search, $options: 'i' } },
                { qrCodeString: { $regex: search, $options: 'i' } }
            ]
        }

        const response = await Deck.find(query)
            .populate({
                path: 'evaluator',
                select: 'firstName lastName emailAddress sapId'
            })
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .lean()

        function formatDateOnly(value) {
            if (!value) return ''
            const date = new Date(value * 1000)
            return isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN', { dateStyle: 'short' })
        }

        function formatDateTime(value) {
            if (!value) return ''
            const date = new Date(value * 1000)
            return isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
        }
        const data = response.map(item => {


            return {
                ...item,
                evaluatorFirstName: item.evaluator?.firstName || '',
                evaluatorLastName: item.evaluator?.lastName || '',
                evaluatorEmail: item.evaluator?.emailAddress || '',
                evaluatorSapId: item.evaluator?.sapId || '',
                ExamDate: formatDateOnly(item.examDate),
                PickUpTimestamp: formatDateTime(item.pickUpTimestamp),
                DropTimestamp: formatDateTime(item.dropTimestamp),

            }
        })

        const fields = [
            '_id',
            'programName',
            'courseCode',
            'courseName',
            'school',
            'semester',
            'statusOfDeck',
            'qrCodeString',
            'evaluatorFirstName',
            'evaluatorLastName',
            'evaluatorEmail',
            'evaluatorSapId',
            'shiftOfExam',
            'PickUpTimestamp',
            'DropTimestamp',
            'ExamDate',
            'studentCount',
            'rackNumber',
            'roomNumber',
            'packetNumber',
            'numberOfAnswerSheets',
            'examDate',
            'pickUpTimestamp',
            'dropTimestamp',
            'createdAt',
            'updatedAt'
        ]

        const json2csvParser = new Parser({ fields })
        const csv = json2csvParser.parse(data)

        res.header('Content-Type', 'text/csv')
        res.attachment(`deck-data-${new Date()}.csv`)
        res.send(csv)

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

        const response = await Deck.findOne({ qrCodeString: qrString }).populate("evaluator", "firstName lastName emailAddress")

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
            _id,
            update
        } = req.body

        const response = await Deck.findByIdAndUpdate(
            {
                _id: _id
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


exports.deleteById = async (req, res) => {
    try {

        const { deckId } = req.params
        const response = await Deck.deleteOne({ _id: deckId })

        res.json({
            success: true,
            message: `Deleted!`,
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
        ).populate("evaluator")

        let subject = '';
        if (response.statusOfDeck === 'PICKED_UP') {
            subject = `Answer Sheets Status: Picked up on ${new Date(response.pickUpTimestamp * 1000).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "long" })} (${response.qrCodeString})`;
        } else if (response.statusOfDeck === 'DROPPED') {
            subject = `Answer Sheets Status: Dropped off on ${new Date(response.dropTimestamp * 1000).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "long" })} (${response.qrCodeString})`;
        }
        sendMail({
            to: `${response.evaluator.emailAddress}`,
            subject: subject,
            html: `
                <html>
                    <body>
                        <h3>Answer Sheets Notification</h3>
                        <p>Dear ${response.evaluator.firstName},</p>
                        ${response.statusOfDeck == 'PICKED_UP' ? `<p>The answer sheets have been <strong>picked up</strong> on <strong>${new Date(response.pickUpTimestamp * 1000).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "long" })}</strong>.</p>` : ''}
                        ${response.statusOfDeck == 'DROPPED' ? `<p>The answer sheets have been <strong>dropped off</strong> on <strong>${new Date(response.dropTimestamp * 1000).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "long" })}</strong>.</p>` : ''}

                        <p>Details:</p>
                        <table border="1" cellpadding="5" cellspacing="0">
                            <tr>
                                <td><strong>QR Code</strong></td>
                                <td>${response.qrCodeString}</td>
                            </tr>
                            <tr>
                                <td><strong>Status</strong></td>
                                <td>${response.statusOfDeck}</td>
                            </tr>
                            <tr>
                                <td><strong>Number Of Total Students</strong></td>
                                <td>${response.studentCount}</td>
                            </tr>
                            <tr>
                                <td><strong>Number Of Students Present</strong></td>
                                <td>${response.numberOfAnswerSheets}</td>
                            </tr>
                        </table>
                        <p>Please take the necessary actions if required.</p>
                        <p>Regards,<br/>COE Team</p>
                        <p style="font-size:4px;">*This is an automated mail*</p>
                    </body>
                </html>
            `
        })

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
            numberOfAnswerSheets: { $gt: 0 },
            statusOfDeck: "PENDING"
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