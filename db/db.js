import { Sequelize } from 'sequelize'
import mysql from 'mysql2/promise'
import { config } from './config.js'

await mysql.createConnection({
  user: config.username,
  password: config.password
}).then(connection => {
  connection.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`)
})

const seq = new Sequelize(config.database, config.username, config.password, {
  dialect: 'mysql',
  host: config.host,
  port: config.port,
})


export { seq }