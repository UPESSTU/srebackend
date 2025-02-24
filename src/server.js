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
    logger = require('./utils/logger')

dotenv.config()


/*
    Import Routes
*/

const 
    authRoutes = require('./routes/auth'),
    userRoutes = require('./routes/user'),
    deckRoutes = require('./routes/deck'),
    schoolRoutes = require('./routes/school')

const { sendReminderToDrop } = require('./controllers/deck')



/*
    Application Configuration Constants 
*/

const PORT = process.env.PORT || 8000 //PORT Number Of Server
const DATABASE = process.env.DATABASE //MongoDB Databse URI

const app = express()

app.use(cors({
    origin: process.env.ORIGIN.split(","), //Split The ORIGIN String into array
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'], // Methods Allowed
    allowedHeaders: ['Content-Type', 'Origin', 'X-Requested-With', 'Accept', 'x-client-key', 'x-client-token', 'x-client-secret', 'Authorization'], //Headers Allowed
    credentials: true, //Are Credentials Required
}))

app.use(express.json())

app.get('/ping', (req, res) => res.json({ message: "Pong!"}))

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/user', userRoutes)
app.use('/api/v1/deck', deckRoutes)
app.use('/api/v1/school', schoolRoutes)

cron.schedule("0 10 * * *", async () => {
    try{
        const reminders = await sendReminderToDrop()
        if(reminders.success) 
            logger.info(`Reminders Sent`)

    }catch(err) {
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
    }catch(err) {
        logger.error(`Error: ${err.message || err.toString()}`)
        process.exit(1)
    }
}

startServer()

