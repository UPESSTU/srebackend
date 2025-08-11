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
                $gte: startDate,
                $lte: endDate
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
                const examDate = new Date(item.examDate * 1000).toLocaleDateString("en-IN", {
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
        if(errorArray.length > 0) {
            const fields = Object.keys(errorArray[0])

            const json2csvParser = new Parser({ fields })
            const csv = json2csvParser.parse(errorArray)

            const fileNamePath = path.join(__dirname, '..', '..', 'public', 'static', 'error-data.csv')

            console.log(fileNamePath)
            fs.writeFileSync(fileNamePath, csv)
        }

        return res.status(201).json({
            success: true,
            message: `Decks were ${insertedDecks.length} imported successfully! & ${errorArray.length} decks failed.`,
            deckCount: rows.length,
            errorFile: errorArray.length > 0 ? '/static/error-data.csv' : null
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
            search,
            // Individual field filters
            examDate,
            programName,
            school,
            evaluatorName,
            statusOfDeck,
            packetNumber,
            roomNumber,
            semester,
            studentCount,
            rackNumber,
            qrCodeString,
            numberOfAnswerSheets
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

        // Handle general search
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

        // Handle individual field filters
        if (examDate) {
            // Handle formatted date string like "12/25/2024" or "25/12/2024"
            try {
                const dateObj = new Date(examDate);
                if (!isNaN(dateObj.getTime())) {
                    const timestamp = Math.floor(dateObj.getTime() / 1000);
                    query.examDate = timestamp;
                }
            } catch (err) {
                logger.error(`Date parsing error: ${err.message}`);
            }
        }
        if (programName) {
            query.programName = { $regex: programName, $options: 'i' };
        }
        if (school) {
            query.school = { $regex: school, $options: 'i' };
        }
        if (statusOfDeck) {
            query.statusOfDeck = statusOfDeck;
        }
        if (packetNumber) {
            query.packetNumber = packetNumber;
        }
        if (roomNumber) {
            query.roomNumber = roomNumber;
        }
        if (semester) {
            query.semester = semester;
        }
        if (studentCount) {
            query.studentCount = parseInt(studentCount);
        }
        if (rackNumber) {
            query.rackNumber = rackNumber;
        }
        if (qrCodeString) {
            query.qrCodeString = { $regex: qrCodeString, $options: 'i' };
        }
        if (numberOfAnswerSheets) {
            query.numberOfAnswerSheets = parseInt(numberOfAnswerSheets);
        }

        // Handle evaluator filtering after population
        let evaluatorEmailFilter = null;
        if (evaluatorName) {
            evaluatorEmailFilter = evaluatorName;
        }

        const response = await Deck.paginate(query, options)

        // Filter by evaluator email if needed (since it's a populated field)
        if (evaluatorEmailFilter) {
            response.docs = response.docs.filter(doc => 
                doc.evaluator && doc.evaluator.emailAddress === evaluatorEmailFilter
            );
            // Note: This doesn't affect totalDocs count, which might be slightly inaccurate
            // For exact count, you'd need a more complex aggregation pipeline
        }

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
        const { qrCodeString } = req.body

        const deck = await Deck.findOne({ qrCodeString: qrCodeString })

        if (!deck) {
            return res.status(404).json({
                error: true,
                message: `Cannot Find Deck With ID:${qrCodeString}`
            })
        }

        // Validation: Don't allow dropping without first picking up answer sheets
        if (action === 'drop') {
            if (deck.statusOfDeck !== 'PICKED_UP') {
                return res.status(400).json({
                    error: true,
                    message: "Cannot drop answer sheets. They must be picked up first."
                })
            }
            if (!deck.numberOfAnswerSheets || deck.numberOfAnswerSheets === 0) {
                return res.status(400).json({
                    error: true,
                    message: "Cannot drop answer sheets. No answer sheets have been picked up (numberOfAnswerSheets is 0)."
                })
            }
        }

        const update = {}

        action === 'pickup' ? update.statusOfDeck = 'PICKED_UP' : null
        action === 'drop' ? update.statusOfDeck = 'DROPPED' : null

        update.statusOfDeck === 'PICKED_UP' ? update.pickUpTimestamp = Math.floor(new Date().getTime() / 1000) : null
        update.statusOfDeck === 'DROPPED' ? update.dropTimestamp = Math.floor(new Date().getTime() / 1000) : null

        const response = await Deck.findByIdAndUpdate(
            { _id: deck._id },
            update,
            { new: true }
        ).populate("evaluator")

        // Send email only after the update is complete
        if (response.statusOfDeck === 'PICKED_UP' || response.statusOfDeck === 'DROPPED') {
            try {
                const timestamp = response.statusOfDeck === 'PICKED_UP' ? 
                    response.pickUpTimestamp : response.dropTimestamp
                
                // Get the email template from the database
                const emailTemplate = await getTemplate('STATUS_UPDATE')
                
                if (!emailTemplate) {
                    logger.error('STATUS_UPDATE email template not found')
                    return res.status(500).json({
                        error: true,
                        message: "Email template not found"
                    })
                }
                
                // Prepare data for template
                const emailData = {
                    evaluatorName: `${response.evaluator.firstName} ${response.evaluator.lastName}`,
                    statusAction: response.statusOfDeck === 'PICKED_UP' ? 'Issued' : 'Submitted',
                    timestamp: new Date(timestamp * 1000).toLocaleString("en-IN", { 
                        dateStyle: "long", 
                        timeStyle: "long", 
                        timeZone: "Asia/Kolkata"
                    }),
                    qrCodeString: response.qrCodeString,
                    status: response.statusOfDeck === 'DROPPED' ? 'Submitted' : 'Issued',
                    totalStudents: response.studentCount,
                    presentStudents: response.numberOfAnswerSheets
                }
                
                // Compile template with Handlebars
                const template = Handlebars.compile(emailTemplate.html)
                const subject = Handlebars.compile(emailTemplate.subject)
                
                const emailTemplateWithData = template(emailData)
                const emailSubjectWithData = subject(emailData)
                
                // Send email
                await sendMail({
                    to: response.evaluator.emailAddress,
                    subject: emailSubjectWithData,
                    html: emailTemplateWithData
                })
            } catch (err) {
                logger.error(`Error sending status update email: ${err.message || err.toString()}`)
                // Continue execution even if email fails
            }
        }

        return res.json({
            success: true,
            message: `Updated!`,
            dbRes: response
        })

    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        return res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurred",
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

exports.sendEmailToSelected = async (req, res) => {
    try {
        const { deckIds, emailType } = req.body;
        
        if (!deckIds || !Array.isArray(deckIds) || deckIds.length === 0) {
            return res.status(400).json({
                error: true,
                message: "Deck IDs are required"
            });
        }
        
        if (!emailType || !['ASSIGNED', 'REMINDER'].includes(emailType)) {
            return res.status(400).json({
                error: true,
                message: "Valid email type (ASSIGNED or REMINDER) is required"
            });
        }

        const decks = await Deck.find({
            _id: { $in: deckIds },
            numberOfAnswerSheets: { $gt: 0 }
        }).populate('evaluator');

        if (decks.length === 0) {
            return res.status(404).json({
                error: true,
                message: "No valid decks found for the provided IDs"
            });
        }

        const emailTemplate = await getTemplate(emailType);
        if (!emailTemplate) {
            return res.status(500).json({
                error: true,
                message: "Email template not found"
            });
        }

        let sentCount = 0;
        let errorCount = 0;

        for (const deck of decks) {
            try {
                if (!deck.evaluator || !deck.evaluator.emailAddress) {
                    errorCount++;
                    continue;
                }

                const emailData = {
                    evaluatorName: deck.evaluator.firstName + " " + deck.evaluator.lastName,
                    examDate: new Date(deck.examDate * 1000).toLocaleDateString(),
                    programName: deck.programName,
                    courseCode: deck.courseCode,
                    courseName: deck.courseName,
                    totalStudent: deck.studentCount,
                    numberOfPresentStudent: deck.numberOfAnswerSheets,
                    numberOfAnswerSheets: deck.numberOfAnswerSheets,
                    examShift: deck.shiftOfExam,
                    qrCodeString: deck.qrCodeString
                };

                const template = Handlebars.compile(emailTemplate.html);
                const subject = Handlebars.compile(emailTemplate.subject);

                const emailTemplateWithData = template(emailData);
                const emailSubjectWithData = subject(emailData);
                
                await sendMail({
                    to: deck.evaluator.emailAddress,
                    subject: emailSubjectWithData,
                    html: emailTemplateWithData
                });
                
                sentCount++;
                logger.info(`Email sent to ${deck.evaluator.emailAddress} for deck ${deck._id}`);
            } catch (err) {
                logger.error(`Error sending email for deck ${deck._id}: ${err.message || err.toString()}`);
                errorCount++;
            }
        }

        res.status(200).json({
            success: true,
            message: `Emails sent successfully. Sent: ${sentCount}, Failed: ${errorCount}`,
            sentCount,
            errorCount,
            totalRequested: deckIds.length
        });

    } catch (err) {
        logger.error(`Error in sendEmailToSelected: ${err.message || err.toString()}`);
        res.status(500).json({
            error: true,
            message: "An unexpected error occurred",
            errorJSON: err,
            errorString: err.toString()
        });
    }
};

exports.getFilterOptions = async (req, res) => {
    try {
        // Get unique values for filterable fields
        const [
            examDates,
            programNames,
            schools,
            statusOptions,
            packetNumbers,
            roomNumbers,
            semesters,
            rackNumbers,
            qrCodeStrings,
            numberOfAnswerSheets
        ] = await Promise.all([
            Deck.distinct('examDate'),
            Deck.distinct('programName'),
            Deck.distinct('school'),
            Deck.distinct('statusOfDeck'),
            Deck.distinct('packetNumber'),
            Deck.distinct('roomNumber'),
            Deck.distinct('semester'),
            Deck.distinct('rackNumber'),
            Deck.distinct('qrCodeString'),
            Deck.distinct('numberOfAnswerSheets')
        ]);

        // Get unique evaluators separately with aggregation
        const evaluatorAggregation = await Deck.aggregate([
            { $lookup: {
                from: 'users',
                localField: 'evaluator',
                foreignField: '_id',
                as: 'evaluatorData'
            }},
            { $unwind: '$evaluatorData' },
            { $group: {
                _id: '$evaluatorData.emailAddress',
                firstName: { $first: '$evaluatorData.firstName' },
                lastName: { $first: '$evaluatorData.lastName' },
                emailAddress: { $first: '$evaluatorData.emailAddress' }
            }}
        ]);

        // Format the data
        const filterOptions = {
            examDate: examDates.map(date => {
                const formattedDate = new Date(date * 1000).toLocaleDateString();
                return { text: formattedDate, value: formattedDate };
            }),
            programName: programNames.map(name => ({ text: name, value: name })),
            school: schools.map(school => ({ text: school, value: school })),
            evaluator: evaluatorAggregation.map(evaluator => ({
                text: `${evaluator.emailAddress}`,
                value: evaluator.emailAddress
            })),
            statusOfDeck: statusOptions.map(status => ({ text: status, value: status })),
            packetNumber: packetNumbers.map(num => ({ text: num, value: num })),
            roomNumber: roomNumbers.map(num => ({ text: num, value: num })),
            semester: semesters.map(sem => ({ text: sem, value: sem })),
            rackNumber: rackNumbers.map(num => ({ text: num, value: num })),
            qrCodeString: qrCodeStrings.map(qr => ({ text: qr, value: qr })),
            numberOfAnswerSheets: numberOfAnswerSheets.map(num => ({ text: num.toString(), value: num }))
        };

        res.json({
            success: true,
            message: "Filter options fetched successfully",
            data: filterOptions
        });

    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        res.status(400).json({
            error: true,
            message: "An Unexpected Error Occurred",
            errorJSON: err,
            errorString: err.toString()
        })
    }
}
