/*
    server.js
*/

/*
    Node Packages Used
*/
const
    express = require('express'),
    mongoose = require('mongoose'),
    cors = require('cors'),
    dotenv = require('dotenv'),
    cron = require('node-cron'),
    path = require('path'),
    logger = require('./utils/logger'),
    mailer = require('./utils/mailer')

dotenv.config({ path: path.join(__dirname, '..', '.env') })


/*
    Import Routes
*/

const
    authRoutes = require('./routes/auth'),
    userRoutes = require('./routes/user'),
    deckRoutes = require('./routes/deck'),
    smtpRoutes = require('./routes/smtp'),
    emailTemplateRoutes = require('./routes/emailTemplate'),
    analyticsRoutes = require('./routes/analytics')

const { sendReminderToDrop } = require('./controllers/deck')


/*
    Application Configuration Constants 
*/

const PORT = process.env.PORT || 8000 //PORT Number Of Server
const DATABASE = process.env.DATABASE

// Debug: Check if DATABASE is loaded
console.log('DATABASE loaded:', DATABASE ? 'Yes' : 'No')
if (!DATABASE || DATABASE === 'undefined') {
    console.error('DATABASE environment variable is not set properly')
    process.exit(1)
}

const app = express()

app.use(cors({
    origin: process.env.ORIGIN ? process.env.ORIGIN.split(",").map(origin => origin.trim()) : ['http://localhost:5173'], //Split The ORIGIN String into array
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'], // Methods Allowed
    allowedHeaders: ['Content-Type', 'Origin', 'X-Requested-With', 'Accept', 'x-client-key', 'x-client-token', 'x-client-secret', 'Authorization'], //Headers Allowed
    credentials: true, //Are Credentials Required
}))

app.use('/api/v1/static', express.static(path.join(__dirname, '..', 'public', 'static')))

app.use(express.json())

app.get('/ping', (req, res) => res.json({ message: "Pong!" }))

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/user', userRoutes)
app.use('/api/v1/deck', deckRoutes)
app.use('/api/v1/smtp', smtpRoutes)
app.use('/api/v1/emailtemplate', emailTemplateRoutes)
app.use('/api/v1/analytics', analyticsRoutes)



cron.schedule("0 10 * * *", async () => {
    try {
        const reminders = await sendReminderToDrop()
        if (reminders.success)
            logger.info(`Reminders Sent`)

    } catch (err) {
        logger.error(`Error: ${err.message}`)
    }
})


const startServer = async () => {
    try {
        mongoose.connect(DATABASE)
            .then(db => {
                app.listen(PORT, () => {
                    logger.info(`Server Running At PORT: ${PORT}`)
                })
                logger.info(`Database Connected`)
            })
            .catch(err => {
                logger.error(`Error: ${err.message || err.toString()}`)
                process.exit(1)
            })
    } catch (err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        process.exit(1)
    }
}

startServer()

